# Ilonggo Learning App (Project Name: TBD)

A comprehensive, gamified language-learning Progressive Web App (PWA) focused entirely on teaching Hiligaynon (Ilonggo) through interactive, bite-sized mini-games and immersion modules.

This application is designed to eventually house multiple different game modes, flashcards, and learning materials under a single unified PWA ecosystem. 

---

## 🎮 The First Module: "Indak" (Rhythm Game)
The primary game mode developed so far is **Indak** (meaning "Dance" or "Rhythm" in Ilonggo). 

It is a low-latency, mobile-first rhythm game designed to teach the natural syllabic structure, pronunciation speed, and meaning of Ilonggo words. By breaking down vocabulary into rhythmic chunks, users build muscle memory and phonetic familiarity.

### Core Mechanics of Indak:
1. **Stationary Word Layout**: Words spawn horizontally in the center of the screen, broken down by syllable (e.g., `SU - GOD`), allowing the player to easily read them left-to-right.
2. **"Osu!" Rhythm Rings**: A visual "approach ring" encircles the active syllable, shrinking down exactly on the musical beat. The player must tap the screen when the ring perfectly aligns with the syllable card.
3. **Adaptive UI**: Syllable cards light up when hit perfectly and give immediate visual/audio feedback. When a word is fully cleared with a "PERFECT" rating, its English translation and pronunciation guide are temporarily revealed.
4. **Dynamic Speed Settings**: 
   - **Learner (Slow)**: Locked at 80 BPM to allow for reading comprehension.
   - **Native (Fast)**: Locked at 140 BPM to simulate real-world, conversational Ilonggo speeds.
5. **No AI Speech Synthesis**: For pure rhythm play, the TTS engine was gutted to remove performance lag, latency, and weird "robotic English" artifacts on iOS. Audio cues are handled purely through sharp, procedural woodblock/synthesizer stabs using the Web Audio API.

---

## 📱 UI/Design Philosophy
The visual direction of this app relies on modern, premium aesthetics instead of typical, generic "flashcard" apps.
- **Glassmorphism**: Beautiful, blurred glass panes (`backdrop-filter`) floating over rich, tropical gradient backgrounds.
- **Mobile First (iPhone 13 Mini Priority)**: The CSS uses heavily responsive, fluid typography (`clamp`) and viewport units (`vw`, `vh`) specifically tuned so that everything easily fits and looks gorgeous on a smaller, narrower screen like the iPhone 13 Mini. (Spacing allows up to 5 syllables on a single row).
- **Native App Feel**: The app disables accidental zooming, highlighting (`user-select: none`), block rubber-banding (`overscroll-behavior: none`), and prevents standard browser behaviors so the PWA feels indistinguishable from an iOS App Store download.

---

## 🛠️ Technical Stack & Architecture
- **Vanilla Core**: Pure `HTML5`, `CSS3` (variables, flexbox, clamp), and `Vanilla JavaScript (ES6)` modules. No heavy front-end frameworks like React/Vue. This guarantees instant load times and 0 overhead for the rhythm mechanics.
- **Web Audio API**: Real-time synthesized percussion (OscillatorNodes and GainNodes) ensures zero-latency audio response upon tapping, which is critical for rhythm games on iOS.
- **Service Worker / PWA**: Full offline capability via `service-worker.js` caching the JSON vocabulary tree and static assets. The `manifest.json` ensures it installs directly to the iOS home screen without browser chrome (`start_url: "/"` fixes deep-link bugs).
- **Gamification Engine**: `level_manager.js` currently handles tracking perfect hits, combo streaks, and tracking "Mastered Words." `conductor.js` acts as the exact millisecond game-loop timer locking the UI to the Beats-Per-Minute.

---

## 🚀 Workflow & Deployment 
The app is built iteratively through AI-assisted pair programming and is constantly deployed live.
1. **Version Control**: Changes are committed locally and pushed to the `main` branch of the GitHub repository.
2. **Continuous Integration**: Pushing to `main` immediately triggers a **Vercel** serverless deployment (`https://indak.vercel.app`). 
3. **PWA Refresh**: Because it functions as an SPA (handled via `vercel.json` rewrites), pushing updates requires users to force-quit the iOS Home Screen app to pull the newest Service Worker cache. 

---

## 🔮 Future Roadmap for the App
As this app expands into a comprehensive language suite, future development will include:
1. **Mastery Dashboard**: A main hub tracking how many Ilonggo words have been committed to long-term memory.
2. **Different Game Types**:
   - Spaced Repetition Flashcards (for brute memorization).
   - Sentence Builders (drag and drop grammar).
   - Audio Listening tasks.
3. **Structured Curriculums**: Branching paths that guide users from basics ("Numbers/Greetings") to advanced conversational fluency.
