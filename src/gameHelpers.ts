import type { ClueKind, Difficulty, Point, TowerKind } from './gameTypes';

export function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function choose<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

export function formatDifficulty(difficulty: Difficulty): string {
    if (difficulty === 'hard') {
        return 'Challenge';
    }
    if (difficulty === 'veryHard') {
        return 'Super Challenge';
    }
    return difficulty[0].toUpperCase() + difficulty.slice(1);
}

export function difficultyColor(difficulty: Difficulty): number {
    if (difficulty === 'easy') {
        return 0x46df7a;
    }
    if (difficulty === 'medium') {
        return 0xffb947;
    }
    if (difficulty === 'hard') {
        return 0xff658f;
    }
    return 0x9873ff;
}

export function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

export function difficultyEmoji(difficulty: Difficulty): string {
    if (difficulty === 'easy') {
        return '🟢';
    }
    if (difficulty === 'medium') {
        return '🟠';
    }
    if (difficulty === 'hard') {
        return '🔴';
    }
    return '🟣';
}

export function clueLabel(clueKind: ClueKind): string {
    if (clueKind === 'definition') {
        return '📖 definition';
    }
    if (clueKind === 'synonym') {
        return '🔁 synonym';
    }
    return '🔄 antonym';
}

export function towerIcon(kind: TowerKind): string {
    if (kind === 'dart') {
        return '🎯';
    }
    if (kind === 'cannon') {
        return '⭐';
    }
    if (kind === 'missile') {
        return '🚀';
    }
    if (kind === 'laser') {
        return '🔦';
    }
    if (kind === 'ricochet') {
        return '🌀';
    }
    if (kind === 'cluster') {
        return '🎉';
    }
    return '🔥';
}

export function projectPointToSegment(point: Point, start: Point, end: Point): { point: Point; distance: number; t: number } {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
        return { point: start, distance: distance(point, start), t: 0 };
    }

    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    const projected = { x: start.x + dx * t, y: start.y + dy * t };
    return { point: projected, distance: distance(point, projected), t };
}

export function normalize(dx: number, dy: number): Point {
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
}