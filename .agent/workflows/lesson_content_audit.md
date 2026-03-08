---
description: How to audit and write lesson content to ensure all vocabulary and grammar is taught before use
---

# Lesson Content Audit Workflow

## THE GOLDEN RULE
**A word or grammar form may NEVER appear in a sentence or distractor unless it has been explicitly listed in the `vocabulary` array of the current lesson OR a prior lesson.**

No exceptions. Not even common short words like "ko", "sila", "diri", "sa", "sang".

---

## Step 1: Build the Cumulative Vocab List

Before writing or auditing any lesson, compile ALL vocabulary explicitly taught in **every lesson up to and including this one** (in curriculum order).

Example for Lesson 3 (Household Essentials):
- **Lesson 1 (Greetings 101):** Maayo, Aga, Hapon, Gab-i, Ngalan, Kumusta, Salamat, Halong, Ano, Ang, Mo, Ka, Man, Ako, Gid
- **Lesson 2 (Commuting Starter):** Sakay, Manaog, Plete, Jeep, Tricycle, Diin, Sa, Sang, Diri, Didto
- **Lesson 3:** (all new vocabulary defined in its own vocabulary array)

The union of all the above = everything permitted in Lesson 3 sentences.

---

## Step 2: Audit Every Sentence Chunk

For each entry in the `sentences` array, split the `chunks` string by `|` and strip punctuation. Every resulting token must appear in the cumulative vocab list.

**Common untaught words to watch for:**
| Token | Status | Notes |
|---|---|---|
| `ko` | ❌ UNTAUGHT until introduced | Enclitic "I/me" — differs from `Ako` |
| `sila` | ❌ until explicitly taught | "They/them" |
| `diri` | ❌ until Lesson 2+ introduced it | "Here" |
| `mapan` | ❌ | "Going to" — verb form, untaught |
| `ginakaon` | ❌ | Passive present — not covered |
| `pangitaon` | ❌ | Verb form — not covered |
| `lang` | ❌ until taught | Particle "just/only" |
| `bi` | ❌ | Softening particle — not covered |
| `indi` | ❌ until taught | "Not/No" negation |
| `nagakadto` | ❌ until taught | "Going there" — verb form |
| Adjective forms like `matinlo`, `madulom`, `mahigko` | ❌ | Root word must be in vocab first |

---

## Step 3: Audit Distractors

Every word in the `distractors` string must also come from the cumulative vocab list. A distractor word that was NEVER taught creates confusion just as much as an untaught correct answer.

**Wrong:** `"distractors": "nagakadto | indi | sia"` — none of these are taught yet  
**Right:** `"distractors": "manaog | tricycle"` — both are lesson vocabulary

---

## Step 4: Audit Verb Forms

Verb forms are only permitted when the tense prefix system has been explicitly taught in `grammar`.

| Prefix | Status | When taught |
|---|---|---|
| Base/Imperative (Sakay!) | ✅ Always OK | No prefix needed |
| `nag-` (past) | ✅ after Lesson 2 grammar | Commuting Starter introduces nag-/naga-/mag- |
| `naga-` (present) | ✅ after Lesson 2 grammar | |
| `mag-` (future) | ✅ after Lesson 2 grammar | |
| `gina-` (passive present) | ❌ | Not yet introduced |
| `-on` suffix (future passive) | ❌ | Not yet introduced |
| `na-` | ❌ | Not yet introduced |

---

## Step 4b: Verify Vocabulary Entries Are Root Words

The `vocabulary` array must always list the **root form** of each word, not a pre-inflected form. Conjugated forms in sentences are derived from the root by applying the prefix system taught in `grammar`.

**Common error pattern:**
- ❌ Wrong: listing `"Manaog"` (which is `mag- + naog`) as the vocabulary word
- ✅ Right: listing `"Naog"` as the root, with a note that `"Manaog"` is its future form

**How to identify this error:**
If a verb in the vocabulary list already starts with `mag-`, `nag-`, `naga-`, `ma-` (adjective), or another productive prefix, it is likely an inflected form, not a root.

**Known Ilonggo prefix contractions to watch for:**
| Pattern | Example | Correct root |
|---|---|---|
| mag + n → man | Manaog | Naog |
| mag + l → mal (sometimes) | - | check case by case |
| ma- adjective prefix | Maayo | root "ayo" (though Maayo is treated as stable) |

**Rule:** When writing tense conjugation examples in `grammar`, always derive them from the root:
- ✅ `nag + naog = Nagnaog` (not `nag + manaog = Nagmanaog`)
- ✅ `naga + naog = Naganaog` (not `naga + manaog = Nagamanaog`)
- ✅ `mag + naog = Manaog` (the future IS the vocabulary entry here)

---

## Step 5: Fix Violations

If a sentence uses an untaught word, you have two choices:
1. **Replace the sentence** with one that only uses taught vocabulary. (Preferred.)
2. **Add the word to the lesson's vocabulary array** AND add a grammar note explaining it.

Do NOT silently remove the sentence or use a synonym without checking the synonym is also taught.

---

## Step 6: Verify JSON Validity

After editing any `.json` lesson file, confirm:
- No duplicate keys
- No trailing commas
- All strings are properly quoted
- The file parses without errors

---

## Enforcement Notes

- This rule applies to ALL lesson files: `greetings_101.json`, `commuting_starter.json`, `household_essentials.json`, and any future lessons.
- Every time a new lesson is created or edited, run this audit from Step 1.
- The audit must be completed BEFORE committing the file to git.
