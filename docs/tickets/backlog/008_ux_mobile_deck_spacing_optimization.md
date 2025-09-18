# Ticket 008: Mobile Deck Page Spacing and Layout Optimization

## Metadata

- **Status**: Not Started
- **Priority**: High
- **Effort**: 8 points
- **Created**: 2025-09-18
- **Type**: ux
- **Platforms**: Mobile-first with responsive enhancement

## User Stories

### Primary User Story

As a mobile user browsing deck pages, I want properly spaced interface elements
so that I can easily navigate learning modes without feeling cramped.

### Secondary User Stories

- As a mobile user, I want sufficient spacing between the header and mode
  selection so that visual hierarchy is clear
- As a mobile user, I want the "Choose Your Learning Mode" title to be hidden on
  small screens to preserve valuable screen real estate
- As a mobile user, I want mode cards with better padding and touch targets so
  that interaction feels comfortable
- As a mobile user, I want consistent vertical rhythm throughout the deck page
  so that the interface feels polished

## Technical Requirements

### Functional Requirements

1. **Header Spacing Enhancement**: Increase bottom margin from PageHeader
   component on mobile from 12px to 24px
2. **Mode Section Title Optimization**: Hide "Choose Your Learning Mode" text on
   screens ≤640px while preserving semantic structure
3. **Mode Card Padding Improvements**: Increase mode card padding from 12px to
   16px and grid gaps from 8px to 12px
4. **Touch Target Optimization**: Ensure minimum 44px touch targets on all
   interactive elements
5. **Vertical Rhythm Consistency**: Implement consistent spacing patterns
   following 4px/8px grid system

### Non-Functional Requirements

1. Performance: All CSS changes must not impact rendering performance (maintain
   60 FPS)
2. Accessibility: Maintain semantic HTML structure even when hiding visual
   elements
3. Platform Parity: Changes should enhance mobile without degrading
   tablet/desktop experience

## Implementation Plan

### Phase 1: PageHeader Component Spacing Enhancement (2 points)

**Files to create/modify:**

- `src/components/common/PageHeader/PageHeader.module.css` - Update mobile
  responsive spacing

**CSS Implementation:**

```css
/* Mobile Responsive - Enhanced bottom spacing */
@media (max-width: 768px) {
  .header {
    margin-bottom: var(--space-6); /* Increased from var(--space-3) */
  }
}
```

**Implementation steps:**

1. Modify PageHeader.module.css mobile breakpoint to increase margin-bottom
2. Ensure spacing uses CSS custom properties for theme consistency
3. Test header spacing on iPhone SE (375px) and standard mobile viewport (414px)

**Code Implementation:**

1. Run:
   `claude --agent code-writer "Implement enhanced PageHeader mobile spacing following ticket #008 Phase 1 specifications"`
2. Run:
   `claude --agent code-quality-assessor "Review PageHeader spacing changes for mobile responsiveness"`
3. Apply code quality improvements

**Testing:**

1. Run:
   `claude --agent test-writer "Write visual regression tests for PageHeader spacing"`
2. Test on mobile viewports: 375px, 414px, 640px
3. Verify spacing doesn't break on tablet (768px+)

**Platform Testing:**

```bash
# Mobile viewport testing
npm run dev # Port 5173
# Test /deck/chinese_chpt1 on mobile viewports
# Verify header spacing feels more breathing room
```

**Commit**:
`feat(ux): enhance PageHeader mobile spacing for better visual hierarchy`

### Phase 2: ModeSelector Title Optimization (2 points)

**Files to create/modify:**

- `src/components/deck/ModeSelector.module.css` - Add responsive title hiding

**CSS Implementation:**

```css
/* Mobile responsive styles - Hide section title on small screens */
@media (max-width: 640px) {
  .sectionTitle {
    position: absolute;
    left: -9999px;
    top: -9999px;
    /* Maintain accessibility for screen readers */
    clip: rect(0, 0, 0, 0);
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .modesSection {
    margin-bottom: var(--space-6); /* Maintain consistent spacing */
  }
}
```

**Implementation steps:**

1. Use accessibility-friendly hiding technique (screen reader compatible)
2. Maintain semantic HTML structure for assistive technologies
3. Preserve vertical spacing when title is hidden
4. Test with VoiceOver/TalkBack to ensure title remains discoverable

**Code Implementation:**

1. Run:
   `claude --agent code-writer "Implement responsive ModeSelector title hiding following ticket #008 Phase 2 specifications"`
2. Run:
   `claude --agent code-quality-assessor "Review ModeSelector accessibility and responsive behavior"`
3. Apply accessibility improvements

**Testing:**

1. Run:
   `claude --agent test-writer "Write accessibility tests for ModeSelector title hiding"`
2. Test screen reader compatibility on iOS VoiceOver and Android TalkBack
3. Verify title disappears on mobile but remains accessible

**Platform Testing:**

```bash
# Accessibility testing
npm run dev
# Test with screen reader tools
# Verify title hidden visually but accessible programmatically
```

**Commit**:
`feat(ux): hide ModeSelector title on mobile while maintaining accessibility`

### Phase 3: Mode Card Padding and Grid Enhancement (2 points)

**Files to create/modify:**

- `src/components/deck/ModeSelector.module.css` - Enhance mode card spacing

**CSS Implementation:**

```css
/* Enhanced mobile mode card spacing */
@media (max-width: 640px) {
  .modesGrid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3); /* Increased from var(--space-2) */
    padding: 0 var(--space-2); /* Add container padding */
  }

  .modeCard {
    padding: var(--space-4); /* Increased from var(--space-3) */
    min-height: 120px; /* Ensure sufficient touch target */
    border-radius: var(--radius-lg); /* Consistent with design system */
  }

  .modeIconWrapper {
    width: 48px;
    height: 48px;
    margin-bottom: var(--space-3); /* Improved icon spacing */
  }
}
```

**Implementation steps:**

1. Increase grid gap from 8px to 12px for better visual separation
2. Enhance mode card padding from 12px to 16px for more comfortable touch
   targets
3. Ensure minimum 44px touch target compliance (cards are larger than minimum)
4. Add container padding to prevent edge-to-edge layout issues

**Code Implementation:**

1. Run:
   `claude --agent code-writer "Implement enhanced mode card spacing following ticket #008 Phase 3 specifications"`
2. Run:
   `claude --agent code-quality-assessor "Review mode card touch targets and spacing"`
3. Apply mobile UX improvements

**Testing:**

1. Run: `claude --agent test-writer "Write touch target tests for mode cards"`
2. Test tap interaction comfort on actual mobile devices
3. Verify grid layout works on various screen sizes

**Platform Testing:**

```bash
# Touch target testing
npm run dev
# Test on iPhone 14 Pro and Samsung Galaxy S23
# Verify comfortable tap interactions
```

**Commit**: `feat(ux): enhance mode card spacing and touch targets for mobile`

### Phase 4: Deck Page Container Consistency (2 points)

**Files to create/modify:**

- `src/pages/Deck.module.css` - Enhance overall page spacing consistency

**CSS Implementation:**

```css
/* Enhanced deck page mobile spacing */
@media (max-width: 768px) {
  .deckPage {
    padding: 0; /* Remove any container padding that might cause issues */
    max-width: 100vw;
    overflow-x: hidden;
  }

  /* Ensure consistent section spacing */
  .modesSection {
    padding: 0 var(--space-4); /* Consistent horizontal padding */
    margin-bottom: var(--space-8); /* Generous bottom spacing */
  }

  .cardsSection {
    margin-top: var(--space-6); /* Consistent top spacing */
    padding: var(--space-6) var(--space-4); /* Reduced from var(--space-8) */
  }
}

/* Tablet responsiveness */
@media (min-width: 769px) and (max-width: 1024px) {
  .modesSection {
    padding: 0 var(--space-6);
  }
}
```

**Implementation steps:**

1. Establish consistent horizontal padding across all deck page sections
2. Implement vertical rhythm using 4px/8px grid system
3. Ensure no horizontal overflow on any mobile viewport
4. Create smooth transition between mobile and tablet layouts

**Code Implementation:**

1. Run:
   `claude --agent code-writer "Implement consistent deck page spacing following ticket #008 Phase 4 specifications"`
2. Run:
   `claude --agent code-quality-assessor "Review deck page layout consistency"`
3. Apply final spacing refinements

**Testing:**

1. Run:
   `claude --agent test-writer "Write layout consistency tests for deck page"`
2. Test complete user journey on mobile: navigation → deck → mode selection
3. Verify no horizontal scroll on any viewport size

**Platform Testing:**

```bash
# Complete mobile experience testing
npm run dev
# Test full deck browsing experience
# Verify visual hierarchy and spacing consistency
```

**Commit**: `feat(ux): establish consistent deck page spacing and layout system`

## Testing Strategy

### Unit Tests

- Test file: `__tests__/components/deck/ModeSelector.test.tsx`
- Key scenarios: Title visibility at different breakpoints, mode card
  interactions
- Mock requirements: ResizeObserver, media query mocking

### Component Tests

```typescript
describe('ModeSelector Mobile UX', () => {
  it('should hide section title on mobile while maintaining accessibility', () => {
    render(<ModeSelector modes={mockModes} onModeClick={jest.fn()} />);
    const title = screen.getByText('Choose Your Learning Mode');

    // Should be accessible to screen readers but visually hidden
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('sectionTitle');
  });

  it('should provide adequate touch targets on mobile', () => {
    render(<ModeSelector modes={mockModes} onModeClick={jest.fn()} />);
    const modeCards = screen.getAllByRole('button');

    modeCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
    });
  });
});
```

### Integration Tests

- User flows: Deck navigation → mode selection → back navigation
- Navigation testing: Touch interaction comfort and accuracy
- Layout testing: No horizontal overflow on mobile viewports

### E2E Tests (Playwright)

```typescript
describe('Deck Page Mobile Spacing', () => {
  it('should provide comfortable mobile browsing experience', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/deck/chinese_chpt1');

    // Verify header spacing
    const header = page.locator('[data-testid="page-header"]');
    const modes = page.locator('[data-testid="modes-section"]');
    const spacing = await page.evaluate(() => {
      const headerRect = document
        .querySelector('[data-testid="page-header"]')
        .getBoundingClientRect();
      const modesRect = document
        .querySelector('[data-testid="modes-section"]')
        .getBoundingClientRect();
      return modesRect.top - headerRect.bottom;
    });

    expect(spacing).toBeGreaterThanOrEqual(20); // Minimum comfortable spacing
  });
});
```

### Performance Tests

- Layout shift measurement: CLS should remain <0.1 with spacing changes
- Touch response time: Mode card tap response <100ms
- Viewport transition smoothness: No janky animations during responsive
  breakpoints

## Platform-Specific Considerations

### iOS

- Safe area handling for iPhone models with notches
- Respect iOS scroll bounce behavior
- VoiceOver compatibility for hidden elements

### Android

- Material Design spacing guidelines compliance
- TalkBack screen reader support
- Back gesture integration

## Documentation Updates Required

1. `docs/CLAUDE.md` - Update mobile responsive design patterns section
2. `src/components/deck/README.md` - Document spacing improvements
3. In-code documentation: Add JSDoc comments for responsive behavior

## Success Criteria

1. **Measurable Spacing**: Header-to-content spacing increases from 12px to 24px
   on mobile
2. **Screen Real Estate**: "Choose Your Learning Mode" title hidden on ≤640px
   viewports
3. **Touch Comfort**: Mode cards have 16px padding (up from 12px) and 12px grid
   gaps
4. **Accessibility Compliance**: All changes maintain WCAG AA standards
5. **Performance Maintained**: No decrease in Lighthouse mobile score

## Dependencies

- CSS custom properties system (existing)
- Mobile-first responsive design patterns (existing)
- Theme system compatibility (existing)

## Risks & Mitigations

1. **Risk**: Breaking tablet layout during mobile optimization **Mitigation**:
   Use mobile-first media queries with specific breakpoint targeting
2. **Risk**: Accessibility regression when hiding elements **Mitigation**: Use
   proper screen reader compatible hiding techniques
3. **Risk**: Inconsistent spacing across components **Mitigation**: Leverage
   existing CSS custom properties for consistent spacing values

## Accessibility Requirements

- Screen reader support for hidden but semantically important content
- Minimum touch target size compliance (44x44px minimum)
- Maintained semantic HTML structure
- High contrast compatibility with spacing changes

## Release & Deployment Guide

### Build Configuration

- No environment variable changes required
- CSS-only modifications, no build pipeline changes
- Feature flags not applicable for styling changes

### Testing Checklist

- [ ] Visual regression tests passing on mobile viewports
- [ ] Touch target accessibility tests passing
- [ ] Screen reader compatibility verified
- [ ] No horizontal overflow on any mobile viewport (320px to 768px)
- [ ] Smooth responsive breakpoint transitions
- [ ] Lighthouse mobile score maintained (>90)

### Release Process

1. Create feature branch: `feature/mobile-deck-spacing`
2. Implement changes in phases
3. Run comprehensive mobile testing
4. Visual QA on iPhone SE, iPhone 14 Pro, Samsung Galaxy S23
5. Accessibility audit with screen readers
6. Performance validation with Lighthouse
7. Merge to main after approval

### Rollback Strategy

- CSS-only changes enable quick rollback via Git revert
- No database or API changes involved
- Previous spacing values documented in Git history

## Mobile-Specific Implementation Details

### Responsive Breakpoint Strategy

```css
/* Mobile-first approach with specific targeting */
@media (max-width: 640px) {
  /* Small mobile optimizations */
}

@media (min-width: 641px) and (max-width: 768px) {
  /* Large mobile/small tablet */
}

@media (min-width: 769px) {
  /* Tablet and desktop */
}
```

### Touch Target Guidelines

- Minimum 44x44px for iOS compliance
- Comfortable 48x48px for Android Material Design
- Mode cards exceed minimum with enhanced padding
- Sufficient spacing between interactive elements

### Visual Hierarchy Enhancement

```css
/* Spacing rhythm using design system tokens */
--space-2: 8px; /* Small gaps */
--space-3: 12px; /* Medium gaps */
--space-4: 16px; /* Large gaps */
--space-6: 24px; /* Section spacing */
--space-8: 32px; /* Major section spacing */
```

### Screen Reader Compatibility

```css
/* Accessible hiding technique */
.visuallyHidden {
  position: absolute;
  left: -9999px;
  top: -9999px;
  clip: rect(0, 0, 0, 0);
  width: 1px;
  height: 1px;
  overflow: hidden;
}
```

## Performance Optimizations

- Use CSS transforms for animations to utilize hardware acceleration
- Leverage CSS custom properties for consistent theming
- Minimize layout recalculations by using margin/padding over positioning
- Ensure smooth 60 FPS transitions during responsive breakpoint changes

## Browser Support

- Safari 14+ (iOS 14+)
- Chrome 90+ (Android 10+)
- Firefox Mobile 88+
- Samsung Internet 14+

---

_This ticket focuses specifically on mobile user experience improvements through
better spacing and layout optimization, ensuring comfortable and accessible deck
browsing on mobile devices._
