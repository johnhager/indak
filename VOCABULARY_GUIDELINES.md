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

## KWF 2024 Orthography Standards

To ensure the modern relevance of "Indak," we follow the **Ortograpiya sang Hiligaynon (2024)** published by the Komisyon sa Wikang Filipino (KWF).

### 1. Modern Hyphenation (Purong)
*   **Glottal Stops (C-V):** Use a hyphen when a syllable ends in a consonant and the next starts with a vowel (e.g., `Gab-i`, `San-o`).
*   **Reduplication:** Hyphenate full roots if they are independent (e.g., `Tawo-tawo`, `Lakat-lakat`).
*   **Syncopation:** Mark vowels dropped during suffixation with a hyphen (e.g., `Dala` + `on` -> `Dal-on`).
*   **Imperatives:** Hyphenate command forms (e.g., `Himu-a`, `Lutu-a`).
*   **Prefixes:** Use hyphens between prefixes and proper nouns (e.g., `Taga-Iloilo`, `Maka-Filipino`).

### 2. Vowel Selection (O/U and E/I)
*   **The O/U Rule:** 
    *   Use **O** in the final syllable of a root (`Bato`).
    *   Use **U** in internal syllables (`Kuntani`).
    *   **Shift:** O changes to U when a suffix is added (`Bato` -> `Batuhon`).
*   **D to R Change:** The letter **D** usually changes to **R** when it falls between two vowels (e.g., `Dako` -> `Marako`).

### 3. Official Stress Markers (Tuldik)
While the game uses a `stress_index` for engine logic, the display text should ideally use these marks for advanced learners:
*   **Pahilig (Acute ´):** Standard stress (e.g., `Maáyo`).
*   **Paiwa (Grave `):** Final glottal stop with penultimate stress (e.g., `Lutò`).
*   **Sunok (Circumflex ^):** Final stress + final glottal stop (e.g., `Dakû`).

### 4. Modern Loanwords
Respelle foreign words phonetically unless they are technical (e.g., `Jabon` -> `Habon`, `Calle` -> `Kalye`).

---

## 📚 Vital Project Resources

If you are considering adding new language material to the app, always cross-reference your findings against the primary source materials stored inside the `/resources` directory of this repository:

1. **The Giant Ilonggo Phrasebook (3rd Edition)**  
   *Location:* `/resources/Giant_Ilonggo_Phrasebook.pdf`  
   *Use For:* Understanding grammar structures (DAS/VAOL), standardizing complex sentence interactions, and learning about subtle phonetic features (like the glottal dash). This is a primary source for Tier 4, 5, and 6 sentence logic.

2. **Speakin' Digital Visayan/Hiligaynon Dictionary**  
   *Location:* `/resources/Speakin_Visayan_Dictionary.html`  
   *Use For:* Verifying the syllable breakdown and exact definitions of root words, particularly checking "Molo/Urban" dialect variations against traditional phrasing.

