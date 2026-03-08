# Indak AI Assistant Rules (System Instructions)

These rules dictate how AI agents and assistants should approach writing code, formatting UI, and adding content to the Indak Ilonggo Learning App project. All AI assistants MUST read and adhere to these principles.

## 1. UI & Aesthetics (Non-Negotiable)
- **Glassmorphism First**: Always default to translucent glass interfaces (`rgba(255, 255, 255, 0.05)`), heavy background blurs (`backdrop-filter: blur(20px)`), and thin semi-transparent white borders.
- **Vibrant Tropical Color Palette**: Do not use primary colors. Stick to the root variables defined in `style.css` (Deep Indigo backgrounds, Coral/Gold accents, Bamboo Greens).
- **Fluid Typography**: Use CSS `clamp()` for almost all typographies and card sizings to ensure smooth scaling from an iPhone 13 Mini up to an iPad. Do NOT use hardcoded `px` values for primary layout components.
- **Mobile-First Layouts**: Always assume the user is testing on an iPhone screen (specifically, standard width ~375px or 390px). Design flexbox rows so that items gracefully fit or wrap without clipping. Avoid horizontal scroll.
- **App-Like Feel**: Make sure standard browser behaviors (rubber-banding, text-selection, long-press context menus) are disabled via CSS or JS unless explicitly required.

## 2. Core Audio & Engine Mechanics
- **No Text-to-Speech (TTS)**: Do not attempt to use `window.speechSynthesis` for Ilonggo. It sounds robotic, crashes older devices, and causes UI stutter on iOS Safari. Rely ONLY on procedural Web Audio API (oscillators) or pre-recorded `.mp3`/`.wav` assets.
- **Zero-Latency Interactions**: Audio MUST play exactly when the user taps (`touchstart` / `pointerdown`). Do not wait for `click` events, which have inherent browser delays.
- **No Fluff Frameworks**: Stick to Vanilla JavaScript (ES6 modules). Do not needlessly introduce React, Vue, or heavy dependencies for mini-games.

## 3. Mini-Game Mechanics Design
- **Immediate Feedback**: All interactive modules (Rhythm, Sentence Builder, etc.) must provide immediate and satisfying visual/audio feedback for user actions.
- **Predictable Flow**: Visual timings and animations must sync perfectly with mathematical hit windows or logic gates.
- **Player-Anchored Timing (for Rhythm)**: Rhythm events should calculate dynamically based on the exact millisecond of the player's initial input.

## 4. Lesson Structure & Progression
- **Standard 4-Stage Flow**: Lessons should aim to follow this progression:
    1. **Swipe Sorter**: Vocabulary/meaning recognition.
    2. **Marker Mission**: Structural logic and grammar (requires `drills` in JSON).
    3. **ContextMaster**: Real-world situational dialogue (requires `situations` in JSON).
    4. **Sentence Builder**: Full production and syntax.
- **Dynamic Skipping**: The engine automatically skips internal stages (Marker/Context) if the corresponding data keys are missing from the lesson JSON. 
- **Mastery Threshold**: Users must achieve at least **80% accuracy** to progress to the next stage in a session.

## 5. Documentation & Content
- All new JSON data MUST strictly adhere to the schemas defined in the documentation.
- When generating large batches of text/words, format them directly in JS or Python scripts for generation and injection, avoiding massive manual file copy-pastes in chat.
- Always add comprehensive `README.md` and inline JS docstring comments when standing up a totally new module or game type.
