import type Phaser from 'phaser';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'veryHard';
export type TowerKind = 'dart' | 'cannon' | 'missile' | 'laser' | 'ricochet' | 'cluster' | 'fire';
export type ProjectileKind = 'dart' | 'cannon' | 'missile' | 'ricochet' | 'cluster' | 'fragment' | 'fire';
export type ClueKind = 'definition' | 'synonym' | 'antonym';
export type ChallengeMode = 'build' | 'upgrade';
export type EnemyMotion = 'path' | 'knocked' | 'stunned' | 'returning';

export type WordEntry = {
    word: string;
    difficulty: Difficulty;
    shortDefinition: string;
    definition: string;
    synonyms: string[];
    antonyms: string[];
};

export type Point = {
    x: number;
    y: number;
};

export type TowerDefinition = {
    kind: TowerKind;
    name: string;
    difficulty: Difficulty;
    range: number;
    cooldown: number;
    damage: number;
    color: number;
    accent: number;
    description: string;
};

export type TowerStats = {
    range: number;
    cooldown: number;
    damage: number;
    splash: number;
    speed: number;
    homing?: number;
    knockback?: number;
    stunMs?: number;
    fragments?: number;
    burnDamage?: number;
    burnDuration?: number;
    spreadRadius?: number;
    reflections?: number;
};

export type Tower = {
    id: number;
    kind: TowerKind;
    difficulty: Difficulty;
    word: WordEntry;
    clueKind: ClueKind;
    answeredWords: string[];
    col: number;
    row: number;
    x: number;
    y: number;
    level: number;
    nextFireAt: number;
    jamUntil: number;
    base: Phaser.GameObjects.Arc;
    cap: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    levelLabel: Phaser.GameObjects.Text;
    jamLabel: Phaser.GameObjects.Text;
    stars: Phaser.GameObjects.Graphics[];
};

export type Enemy = {
    id: number;
    hp: number;
    maxHp: number;
    speed: number;
    radius: number;
    mass: number;
    baseColor: number;
    waypointIndex: number;
    distanceTravelled: number;
    slowUntil: number;
    stunnedUntil: number;
    knockbackUntil: number;
    burningUntil: number;
    nextBurnTickAt: number;
    burnDamage: number;
    burnSpreadAt: number;
    burnSpreadRadius: number;
    vx: number;
    vy: number;
    motion: EnemyMotion;
    alive: boolean;
    body: Phaser.GameObjects.Arc;
    face: Phaser.GameObjects.Text;
    happyEmoji: string;
    sadEmoji: string;
    sadUntil: number;
    core: Phaser.GameObjects.Arc;
    leftEye: Phaser.GameObjects.Arc;
    rightEye: Phaser.GameObjects.Arc;
    eyeOffsetX: number;
    eyeOffsetY: number;
    healthBack: Phaser.GameObjects.Rectangle;
    healthFill: Phaser.GameObjects.Rectangle;
};

export type Projectile = {
    id: number;
    kind: ProjectileKind;
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
    damage: number;
    splash: number;
    ttl: number;
    bornAt: number;
    homing?: number;
    knockback?: number;
    stunMs?: number;
    fragments?: number;
    burnDamage?: number;
    burnDuration?: number;
    spreadRadius?: number;
    target?: Enemy;
    targetPoint?: Point;
    object: Phaser.GameObjects.Shape;
    trail?: Phaser.GameObjects.Shape;
    hasEnteredPath?: boolean;
    hitTimes: Map<number, number>;
};

export type Prompt = {
    mode: ChallengeMode;
    word: WordEntry;
    clueKind: ClueKind;
    clue: string;
    options: WordEntry[];
    col?: number;
    row?: number;
    towerKind?: TowerKind;
    tower?: Tower;
};

export type BuildSlot = {
    col: number;
    row: number;
    word: WordEntry;
    towerKind: TowerKind;
    clueKind: ClueKind;
};