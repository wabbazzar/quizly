import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  routerProps?: {
    initialIndex?: number;
    future?: any;
  };
}

function AllTheProviders({
  children,
  initialEntries = ['/'],
  routerProps,
}: {
  children: React.ReactNode;
  initialEntries?: string[];
  routerProps?: CustomRenderOptions['routerProps'];
}) {
  return (
    <MemoryRouter initialEntries={initialEntries} {...routerProps}>
      {children}
    </MemoryRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'], routerProps, ...renderOptions }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders initialEntries={initialEntries} routerProps={routerProps}>
      {children}
    </AllTheProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };

// Custom queries and utilities
export const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-testid: ${testId}`);
  }
  return element;
};

export const queryByTestId = (container: HTMLElement, testId: string) => {
  return container.querySelector(`[data-testid="${testId}"]`);
};

// Wait utilities
export const waitForElement = async (container: HTMLElement, selector: string, timeout = 1000) => {
  return new Promise<Element>((resolve, reject) => {
    const element = container.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = container.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
};

// Mock user interactions
export const createMockEvent = (type: string, eventProps: any = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, eventProps);
  return event;
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Accessibility testing utilities
export const checkAriaAttributes = (
  element: Element,
  expectedAttributes: Record<string, string>
) => {
  const results: { attribute: string; expected: string; actual: string | null; passed: boolean }[] =
    [];

  Object.entries(expectedAttributes).forEach(([attribute, expected]) => {
    const actual = element.getAttribute(attribute);
    results.push({
      attribute,
      expected,
      actual,
      passed: actual === expected,
    });
  });

  return results;
};

// Mock data validation utilities
export const validateMockData = <T extends Record<string, any>>(
  data: T,
  schema: Record<string, string>
): boolean => {
  for (const [key, expectedType] of Object.entries(schema)) {
    const value = data[key];
    const actualType = typeof value;

    if (actualType !== expectedType) {
      console.error(
        `Invalid mock data: ${String(key)} expected ${expectedType}, got ${actualType}`
      );
      return false;
    }
  }
  return true;
};
