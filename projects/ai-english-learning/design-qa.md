# AI English Learning — Design QA

## Scope

The implementation was checked against all eight supplied UI references:

- Mobile: Home, Word, Chat, Profile
- Desktop: Home, Word, Chat, Settings

Device frames, operating-system status bars, monitor bezels, and home indicators in the source images were excluded from the implementation. The comparison crops therefore focus on app-owned content.

## Test viewports

- Narrow mobile boundary: 320 × 844
- Mobile: 390 × 844
- Desktop: 1440 × 960

## Visual comparison evidence

| View | Reference | Implementation | Combined comparison |
| --- | --- | --- | --- |
| Mobile Home | `ui/grok-516bcb59-f561-4bad-ab24-c193fc273f1b.jpg` | `design-qa/implementation-mobile-home.png` | `design-qa/comparison-mobile-home.jpg` |
| Mobile Word | `ui/grok-87dc603b-d470-4823-8480-831f528ed8bb.jpg` | `design-qa/implementation-mobile-word.png` | `design-qa/comparison-mobile-word.jpg` |
| Mobile Word — inline cloze | `ui/grok-87dc603b-d470-4823-8480-831f528ed8bb.jpg` + `docs/03-ui-prompt.md` v1.1 | `design-qa/implementation-mobile-word-inline-cloze.png` | `design-qa/comparison-mobile-word-inline-cloze.jpg` |
| Mobile Chat | `ui/grok-43e26fb0-5391-4019-a6d7-6b0be8ff77fb.jpg` | `design-qa/implementation-mobile-chat.png` | `design-qa/comparison-mobile-chat.jpg` |
| Mobile Profile | `ui/grok-6db4f2f7-7e3c-46f6-a1ba-8c8ce7d1620f.jpg` | `design-qa/implementation-mobile-profile.png` | `design-qa/comparison-mobile-profile.jpg` |
| Desktop Home | `ui/grok-627ebad4-4d53-457f-8a1c-75ed30f290cf.jpg` | `design-qa/implementation-desktop-home.png` | `design-qa/comparison-desktop-home.jpg` |
| Desktop Word | `ui/grok-bf161d3c-2cd6-4157-b122-c9caf36a1c2a.jpg` | `design-qa/implementation-desktop-word.png` | `design-qa/comparison-desktop-word.jpg` |
| Desktop Word — inline cloze | `ui/grok-bf161d3c-2cd6-4157-b122-c9caf36a1c2a.jpg` + `docs/03-ui-prompt.md` v1.1 | `design-qa/implementation-desktop-word-inline-cloze.png` | `design-qa/comparison-desktop-word-inline-cloze.jpg` |
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
- Word offers explicit “单词 / 填空” modes; the sentence-level letter slots are the only answer input and there is no separate answer box below the sentence.
- The slot group has one semantic textbox and one Tab stop. Clicking a slot, ArrowLeft/ArrowRight, Backspace, replacement, continuous typing, and desktop/mobile focus all operate on the target character-index model.
- Full-answer and remaining-letter paste work; unsupported digits and emoji are filtered, while incompatible supported separators are rejected without destroying existing input.
- Incomplete submission focuses the first remaining slot; a complete wrong answer stays editable; editing clears the error state; a correct answer changes the primary action to “下一题”. The first Enter confirms correctness and the second advances exactly once from `12/50` to `13/50`.
- Mode switching preserves the current answer and hint pattern. “再提示一些” and “换一组字母” avoid user-filled slots and preserve typed letters.
- Fill-in mode now generates stable, randomized letter scaffolds from prefix, suffix, middle-pair, or scattered positions. “再提示一些” progressively reveals more letters without exposing the full answer, while “换一组字母” rerolls the visible positions without changing the question.
- One- and two-letter words, hyphens, apostrophes, spaces, optional compatible answers, and mixed separator paste boundaries are covered by deterministic tests.
- At 320px the nine-letter example wraps to 7 + 2 slots with no horizontal overflow; each visual slot remains 32 × 44px and the whole group remains a single touch/focus target.
- The real input remains focusable at 18 × 32px inside the larger slot group, is not `display:none`, zero-sized, or `aria-hidden`, and exposes mobile keyboard attributes. The live status region is independent from the textbox description to avoid stale repeated announcements.
- Dark mode retains the approved teal/beige/purple hierarchy; reduced-motion CSS removes nonessential transitions and animations.
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
- `design-qa/implementation-mobile-320-word-inline-cloze.png`
- `design-qa/implementation-mobile-word-inline-cloze.png`
- `design-qa/implementation-desktop-word-inline-cloze.png`
- `design-qa/comparison-mobile-word-inline-cloze.jpg`
- `design-qa/comparison-desktop-word-inline-cloze.jpg`

## Spaced recall / 记忆曲线 v1.3

### Approved sources

- Product rules: `docs/01-prd.md` v1.3 (`0b065ec4ffb4881d6893ec23a1d9c4ec57627fe173f43ada73cdf5c3f4b02385`).
- Interaction and state rules: `ui/04-spaced-recall-ui-prompt-v1.3.md` (`72791c27d60851710868ea5f5c30deb4215dea61c0628b287252a9843ad08017`).
- Inherited inline-slot rules: `docs/03-ui-prompt.md` v1.2 (`c30be1da6e120a524976420c8c6b8d5dfaf62f0af444a4284708c96fa2094af1`).
- Visual baseline: the 13 user-provided assets registered by `ui/README.md`; generated copy defects and device chrome were not copied.

### Visual evidence

| View / state | Implementation | Combined source comparison |
| --- | --- | --- |
| Desktop review center | `design-qa/implementation-desktop-word-spaced-recall.png` | `design-qa/comparison-desktop-word-spaced-recall.jpg` |
| Desktop revealed answer | `design-qa/implementation-desktop-word-spaced-recall-revealed.png` | — |
| Desktop reveal confirmation | `design-qa/implementation-desktop-word-reveal-confirm.png` | — |
| Desktop inline revealed answer | `design-qa/implementation-desktop-word-reveal-answer.png` | — |
| Mobile 390 × 844 | `design-qa/implementation-mobile-word-spaced-recall-viewport.png` | `design-qa/comparison-mobile-word-spaced-recall.jpg` |
| Mobile full page / queue | `design-qa/implementation-mobile-word-spaced-recall.png`; `design-qa/implementation-mobile-word-spaced-recall-queue.png` | — |
| Narrow mobile 320 × 844 | `design-qa/implementation-mobile-320-word-spaced-recall.png` | — |

### Functional and accessibility verification

- “查看答案” first opens a cancellable confirmation. Confirming reveals the complete standard answer only in the existing inline letter slots, makes the answer read-only, and exposes “重新作答本题” and “下一题”; no sentence-below answer input is introduced.
- Reveal and complete-wrong evidence are recorded idempotently as weak-word events. Same-day reinforcement is capped at two appearances with a randomized three-to-seven-other-item gap, and waiting items truthfully show the remaining gap instead of being served early.
- Cross-day S0–S4 progression, mastered exit, D+30 maintenance, assisted/revealed outcomes, overdue ordering, pause/resume, missed-session recovery, timezone changes, corrupt-storage preservation, and revision-conflict handling are covered by deterministic engine verification.
- Hint use is persisted as assisted evidence and cannot advance mastery. Conflicting or stale state blocks settlement instead of silently overwriting newer browser data.
- Notification copy distinguishes browser permission, in-app status, and external SMS/email channels. A browser notification is requested only when enabled, permission is granted, a genuine item is due, and quiet-hour rules allow it; the UI never claims delivery. Data remains local to the current browser/device.
- Queue details disclose remaining overdue and due-today items; keyboard users can move tabs with ArrowLeft/ArrowRight/Home/End. Reset confirmation traps focus, supports Escape, and returns focus to its trigger.
- At 390 × 844 and 320 × 844 there is no horizontal overflow. All visible buttons are at least 44 × 44px, and the final clean browser session reported zero warnings or errors. Desktop verification used 1440 × 960 evidence and a clean 1280 × 720 final preview.
- Offline progression is verified at the deterministic engine boundary; browser network emulation was not used. The interface states the offline limitation and never advances mastery while offline.
- Chinese completeness: navigation, actions, status feedback, dialogs, validation, empty/waiting/error states, reminder copy, queue details, accessibility labels, and mobile UI are available in coherent Simplified Chinese. Learning targets and pronunciations remain English by product intent.

## Engineering verification

- Runtime: Node.js 24.14.0 (satisfies the declared Node.js 22.12+ baseline)
- TypeScript project check: passed
- Production Vite build: passed
- Oxlint: passed
- Spaced-recall deterministic verification: passed
- Hint invariants: passed across 80,160 word/variant combinations, including one-letter, short-word, hyphenated-word, progressive-reveal, and reroll cases
- Inline cloze invariants: passed across 1,200 randomized hint cases plus input, replacement, deletion, complete/remaining paste, illegal-character filtering, one/two-letter words, hyphen, apostrophe, and space boundaries

final result: passed
