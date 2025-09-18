/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

declare global {
  namespace Vi {
    interface Assertion {
      toBeInTheDocument(): void;
      toHaveAttribute(attr: string, value?: string): void;
    }
  }
}
