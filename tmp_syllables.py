
import json
from collections import Counter

# Load vocabulary
with open('c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json', 'r', encoding='utf-8') as f:
    vocab = json.load(f)

# Extract and count syllables
all_syllables = []
for entry in vocab:
    all_syllables.extend(entry['syllables'])

# Get top 60
counts = Counter(all_syllables)
top_60 = counts.most_common(60)

# Print results
print("| Rank | Syllable | Count |")
print("|------|----------|-------|")
for i, (syll, count) in enumerate(top_60, 1):
    print(f"| {i} | {syll} | {count} |")
