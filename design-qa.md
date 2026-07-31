# AI English Learning — Design QA

## Scope

The implementation was checked against all eight supplied UI references:

- Mobile: Home, Word, Chat, Profile
- Desktop: Home, Word, Chat, Settings

Device frames, operating-system status bars, monitor bezels, and home indicators in the source images were excluded from the implementation. The comparison crops therefore focus on app-owned content.

## Test viewports

- Mobile: 390 × 844
- Desktop: 1440 × 960

## Visual comparison evidence

| View | Reference | Implementation | Combined comparison |
| --- | --- | --- | --- |
| Mobile Home | `ui/grok-516bcb59-f561-4bad-ab24-c193fc273f1b.jpg` | `design-qa/implementation-mobile-home.png` | `design-qa/comparison-mobile-home.jpg` |
| Mobile Word | `ui/grok-87dc603b-d470-4823-8480-831f528ed8bb.jpg` | `design-qa/implementation-mobile-word.png` | `design-qa/comparison-mobile-word.jpg` |
| Mobile Chat | `ui/grok-43e26fb0-5391-4019-a6d7-6b0be8ff77fb.jpg` | `design-qa/implementation-mobile-chat.png` | `design-qa/comparison-mobile-chat.jpg` |
| Mobile Profile | `ui/grok-6db4f2f7-7e3c-46f6-a1ba-8c8ce7d1620f.jpg` | `design-qa/implementation-mobile-profile.png` | `design-qa/comparison-mobile-profile.jpg` |
| Desktop Home | `ui/grok-627ebad4-4d53-457f-8a1c-75ed30f290cf.jpg` | `design-qa/implementation-desktop-home.png` | `design-qa/comparison-desktop-home.jpg` |
| Desktop Word | `ui/grok-bf161d3c-2cd6-4157-b122-c9caf36a1c2a.jpg` | `design-qa/implementation-desktop-word.png` | `design-qa/comparison-desktop-word.jpg` |
| Desktop Chat | `ui/grok-8b28d84e-22dc-4afc-a824-26718782a5ca.jpg` | `design-qa/implementation-desktop-chat.png` | `design-qa/comparison-desktop-chat.jpg` |
| Desktop Settings | `ui/grok-96fc26d8-2f0d-4114-8b4d-297e8690c1e7.jpg` | `design-qa/implementation-desktop-profile.png` | `design-qa/comparison-desktop-profile.jpg` |

## Findings and fixes

### Pass 1

- P2: Mobile Home and Word cards were too short relative to the references.
  - Fixed by restoring the taller source proportions and responsive viewport-based sizing.
- P2: Desktop Home had an extra heading and undersized action cards.
  - Fixed by removing the extra heading from the desktop composition and increasing card depth.
- P2: Mobile and desktop Chat did not have the full six-message rhythm shown in the references.
  - Fixed by adding the final learner reply and increasing desktop bubble density.
- P2: Desktop Settings controls were too sparse and the chart palette did not match.
  - Fixed by adding the missing preference controls and regenerating the heatmap/trend asset in teal and purple.
- P1: Mobile setting rows placed interactive buttons inside another button.
  - Fixed by rendering toggle rows as non-button containers. A clean browser session then reported zero console errors.

### Final pass

- No P0, P1, or P2 issues remain.
- Remaining P3 differences:
  - The source images contain malformed AI-generated copy; the implementation uses coherent Chinese and English product copy.
  - Font rendering varies slightly because the references do not provide an identifiable font file.
  - Source-only device and monitor chrome is intentionally omitted.

## Interaction verification

- Home “背单词” action navigates to `/word`.
- Word offers explicit “单词 / 填空” modes; the fill-in input reports incorrect spelling, accepts the correct answer, and advances from `12/50` to `13/50`.
- Fill-in mode now generates stable, randomized letter scaffolds from prefix, suffix, middle-pair, or scattered positions. “再提示一些” progressively reveals more letters without exposing the full answer, while “换一组字母” rerolls the visible positions without changing the question.
- Study-only examples are not rendered in fill-in mode, so desktop learners cannot see the target word elsewhere on the page.
- Word pronunciation and tutor-message playback use the browser speech engine.
- Repeated mastery of the same word no longer increases the vocabulary total more than once.
- Each chat contact has an independent title, avatar, and message thread; typed messages do not leak between contacts.
- New chat, clear/restart, emoji insertion, message playback, and permission-free local recording simulation all provide visible feedback.
- Settings links use independent section URLs and active states; the dark-mode switch updates the root theme and rendered colors.
- Home, Word, Chat, and Profile have zero horizontal overflow at the former 960px failure width.
- Unknown routes redirect to the Home page.
- Browser console: 0 errors in the clean final verification session.

Additional fill-in evidence:

- `design-qa/implementation-mobile-word-cloze.png`
- `design-qa/implementation-desktop-word-cloze.png`
- `design-qa/implementation-mobile-word-random-hints.jpg`
- `design-qa/implementation-desktop-word-random-hints.jpg`

## Engineering verification

- TypeScript project check: passed
- Production Vite build: passed
- Oxlint: passed
- Hint invariants: passed across 80,160 word/variant combinations, including one-letter, short-word, hyphenated-word, progressive-reveal, and reroll cases

final result: passed
