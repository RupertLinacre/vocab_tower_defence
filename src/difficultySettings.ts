export type GameDifficultyKey = 'gentle' | 'normal' | 'speedy';

export type GameDifficultySetting = {
    key: GameDifficultyKey;
    label: string;
    detail: string;
    color: number;
    levelOneSpeedMultiplier: number;
    levelOneSpawnDelayMs: number;
    minSpawnDelayMs: number;
    waveSpeedGrowth: number;
    waveSpawnStepMs: number;
};

export const DEFAULT_GAME_DIFFICULTY: GameDifficultyKey = 'normal';

export const DIFFICULTY_SETTINGS: Record<GameDifficultyKey, GameDifficultySetting> = {
    gentle: {
        key: 'gentle',
        label: 'Gentle',
        detail: 'slower, roomy waves',
        color: 0x74ff9b,
        levelOneSpeedMultiplier: 0.82,
        levelOneSpawnDelayMs: 1320,
        minSpawnDelayMs: 560,
        waveSpeedGrowth: 0.035,
        waveSpawnStepMs: 34,
    },
    normal: {
        key: 'normal',
        label: 'Ready',
        detail: 'balanced waves',
        color: 0x9fe9dc,
        levelOneSpeedMultiplier: 1,
        levelOneSpawnDelayMs: 1050,
        minSpawnDelayMs: 430,
        waveSpeedGrowth: 0.045,
        waveSpawnStepMs: 40,
    },
    speedy: {
        key: 'speedy',
        label: 'Speedy',
        detail: 'faster, busier waves',
        color: 0xffe38a,
        levelOneSpeedMultiplier: 1.18,
        levelOneSpawnDelayMs: 820,
        minSpawnDelayMs: 320,
        waveSpeedGrowth: 0.055,
        waveSpawnStepMs: 48,
    },
};

export const DIFFICULTY_SETTING_LIST: GameDifficultySetting[] = [
    DIFFICULTY_SETTINGS.gentle,
    DIFFICULTY_SETTINGS.normal,
    DIFFICULTY_SETTINGS.speedy,
];

export function isGameDifficultyKey(value: string | null): value is GameDifficultyKey {
    return value === 'gentle' || value === 'normal' || value === 'speedy';
}