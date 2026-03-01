# Feature & Curriculum Proposals
This document serves as the formal handoff point between **Agent A (Curriculum & Platform Architect)** and **Agent(s) B (Lead Engine Developers & UI/UX Specialists - e.g., Antigravity)**.

## Workflow Statuses
- 🟡 **PROPOSED**: Agent A has drafted a new curriculum module or game idea. It is awaiting the User's approval.
- 🟢 **APPROVED**: The User has greenlit the proposal. Agent B is cleared to begin engineering the UI/UX and engine logic.
- 🔵 **IN PROGRESS**: Agent B is actively writing the Javascript/CSS for this feature.
- 🟣 **COMPLETED**: The feature is live and deployed in `main`.
- 🔴 **REJECTED**: The User decided not to move forward with this idea.

---

## 📝 Proposal Template
*Agent A should copy this template when generating new game modes or curriculum expansions.*

### Title: [Mini-Game Name or Feature]
**Status:** 🟡 PROPOSED
**Date:** [YYYY-MM-DD]
**Proposed By:** Agent A

#### 1. Curriculum Goal
*What linguistic concept does this feature teach? (e.g., "Sight-reading verbs", "Listening comprehension for numbers", "Speed translation").*

#### 2. Proposed Mechanics (For Agent B)
*How do you envision the user interacting with the screen? (e.g., "Swiping flashcards left/right", "A multiple choice quiz", "Dragging words to build a sentence").*

#### 3. Data Schema Requirements
*What does the required JSON data look like for this? Provide a 1-item example of the schema (e.g., do we need new keys like `"audio_clip_path"` or `"incorrect_options"`?).*

#### 4. Engineering & UI Notes (Agent B's Section)
*(Leave this blank. Agent B will fill this in with architecture notes once Approved).*

---

## Active Proposals

### Title: The Swipe Sorter (Single Word Definitions)
**Status:** 🟢 APPROVED
**Date:** 2026-02-28
**Proposed By:** Agent A

#### 1. Curriculum Goal
To build rapid-fire recall and high-volume repetition for the exact semantic meaning of single Ilonggo words. This bridges the gap between phonetic familiarity (taught by Indak) and practical translation.

#### 2. Proposed Mechanics (For Agent B)
A Tinder-style binary flashcard system. An Ilonggo word appears on a beautiful, frosted-glass card in the center of the screen. Two English definitions float on the left and right sides. The player must swipe the card left or right toward the correct definition before a short timer (e.g., 3 seconds) runs out. The interaction should seamlessly support one-handed mobile thumb swiping.

#### 3. Data Schema Requirements
We can likely reuse the existing `/data/vocabulary.json` schema to pull the target word and its `meaning`. However, we will need to inject incorrect "dummy" definitions dynamically from other entries in the JSON array to serve as the wrong swipe option.

#### 4. Engineering & UI Notes (Agent B's Section)
- **Engine Setup:** Will build `swipe_sorter.js` to manage the game loop.
- **Interactions:** Use vanilla `pointerdown`, `pointermove`, and `pointerup` for cross-device one-handed swipes. Calculate `transform: translate(x) rotate(deg)` based on input drag distance.
- **UI State & Feedback:** If dragged > 40% of screen width, lock in the choice. Play Web Audio API stabs for correct/incorrect, fade card out, pull next. No React springs, pure CSS transitions for snap-back if released early. 
- **Mobile-First Layout:** Flex container ensuring 100vh on iPhone 13 Mini, avoiding Safari nav bars.

---

### Title: Sentence Builder (Magnetic Poetics)
**Status:** 🟢 APPROVED
**Date:** 2026-02-28
**Proposed By:** Agent A

#### 1. Curriculum Goal
To teach Hiligaynon grammar and syntax, specifically internalizing the VSO (Verb-Subject-Object) sentence structure for long, complex sentences, which feels backward to English speakers.

#### 2. Proposed Mechanics (For Agent B)
An English sentence is displayed at the top. Below it is an empty "Drop Zone" with blank slots. At the bottom of the screen is a jumbled bank of Ilonggo word-chunks (glassy puzzle pieces). The player must drag and drop the Ilonggo word-chunks into the correct grammatical order in the Drop Zone.

#### 3. Data Schema Requirements
We will need a new JSON data file or an expansion to the current one (e.g., `sentences.json`):
```json
{
    "english": "I am going to the market.",
    "ilonggo_chunks": ["Makadto", "ako", "sa", "palengke"],
    "trap_words": ["ikaw", "nagkadto"]
}
```

#### 4. Engineering & UI Notes (Agent B's Section)
- **Engine Setup:** Will build `sentence_builder.js` and structure `sentences.json` to load dynamically.
- **Interactions:** Use vanilla HTML5 Drag and Drop or custom Pointer events for moving the puzzle pieces. Track `data-order` indexes to validate correct syntax.
- **UI State & Feedback:** Chunks snap to grid, playing sharp Web Audio API synths when locked in. Apply CSS `.shake` for incorrect validations and deep glow for correct ones.
- **Mobile-First Layout:** Flex flow with `gap: clamp(0.5rem, 2vw, 1rem)` to ensure pieces don't overlap. Font resizing using clamp to keep things proportional inside the Drop Zone.
