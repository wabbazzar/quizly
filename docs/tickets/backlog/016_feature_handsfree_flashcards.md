# Ticket 016: Handsfree Flashcard Mode

## Metadata

- **Status**: Not Started
- **Priority**: High
- **Effort**: 18 points
- **Created**: 2026-04-20
- **Type**: feature
- **Platforms**: Both (PWA - iOS Safari, Android Chrome, Desktop browsers)
- **Depends on**: Ticket 014 (per-card audio files already exist)

## User Stories

### Primary User Story

As a Chinese language learner, I want a hands-free flashcard mode where the app plays a word's audio, I speak the answer back, and the app evaluates my pronunciation so that I can practice while walking, cooking, or otherwise unable to touch my phone.

### Secondary User Stories

- As a learner, I want the app to play a success or failure chime after evaluating my response so I get immediate audio feedback without looking at the screen.
- As a learner, I want the completion screen to accept voice commands ("next round", "missed cards", "done") so the entire session is truly hands-free.
- As a learner, I want to configure which side the app plays (prompt) and which side I speak (answer) using the existing side settings.

## Technical Requirements

### Functional Requirements

1. **Handsfree toggle**: Add `handsfreeMode?: boolean` to `FlashcardsSettings`. Appears as a toggle in the UnifiedSettings modal for flashcards mode.

2. **Start gesture**: A "Start Handsfree" button satisfies the browser's user-gesture requirement for both audio playback and microphone access. All subsequent play/record calls are permitted within this interaction chain.

3. **Per-card loop**:
   - Play audio for the configured front side(s) (e.g. `{deckId}_card{idx}_side_a.mp3`)
   - After audio ends, begin recording user's microphone input
   - On speech end (silence detection ~2s), stop recording
   - Evaluate answer via audio waveform comparison
   - Play success (`match_success`) or failure (`match_failure`) chime via `soundUtils.ts`
   - Mark card correct/incorrect in flashcard session progress
   - Auto-advance to next card after ~2s pause

4. **Evaluation strategy - MediaRecorder + Audio Comparison (single approach, all platforms)**:
   ```
   User speaks -> MediaRecorder -> Blob -> AudioBuffer (Web Audio decodeAudioData)
   Reference -> fetch(back_side.mp3) -> AudioBuffer (Web Audio decodeAudioData)

   Compare:
   1. Normalize volume on both buffers
   2. Extract spectral features (FFT magnitude bins, ~20-40 bands) from both
   3. Compute cosine similarity between feature vectors
   4. Threshold: normalized distance < 70 = pass (calibrated from real voice tests: correct=41-59, wrong=87-93)
   ```
   This uses only `MediaRecorder` + `Web Audio API` - both supported on iOS Safari, Chrome, Firefox, and all modern browsers. No Web Speech API dependency.

5. **Silence detection**: Monitor audio input level via `AnalyserNode` during recording. When RMS drops below threshold for ~1.5s, auto-stop recording. This handles variable-length responses without a fixed timeout.

6. **Completion modal voice commands**: When handsfree is active and the completion modal shows, record a short utterance and compare against pre-recorded command audio files (or use simple energy-based detection for 3 distinct command patterns). Alternatively, use keyword spotting via spectral template matching for "next", "missed", "done".

7. **Stop/exit**: Floating "Stop" button always visible during handsfree mode. Tapping exits handsfree and returns to normal flashcard controls.

8. **Skip**: "Tap to skip" option on each card for accessibility or when stuck.

9. **Session persistence**: `handsfreeMode` boolean persisted in `flashcardSessionStore` so refreshing the page resumes in handsfree mode.

### Non-Functional Requirements

1. **Cross-platform**: Single implementation using MediaRecorder + Web Audio API. Works on iOS Safari 14+, Chrome 90+, Firefox 88+, Edge 90+.
2. **Offline**: Fully client-side audio comparison works offline. No network needed.
3. **Performance**: Audio decoding and FFT comparison must complete in <500ms per card. Pre-decode the next card's reference audio while current card is active.
4. **Mic + speaker isolation**: State machine ensures audio playback finishes before microphone opens to prevent feedback loop.
5. **Battery**: Stop microphone and audio context when user exits handsfree mode or app goes to background.
6. **Error resilience**: If microphone permission denied, show clear message and disable handsfree. If audio file missing for a card, skip that card with a brief notification.

## Evaluation Strategy Detail

### Audio Waveform Comparison (All Platforms)

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│ User speaks │────>│ MediaRecorder │────>│ AudioBuffer   │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │ Normalize vol │
                                          │ Extract FFT   │
                                          │ Feature vector│
                                          └───────┬───────┘
                                                  │
┌─────────────┐     ┌──────────────┐     ┌───────▼───────┐
│ Reference   │────>│ decodeAudio  │────>│ Feature vector│
│ MP3 file    │     │ Data()       │     └───────┬───────┘
└─────────────┘     └──────────────┘             │
                                          ┌──────▼───────┐
                                          │ Cosine       │
                                          │ Similarity   │
                                          └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │ > threshold? │
                                          │ PASS / FAIL  │
                                          └──────────────┘
```

**Feature extraction approach:**
1. Decode audio to mono PCM float32 array
2. Apply windowed FFT (Hann window, 2048 samples, 50% overlap)
3. Average magnitude across all frames into N frequency bands (mel-scale or linear)
4. Resulting feature vector: Float32Array of N values (N = 20-40)
5. Cosine similarity between user and reference feature vectors

**Silence detection:**
- During recording, run `AnalyserNode.getByteTimeDomainData()` on a timer (every 100ms)
- Compute RMS of the signal
- If RMS < threshold for 1.5 consecutive seconds, stop recording
- Maximum recording duration: 8 seconds (safety cap)

**Threshold tuning:**
- Start at 0.65 (generous for noisy environments)
- Log similarity scores during testing to calibrate
- Consider per-deck or per-card-length thresholds later

## Implementation Plan

### Phase 1: Audio Comparison Utilities (5 points)

**New file: `src/utils/audioComparisonUtils.ts`**

- `decodeToMono(buffer: ArrayBuffer, audioContext: AudioContext): Promise<Float32Array>` - Decode any audio format to mono PCM
- `extractSpectralFeatures(samples: Float32Array, sampleRate: number, bands?: number): Float32Array` - Windowed FFT, averaged into N bands
- `cosineSimilarity(a: Float32Array, b: Float32Array): number` - Standard cosine sim
- `normalizeVolume(samples: Float32Array): Float32Array` - Peak normalization to [-1, 1]
- `computeRMS(samples: Float32Array): number` - For silence detection

### Phase 2: Audio Recording Hook (4 points)

**New file: `src/hooks/useAudioRecorder.ts`**

- Manages `MediaRecorder` lifecycle
- Silence detection via `AnalyserNode` (auto-stop on 1.5s silence)
- Maximum recording cap (8s)
- Returns: `{ isRecording, audioBlob, start, stop, isSupported, error }`
- Handles mic permission request and denial gracefully
- Cleanup on unmount (release MediaStream tracks)

### Phase 3: Audio Comparison Hook (3 points)

**New file: `src/hooks/useAudioComparison.ts`**

- Takes user's recorded `Blob` + reference audio URL
- Decodes both to `AudioBuffer` via shared `AudioContext`
- Extracts features and computes similarity
- Returns: `{ similarity: number, isMatch: boolean, isComparing: boolean }`
- Caches decoded reference buffers (they don't change between attempts)

### Phase 4: Handsfree Orchestration Hook (3 points)

**New file: `src/hooks/useHandsfreeMode.ts`**

State machine: `idle` -> `playing_prompt` -> `listening` -> `evaluating` -> `showing_result` -> (next card)

- Plays prompt audio via `HTMLAudioElement`
- On audio `ended`: starts recording via `useAudioRecorder`
- On recording complete: compares via `useAudioComparison`
- On result: plays chime, triggers correct/incorrect callback
- Auto-advances after 2s result display
- Resets when card changes
- Exposes: `{ state, similarity, isCorrect, skip }`

### Phase 5: Settings Integration (2 points)

**Modify: `src/types/index.ts`** - Add `handsfreeMode?: boolean` to `FlashcardsSettings`

**New file: `src/components/modals/settings/HandsfreeSettings.tsx`**
- Toggle switch for handsfree mode
- Microphone permission status indicator
- Brief description of the feature

**Modify: `src/components/modals/UnifiedSettings.tsx`** - Add section at order 6

**Modify: `src/store/settingsStore.ts`** - Default `handsfreeMode: false`

### Phase 6: Flashcards Page Integration (2 points)

**Modify: `src/pages/Flashcards.tsx`**

- Read `handsfreeMode` from settings
- When active: hide swipe/button controls, disable keyboard shortcuts
- Render `HandsfreeOverlay`
- Wire callbacks to existing `markCard` flow
- "Start Handsfree" button (user gesture gate)
- Floating "Stop" button

**Modify: `src/store/flashcardSessionStore.ts`** - Add `handsfreeMode` to session interface

### Phase 7: Handsfree Overlay UI (2 points)

**New file: `src/components/handsfree/HandsfreeOverlay.tsx`**
**New file: `src/components/handsfree/HandsfreeOverlay.module.css`**

- Visual state indicator (playing/listening/result)
- Pulsing microphone animation during listening
- Audio level visualization (real-time during recording)
- Success/fail result icon with similarity score
- "Tap to skip" button

### Phase 8: Completion Modal Voice Commands (2 points)

**Modify: `src/components/modals/FlashcardsCompletionModal.tsx`**

- When `handsfreeMode` active: record short utterance
- Compare against 3 reference command patterns (record templates on first use, or use energy/duration heuristics)
- Simplest approach: 3 buttons with "Say: next round / missed cards / done" labels, detect any speech and match by simple spectral template
- Buttons still work via tap as fallback

## Key Files

### To Modify
- `src/types/index.ts`
- `src/pages/Flashcards.tsx`
- `src/components/modals/UnifiedSettings.tsx`
- `src/components/modals/FlashcardsCompletionModal.tsx`
- `src/store/settingsStore.ts`
- `src/store/flashcardSessionStore.ts`

### To Create
- `src/utils/audioComparisonUtils.ts`
- `src/hooks/useAudioRecorder.ts`
- `src/hooks/useAudioComparison.ts`
- `src/hooks/useHandsfreeMode.ts`
- `src/components/modals/settings/HandsfreeSettings.tsx`
- `src/components/handsfree/HandsfreeOverlay.tsx`
- `src/components/handsfree/HandsfreeOverlay.module.css`

## Testing Plan

1. **Unit tests**: `audioComparisonUtils` - test FFT extraction, cosine similarity, normalization with synthetic signals
2. **Hook tests**: `useAudioRecorder` with mocked MediaRecorder, `useAudioComparison` with mocked AudioContext
3. **Integration test**: `useHandsfreeMode` state machine transitions
4. **Manual testing**:
   - Chrome desktop: full loop end-to-end
   - iOS Safari PWA: same full loop
   - Android Chrome PWA: same full loop
   - Deny mic permission: verify graceful degradation
   - Missing audio file: verify card is skipped
   - Noisy environment: verify threshold behavior
   - Completion modal: verify voice command detection
5. **`npm run type-check`** passes
6. **`npm run lint`** passes
7. **`npm run build`** succeeds

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Audio comparison accuracy too low for tonal Chinese | Calibrated threshold=70 (normalized DTW distance). Real voice tests: correct=41-59, wrong=87-93. Clear 28-point margins. |
| iOS MediaRecorder encodes as mp4/aac, reference is mp3 | Both decoded to raw PCM via `decodeAudioData` - format differences normalized away at decode time. |
| Background noise causes false matches/misses | Normalize volume before comparison. Silence detection filters out ambient noise before comparison starts. |
| Short words (1-2 syllables) have fewer spectral features | Use more frequency bands for short recordings. Consider time-domain correlation as supplemental signal. |
| Battery drain from continuous mic usage | Release mic stream between cards. Suspend AudioContext when in `showing_result` or `playing_prompt` states. |
| MediaRecorder not supported on very old browsers | Feature detection on mount. Disable toggle with "Browser not supported" message. Minimum browser versions already above MediaRecorder support threshold. |

## Open Questions

- Should there be a "practice mode" variant where incorrect cards auto-replay the correct audio before advancing? (Deferred to future ticket)
- Should the similarity threshold be user-configurable? (Start with fixed value, expose later if needed)
- For completion modal commands: is spectral template matching for 3 English words feasible client-side, or should we just use a simpler "any speech detected = confirm current highlighted option" with auto-cycling? (Decide during implementation)
