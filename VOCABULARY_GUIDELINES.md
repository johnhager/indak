# Vocabulary & Linguistic Guidelines (Ilonggo/Hiligaynon)

This document dictates how the JSON data structures must be formatted inside `/data/vocabulary.json`. If you break these schemas, the "Indak" rhythm engine and future language modules will crash or misbehave.

## JSON Schema Requirements

Every word added to the database must be an object with the following exact keys:

```json
{
    "word": "Kumusta",
    "syllables": ["Ku", "mus", "ta"],
    "stress_index": 2,
    "meaning": "How are you"
}
```

### 1. `word` (String)
The proper dictionary spelling of the Ilonggo word (e.g. "Kumusta"). It should be exactly as it appears in real writing. Always capitalize the first letter.

### 2. `syllables` (Array of Strings)
How the word is audibly separated in rhythm. 
- **CRITICAL**: The array of syllables MUST perfectly match the spoken downbeats.
- Example: `Balud` -> `["Ba", "lud"]`
- Example: `Eroplano` -> `["E", "rop", "la", "no"]`
- **Glottal Stops**: If a word features a hyphenated glottal stop (like "Gab-i" or "Madinalag-on"), treat the glottal stop naturally as its own hit if it constitutes a separate rhythmic beat, otherwise group it phonetically: E.g., `["Gab", "i"]`. 

### 3. `stress_index` (Integer)
The ZERO-BASED index of the syllable in the array that receives the primary verbal stress (the loudest or longest accent syllable).
- Example: `Ba-lay` -> Stress is on "lay", so `stress_index: 1`.
- Example: `Kumusta` -> `["Ku", "mus", "ta"]` -> The stress is on "ta", so `stress_index: 2` (Zero-indexed `0, 1, 2`).
*(Note: In the game, the syllable card with the stress index glows Gold and has a special accented synth beat).*

### 4. `meaning` (String)
A perfectly concise, one-to-three word English translation. Do not write full explanatory sentences. Avoid overly ambiguous terms. E.g., "To jump", "Blue", or "Run". Keep it tight so it fits gracefully on a mobile screen when revealed.

---

## Content Expansion Protocol
When generating new words via scripts, ALWAYS test for lengths anywhere from 1 up to 10 syllables. Ensure the JSON remains syntactically perfect without trailing commas to avoid JSON parse failures upon Service Worker caching.
