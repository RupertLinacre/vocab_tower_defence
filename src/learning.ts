import type { ClueKind, WordEntry } from './gameTypes';
import { choose, shuffle } from './gameHelpers';

export function createClue(word: WordEntry, clueKind: ClueKind): string {
    if (clueKind === 'definition') {
        return `Which word matches this definition: "${word.shortDefinition}"?`;
    }
    if (clueKind === 'synonym') {
        return `Which word is a synonym of "${choose(word.synonyms)}"?`;
    }
    return `Which word is an antonym of "${choose(word.antonyms)}"?`;
}

export function createAnswerOptions(word: WordEntry, allWords: WordEntry[]): WordEntry[] {
    const pools = [
        shuffle(allWords.filter((entry) => entry.difficulty === word.difficulty && isClearDistractor(word, entry))),
        shuffle(allWords.filter((entry) => entry.difficulty !== word.difficulty && isClearDistractor(word, entry))),
        shuffle(allWords.filter((entry) => entry.word !== word.word)),
    ];

    const options = [word];
    const seenWords = new Set([normalizeTerm(word.word)]);
    for (const pool of pools) {
        for (const candidate of pool) {
            const key = normalizeTerm(candidate.word);
            if (seenWords.has(key)) {
                continue;
            }
            options.push(candidate);
            seenWords.add(key);
            if (options.length === 4) {
                return shuffle(options);
            }
        }
    }

    return shuffle(options);
}

export function learnedWordText(word: WordEntry): string {
    return `${word.word}: ${word.definition}`;
}

function isClearDistractor(target: WordEntry, candidate: WordEntry): boolean {
    if (target.word === candidate.word) {
        return false;
    }

    const targetTerms = relatedTerms(target);
    const candidateTerms = relatedTerms(candidate);
    if (targetTerms.has(normalizeTerm(candidate.word)) || candidateTerms.has(normalizeTerm(target.word))) {
        return false;
    }

    for (const term of candidateTerms) {
        if (targetTerms.has(term)) {
            return false;
        }
    }
    return true;
}

function relatedTerms(word: WordEntry): Set<string> {
    return new Set([word.word, ...word.synonyms, ...word.antonyms].map(normalizeTerm));
}

function normalizeTerm(value: string): string {
    return value.toLowerCase().trim();
}