# Read Mode Settings Test Checklist

## Settings Modal Tests

### 1. Answer Type
- [ ] Free Text mode works
- [ ] Multiple Choice mode works
- [ ] Switching between modes works

### 2. Check Mode
- [ ] Live (check as you type) works
- [ ] Wait (check on submit) works

### 3. Translation Mode
- [ ] Full Sentence (Recommended) mode works
- [ ] Word/Character by Word mode works
- [ ] Switching between modes updates UI correctly

### 4. Translation Direction
- [ ] Can select Characters → English
- [ ] Can select Characters → Pinyin
- [ ] Can select English → Characters
- [ ] Can select English → Pinyin
- [ ] Can select Pinyin → Characters
- [ ] Can select Pinyin → English
- [ ] Cannot select same side for both from and to

### 5. Multiple Choice Settings (when MC selected)
- [ ] Number of Options slider works (2-8)
- [ ] Easy difficulty (same line) works
- [ ] Medium difficulty (same dialogue) works
- [ ] Hard difficulty (any dialogue) works

### 6. Sentence Mode Settings (when sentence mode selected)
- [ ] Accuracy Threshold slider works (50-100%)
- [ ] Show Word Hints on Hover/Tap toggle works
- [ ] Hints appear when enabled
- [ ] Hints don't appear when disabled

### 7. Display Settings
- [ ] Show Pinyin by Default toggle works
- [ ] Token Unit (Character vs Word) works in token mode

## UI/UX Tests

### 8. Dialogue Picker
- [ ] Shows all dialogues without excessive scrolling
- [ ] Progress bars display correctly
- [ ] Selection highlighting works
- [ ] Complete icon shows for finished dialogues

### 9. Sentence Translation UI
- [ ] Chinese sentence displays clearly
- [ ] Input field for English translation works
- [ ] Submit button works
- [ ] Feedback shows accuracy percentage
- [ ] Correct answers show in green
- [ ] Incorrect answers show correct answer
- [ ] Partial credit displays properly

### 10. Word Hints (when enabled)
- [ ] Hovering Chinese words shows English tooltip
- [ ] Tapping Chinese words on mobile shows tooltip
- [ ] Tooltips position correctly on screen
- [ ] Pinyin shows in tooltips when available

### 11. Navigation
- [ ] Previous Sentence button works
- [ ] Next Sentence button works
- [ ] Buttons disable at boundaries
- [ ] Keyboard shortcuts work (arrow keys, j/k)

### 12. Unicode/Font Display
- [ ] Chinese characters render correctly
- [ ] No missing character boxes
- [ ] Punctuation displays properly
- [ ] Mixed scripts (Chinese/English) align well

## Integration Tests

### 13. wordAlignments Data
- [ ] Lines with wordAlignments show hints correctly
- [ ] Lines without wordAlignments fall back gracefully
- [ ] Answer checking uses alignment data when available

### 14. Progress Tracking
- [ ] Correct/incorrect counts update
- [ ] Progress saves between sessions
- [ ] Line progress tracked correctly

### 15. Settings Persistence
- [ ] Settings save when changed
- [ ] Settings restore on page reload
- [ ] Settings apply immediately when changed

## Edge Cases

### 16. Error Handling
- [ ] Empty dialogues handled gracefully
- [ ] Missing translations handled
- [ ] Malformed data doesn't crash app
- [ ] Network errors show appropriate messages

### 17. Mobile Responsiveness
- [ ] All UI elements accessible on small screens
- [ ] Touch targets are adequate size (44px+)
- [ ] No horizontal overflow
- [ ] Virtual keyboard doesn't obscure content

## Performance

### 18. Loading & Transitions
- [ ] Deck loads quickly
- [ ] Settings modal opens smoothly
- [ ] Line transitions are instant
- [ ] No lag when typing answers

## Accessibility

### 19. Keyboard Navigation
- [ ] Tab order logical
- [ ] All controls keyboard accessible
- [ ] Escape closes modals
- [ ] Enter submits forms

### 20. Screen Reader Support
- [ ] ARIA labels present
- [ ] Role attributes correct
- [ ] Focus management proper
- [ ] Announcements for state changes