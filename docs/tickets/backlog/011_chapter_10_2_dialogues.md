# Ticket 011: Add Chapter 10 Part 2 Dialogues

## Metadata

- **Status**: Not Started
- **Priority**: Medium
- **Effort**: 3 points
- **Created**: 2025-11-12
- **Type**: feature
- **Platforms**: Web
- **Assignee**: TBD

## User Stories

### Primary User Story

As a Chinese language learner, I want to practice reading dialogues in Chapter 10 Part 2 so that I can improve my conversational skills and understand real-life communication patterns.

### Secondary User Stories

- As a student, I want to see dialogues with pinyin and English translations so that I can learn pronunciation and meaning simultaneously.
- As a teacher, I want dialogues that follow the chapter's vocabulary theme so that students can reinforce recently learned words in context.

## Technical Requirements

### Functional Requirements

1. Add two new dialogues to the `chinese_chpt10_2.json` deck's reading section
2. Dialogues must include character-by-character tokenization for side_a (Chinese characters)
3. Dialogues must include word-level alignments between Chinese, pinyin, and English
4. Dialogues must be accessible through the Read mode interface
5. Dialogues must follow the existing deck structure with proper side mappings

### Non-Functional Requirements

1. Performance: Dialogues must load within 2 seconds on standard devices
2. Accessibility: Support for screen readers and keyboard navigation
3. Platform Parity: Consistent behavior across all supported browsers
4. Bundle Size: Addition must not increase bundle size by more than 5KB

## Implementation Plan

### Phase 1: Add Dialogues to Deck JSON (2 points)

**Files to create/modify:**

- `public/data/decks/chinese_chpt10_2.json` - Add reading section with dialogues

**Component Structure:**

```typescript
interface DeckReading {
  sides?: ReadingSidesMap;
  tokenization?: ReadingTokenizationConfig;
  dialogues: Record<string, DeckReadingDialogue>;
}

interface DeckReadingDialogue {
  lines: ReadingLine[];
}

interface ReadingLine {
  a?: string; // Chinese characters
  b?: string; // Pinyin
  c?: string; // English
  wordAlignments?: WordAlignment[];
}
```

**State Management:**

```typescript
// Update deck metadata to include reading capability
interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
  reading?: DeckReading; // Add this optional field
}
```

**Navigation Updates:**

No navigation changes required - dialogues will be accessible through existing Read mode.

**Implementation steps:**

1. Add reading section to `chinese_chpt10_2.json` with proper tokenization config
2. Create dialogue_001 with the Chinese class preparation conversation
3. Create dialogue_002 with the audio listening conversation
4. Include word-level alignments for each line
5. Update deck metadata last_updated timestamp

**Code Implementation:**

1. Run:
   `claude --agent code-writer "Add reading dialogues to chinese_chpt10_2.json following ticket #011 specifications"`
2. Run:
   `claude --agent code-quality-assessor "Review the deck JSON changes for consistency"`
3. Apply code quality improvements

**Testing:**

1. Run: `claude --agent test-writer "Write tests for chinese_chpt10_2.json reading dialogues"`
2. Run: `claude --agent test-critic "Review tests for dialogue loading and parsing"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**

```bash
# Test dialogue loading in Read mode
npm run dev
# Navigate to Chinese Chapter 10 Part 2 deck
# Verify dialogues appear in Read mode
# Test on Chrome, Firefox, Safari
```

**Commit**: `feat: add chapter 10 part 2 reading dialogues`

### Phase 2: Verify Integration (1 point)

**Files to create/modify:**

- Manual verification of Read mode integration

**Implementation steps:**

1. Test that dialogues load correctly in Read mode
2. Verify tokenization works for character-by-character reading
3. Confirm word alignments display properly
4. Test navigation between dialogue lines

**Testing:**

1. Manual testing: Load deck in Read mode and verify dialogues
2. Cross-browser testing: Chrome, Firefox, Safari
3. Performance testing: Verify load times under 2 seconds

**Commit**: `test: verify chapter 10 part 2 dialogues integration`

## Testing Strategy

### Unit Tests

- Test file: `__tests__/decks/chinese_chpt10_2.test.ts`
- Key scenarios: Dialogue loading, tokenization parsing, word alignments
- Mock requirements: None (static JSON testing)

### Component Tests

```typescript
describe('Chinese Chapter 10 Part 2 Dialogues', () => {
  it('should load dialogues from deck JSON', () => {
    // Test dialogue parsing and structure
  });

  it('should display word alignments correctly', () => {
    // Test alignment rendering in Read mode
  });

  it('should handle character tokenization', () => {
    // Test character-by-character reading
  });
});
```

### Integration Tests

- Dialogue loading in Read mode
- Navigation between dialogue lines
- Tokenization and alignment display
- Performance: Load time verification

### E2E Tests (Playwright)

```typescript
describe('Chapter 10 Part 2 Dialogues E2E', () => {
  it('should display dialogues in Read mode', async () => {
    // Navigate to deck and verify dialogues load
  });
});
```

### Performance Tests

- Bundle size impact: Verify <5KB increase
- Load time: <2 seconds for dialogue loading
- Memory usage: Monitor during dialogue navigation

## Platform-Specific Considerations

### Browser Support

- Modern browsers with ES2020 support
- Progressive enhancement for older browsers
- Fallback for browsers without advanced features

## Documentation Updates Required

1. `docs/spec.md` - Update deck format specification if needed
2. `public/data/drafts/chinese_chpt10.md` - Add dialogue content reference
3. In-code documentation: Update deck loading comments

## Success Criteria

1. Dialogues load correctly in Read mode within 2 seconds
2. Character tokenization works for Chinese text
3. Word alignments display properly between all three sides
4. No bundle size increase over 5KB
5. Cross-browser compatibility maintained

## Dependencies

- None - this is an additive feature to existing deck structure

## Risks & Mitigations

1. **Risk**: Bundle size increase **Mitigation**: Keep dialogues concise and optimize JSON structure
2. **Risk**: Tokenization complexity **Mitigation**: Follow existing patterns from other decks
3. **Risk**: Performance impact **Mitigation**: Lazy load dialogues and optimize parsing

## Accessibility Requirements

- Screen reader support for dialogue text
- Keyboard navigation for dialogue controls
- High contrast support for text display
- Minimum touch target sizes (44x44px where applicable)

## Release & Deployment Guide

### Build Configuration

- No build configuration changes required
- Deck JSON is served statically

### Testing Checklist

- [ ] Dialogues load in Read mode
- [ ] Character tokenization works
- [ ] Word alignments display correctly
- [ ] Performance under 2 seconds
- [ ] Bundle size increase <5KB
- [ ] Cross-browser testing complete

### Release Process

1. Merge feature branch to main
2. Run full test suite
3. Deploy to staging for verification
4. Production deployment

### Rollback Strategy

- Revert JSON changes if issues found
- Feature flag could be added if needed for complex issues

## Mobile-Specific Implementation Details

This is a web application, but the dialogues should work well on mobile devices:

### Responsive Design

- Dialogues adapt to mobile screen sizes
- Touch-friendly navigation controls
- Optimized text sizing for mobile reading

### Performance Optimizations

- Lazy load dialogue content
- Optimize JSON parsing for mobile devices
- Minimize memory usage during dialogue navigation

### Error Handling

```typescript
// Graceful fallback if dialogue fails to load
const handleDialogueError = (error: Error) => {
  console.error('Failed to load dialogue:', error);
  // Show user-friendly error message
};
```

## Dialogue Content

### Dialogue 1: Chinese Class Preparation

**Lines:**
1. A: "You speak Chinese so well. Normally, how do you prepare for your Chinese class?"
   B: "I listen to the audio every morning."

**Word Alignments:**
- Chinese: 你说中文说得真好。平常怎么准备上你的中文课?
- Pinyin: Nǐ shuō zhōngwén shuō dé zhēn hǎo. Píngcháng zěnme zhǔnbèi shàng nǐ de zhōngwén kè?
- English: You speak Chinese so well. Normally, how do you prepare for your Chinese class?

- Chinese: 我每天早上都听录音。
- Pinyin: Wǒ měitiān zǎoshang dōu tīng lùyīn.
- English: I listen to the audio every morning.
