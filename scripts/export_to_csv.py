import json
import csv
import os

base_path = r'c:\Users\johnh\OneDrive\Documents\indak\data'
vocab_path = os.path.join(base_path, 'vocabulary.json')
sentences_path = os.path.join(base_path, 'sentences.json')

# Export Vocabulary
with open(vocab_path, 'r', encoding='utf-8') as f:
    vocab_data = json.load(f)

vocab_csv = os.path.join(base_path, 'vocabulary_master.csv')
with open(vocab_csv, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Hiligaynon Word', 'English Meaning', 'Syllables (Dash Separated)', 'Stress Index (0-based)'])
    for item in vocab_data:
        syllables_str = '-'.join(item['syllables'])
        writer.writerow([item['word'], item['meaning'], syllables_str, item['stress_index']])

# Export Sentences
with open(sentences_path, 'r', encoding='utf-8') as f:
    sentences_data = json.load(f)

sentences_csv = os.path.join(base_path, 'sentences_master.csv')
with open(sentences_csv, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['English Sentence', 'Hiligaynon Chunks (Correct Order)', 'Trap Words (Distractors)'])
    for item in sentences_data:
        chunks_str = ' | '.join(item['ilonggo_chunks'])
        traps_str = ' | '.join(item['trap_words'])
        writer.writerow([item['english'], chunks_str, traps_str])

# Export Grammar Drills
drills_path = os.path.join(base_path, 'grammar_drills.json')
with open(drills_path, 'r', encoding='utf-8') as f:
    drills_data = json.load(f)

drills_csv = os.path.join(base_path, 'grammar_drills_master.csv')
with open(drills_csv, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Hiligaynon Pattern (with ___)','Correct Marker','Distractors (Bar Separated)','English Meaning','Category'])
    for item in drills_data:
        distractors_str = ' | '.join(item['distractors'])
        writer.writerow([item['sentence'], item['correct'], distractors_str, item['english'], item['category']])

# Export Morphology
morph_path = os.path.join(base_path, 'morphology.json')
with open(morph_path, 'r', encoding='utf-8') as f:
    morph_data = json.load(f)

morph_csv = os.path.join(base_path, 'morphology_master.csv')
with open(morph_csv, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Root Word', 'English Meaning', 'Valid Conjugations (Bar Separated)', 'Nonsense/Invalid Forms (Bar Separated)'])
    for item in morph_data:
        # Extract just the word from the valid_forms object for the CSV list
        valids_list = [v['word'] if isinstance(v, dict) else v for v in item['valid_forms']]
        valids_str = ' | '.join(valids_list)
        nonsenses_str = ' | '.join(item['nonsense_forms'])
        writer.writerow([item['root'], item['meaning'], valids_str, nonsenses_str])

print(f"Exported: {vocab_csv}")
print(f"Exported: {sentences_csv}")
print(f"Exported: {drills_csv}")
print(f"Exported: {morph_csv}")
