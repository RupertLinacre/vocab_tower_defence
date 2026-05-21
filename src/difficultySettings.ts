export type GameDifficultyKey = 'gentle' | 'normal' | 'speedy' | 'hard' | 'brutal' | 'nightmare';

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
        color: 0x46df7a,
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
        color: 0x42cfff,
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
        color: 0xffcf4a,
        levelOneSpeedMultiplier: 1.18,
        levelOneSpawnDelayMs: 820,
        minSpawnDelayMs: 320,
        waveSpeedGrowth: 0.055,
        waveSpawnStepMs: 48,
    },
    hard: {
        key: 'hard',
        label: 'Hard',
        detail: 'crowded, fast waves',
        color: 0xffa35b,
        levelOneSpeedMultiplier: 1.38,
        levelOneSpawnDelayMs: 650,
        minSpawnDelayMs: 240,
        waveSpeedGrowth: 0.072,
        waveSpawnStepMs: 58,
    },
    brutal: {
        key: 'brutal',
        label: 'Brutal',
        detail: 'relentless pressure',
        color: 0xff6f91,
        levelOneSpeedMultiplier: 1.62,
        levelOneSpawnDelayMs: 470,
        minSpawnDelayMs: 170,
        waveSpeedGrowth: 0.09,
        waveSpawnStepMs: 72,
    },
    nightmare: {
        key: 'nightmare',
        label: 'Nightmare',
        detail: 'maximum pressure',
        color: 0xc96fff,
        levelOneSpeedMultiplier: 1.92,
        levelOneSpawnDelayMs: 330,
        minSpawnDelayMs: 110,
        waveSpeedGrowth: 0.11,
        waveSpawnStepMs: 88,
    },
};

export const DIFFICULTY_SETTING_LIST: GameDifficultySetting[] = [
    DIFFICULTY_SETTINGS.gentle,
    DIFFICULTY_SETTINGS.normal,
    DIFFICULTY_SETTINGS.speedy,
    DIFFICULTY_SETTINGS.hard,
    DIFFICULTY_SETTINGS.brutal,
    DIFFICULTY_SETTINGS.nightmare,
];

export function isGameDifficultyKey(value: string | null): value is GameDifficultyKey {
    return value === 'gentle' || value === 'normal' || value === 'speedy' || value === 'hard' || value === 'brutal' || value === 'nightmare';
}