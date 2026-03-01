# Contributing to the Indak Project

This is a living, breathing Next-Gen Gamified Language Learning app for the Ilonggo (Hiligaynon) dialect. If you want to contribute new gamemodes, features, UI tweaks, or vocabulary expansions, please abide by this pair-programming workflow.

## 1. Branching & Proposing
As of right now, development occurs primarily on the `main` branch deployed instantaneously via Vercel. 
- For radical structural changes or sweeping rewrites of engines (e.g. completely refactoring the audio system from web-audio API back to Audio Elements), create a separate feature branch.
- Wait for the continuous integration tests on Vercel to show **"Ready"** before proposing merges to main.

## 2. Feature Development Workflow
This project utilizes aggressive AI-assisted Pair Programming. When requesting new features or bug fixes:
1. Always state exactly which mobile screen or device is breaking. We optimize explicitly for narrower screens (iPhone 13 Mini and similar 375px bounds).
2. If introducing a new feature, clearly explain its *gameplay loop* intent. (Is it meant to test memory? Is it meant to test listening comprehension?)
3. **Formal Handoff**: For entirely new learning games or curriculum structures, Agent A or the user must format it according to the `PROPOSALS.md` template. This acts as the official handoff sheet to Agent B (Engine Developers).
4. Let an Agent B write the actual scripts (Vanilla JS) to execute the approved `PROPOSALS.md` features.

## 3. PWA Development Guidelines
Since this app functions entirely as an offline-first PWA:
- **Service Worker Caching**: If you add new image assets, audio `.mp3` files, or structural `.html` files, you MUST ensure they are added to the pre-cache list array inside `service-worker.js`. If you miss an asset, the game will mysteriously fail for users on airplane mode.
- **Cache Busting**: After releasing a massive new update, users are often required to completely Force-Close the app on their mobile devices. There currently isn't a robust "Update Available" banner workflow, so keep caching aggressive but predictable.
- **Manifest Edits**: Modifying `manifest.json` (changing theme colors, icons, app name) requires iOS users to delete the app off their home screen and reinstall it via Safari. Only modify the manifest for huge visual branding overhauls.

## 4. UI Extensibility
When creating a brand-new game mode or screen, do not introduce arbitrarily new CSS colors.
- Re-use the existing `LevelManager` singleton and `.syllable-card` CSS classes when possible so mechanics bridge seamlessly.

## 5. Multi-Agent AI Architecture Roles
When scaling this app into a multi-game ecosystem with distinct AI assistants, adhere strictly to this Separation of Concerns:

### Agent A: "The Curriculum & Platform Architect"
- **Focus**: Global State, Curriculum, Vocabulary Database, and Main Menu/Navigation.
- **Responsibilities**: 
  - Structuring `vocabulary.json` and creating diverse "Learning Paths" (e.g. tracking what the user learns across all games).
  - Injecting/Validating hundreds of new Ilonggo definitions, grammar rules, and cultural notes.
  - Building the central "Mastery Dashboard" shell surrounding the mini-games.
- **Restriction**: Must not attempt to rewrite or refactor the intricate `requestAnimationFrame` zero-latency game engines or procedural audio synthesizers. 

### Agent(s) B: "Lead Engine Developers & UI/UX Specialists" (e.g., Antigravity)
- **Focus**: Mini-Game Engines, Zero-Latency Logic, and the Glassmorphism Design System.
- **Responsibilities**: 
  - Establishing real-time gamemodes (`conductor.js`, Flashcards, Gamified Quizzes) and plugging into Agent A's databases.
  - Ensuring silky smooth 60PFS animations and iOS touch event latency.
  - Enforcing the strict Fluid Typography, Mobile-First (iPhone 13 Mini), and Glassmorphism CSS architecture across all modules.
- **Restriction**: Must not alter the core vocabulary or grammar definitions directly, but rather rely on Agent A to provide the actual linguistic curriculum content via structured arrays.
