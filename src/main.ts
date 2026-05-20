import Phaser from 'phaser';
import './style.css';

type Difficulty = 'easy' | 'medium' | 'hard';
type TowerKind = 'dart' | 'cannon' | 'missile' | 'laser' | 'ricochet';
type ProjectileKind = 'dart' | 'cannon' | 'missile' | 'ricochet';
type ClueKind = 'definition' | 'synonym' | 'antonym';
type ChallengeMode = 'build' | 'upgrade';
type EnemyMotion = 'path' | 'knocked' | 'stunned' | 'returning';

type WordEntry = {
    word: string;
    difficulty: Difficulty;
    shortDefinition: string;
    definition: string;
    synonyms: string[];
    antonyms: string[];
};

type Point = {
    x: number;
    y: number;
};

type TowerDefinition = {
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

type TowerStats = {
    range: number;
    cooldown: number;
    damage: number;
    splash: number;
    speed: number;
};

type Tower = {
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

type Enemy = {
    id: number;
    hp: number;
    maxHp: number;
    speed: number;
    baseColor: number;
    waypointIndex: number;
    distanceTravelled: number;
    slowUntil: number;
    stunnedUntil: number;
    knockbackUntil: number;
    vx: number;
    vy: number;
    motion: EnemyMotion;
    alive: boolean;
    body: Phaser.GameObjects.Arc;
    core: Phaser.GameObjects.Arc;
    healthBack: Phaser.GameObjects.Rectangle;
    healthFill: Phaser.GameObjects.Rectangle;
};

type Projectile = {
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
    target?: Enemy;
    targetPoint?: Point;
    object: Phaser.GameObjects.Shape;
    trail?: Phaser.GameObjects.Shape;
    hasEnteredPath?: boolean;
    hitTimes: Map<number, number>;
};

type Prompt = {
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

type BuildSlot = {
    col: number;
    row: number;
    word: WordEntry;
    towerKind: TowerKind;
    clueKind: ClueKind;
};

const SCREEN_WIDTH = 1600;
const SCREEN_HEIGHT = 1025;
const CELL_SIZE = 70;
const GRID_COLS = 18;
const GRID_ROWS = 10;
const GRID_X = 45;
const GRID_Y = 72;
const GRID_WIDTH = GRID_COLS * CELL_SIZE;
const GRID_HEIGHT = GRID_ROWS * CELL_SIZE;
const PATH_WIDTH = CELL_SIZE * 2.35;
const PLAY_BOTTOM = GRID_Y + GRID_HEIGHT;
const SIDE_X = GRID_X + GRID_WIDTH + 24;
const PANEL_Y = 812;
const MAX_TOWER_LEVEL = 4;

const VOCAB: WordEntry[] = [
    {
        word: 'brave',
        difficulty: 'easy',
        shortDefinition: 'ready to face danger',
        definition: 'Showing courage when something is difficult or scary.',
        synonyms: ['courageous', 'bold', 'fearless'],
        antonyms: ['cowardly', 'timid'],
    },
    {
        word: 'calm',
        difficulty: 'easy',
        shortDefinition: 'peaceful and not upset',
        definition: 'Not excited, nervous, angry, or upset.',
        synonyms: ['peaceful', 'relaxed', 'serene'],
        antonyms: ['agitated', 'frantic'],
    },
    {
        word: 'clever',
        difficulty: 'easy',
        shortDefinition: 'quick to understand',
        definition: 'Able to learn, understand, or solve things quickly.',
        synonyms: ['smart', 'bright', 'sharp'],
        antonyms: ['dull', 'foolish'],
    },
    {
        word: 'honest',
        difficulty: 'easy',
        shortDefinition: 'truthful and fair',
        definition: 'Telling the truth and acting fairly.',
        synonyms: ['truthful', 'sincere', 'fair'],
        antonyms: ['dishonest', 'deceitful'],
    },
    {
        word: 'swift',
        difficulty: 'easy',
        shortDefinition: 'moving very fast',
        definition: 'Happening or moving quickly.',
        synonyms: ['quick', 'rapid', 'speedy'],
        antonyms: ['slow', 'sluggish'],
    },
    {
        word: 'sturdy',
        difficulty: 'easy',
        shortDefinition: 'strong and solid',
        definition: 'Strongly built and not easily broken.',
        synonyms: ['strong', 'tough', 'solid'],
        antonyms: ['weak', 'flimsy'],
    },
    {
        word: 'resilient',
        difficulty: 'medium',
        shortDefinition: 'able to recover',
        definition: 'Able to become strong or successful again after trouble.',
        synonyms: ['tough', 'adaptable', 'hardy'],
        antonyms: ['fragile', 'delicate'],
    },
    {
        word: 'scarce',
        difficulty: 'medium',
        shortDefinition: 'hard to find',
        definition: 'Not enough for demand; rare or in short supply.',
        synonyms: ['rare', 'limited', 'sparse'],
        antonyms: ['abundant', 'plentiful'],
    },
    {
        word: 'nimble',
        difficulty: 'medium',
        shortDefinition: 'quick and light in movement',
        definition: 'Able to move quickly, lightly, and easily.',
        synonyms: ['agile', 'spry', 'quick'],
        antonyms: ['clumsy', 'awkward'],
    },
    {
        word: 'frugal',
        difficulty: 'medium',
        shortDefinition: 'careful with money',
        definition: 'Careful about spending money or using resources.',
        synonyms: ['thrifty', 'economical', 'sparing'],
        antonyms: ['wasteful', 'extravagant'],
    },
    {
        word: 'precise',
        difficulty: 'medium',
        shortDefinition: 'exact and accurate',
        definition: 'Very exact, careful, and accurate.',
        synonyms: ['exact', 'accurate', 'careful'],
        antonyms: ['vague', 'inexact'],
    },
    {
        word: 'hostile',
        difficulty: 'medium',
        shortDefinition: 'unfriendly or opposed',
        definition: 'Very unfriendly or strongly against something.',
        synonyms: ['unfriendly', 'aggressive', 'opposed'],
        antonyms: ['friendly', 'welcoming'],
    },
    {
        word: 'ephemeral',
        difficulty: 'hard',
        shortDefinition: 'lasting briefly',
        definition: 'Lasting for only a very short time.',
        synonyms: ['brief', 'fleeting', 'transient'],
        antonyms: ['permanent', 'enduring'],
    },
    {
        word: 'austere',
        difficulty: 'hard',
        shortDefinition: 'plain or strict',
        definition: 'Severe, plain, and without comfort or decoration.',
        synonyms: ['severe', 'plain', 'stern'],
        antonyms: ['lavish', 'ornate'],
    },
    {
        word: 'ambiguous',
        difficulty: 'hard',
        shortDefinition: 'having more than one meaning',
        definition: 'Open to more than one interpretation; not clear.',
        synonyms: ['unclear', 'vague', 'equivocal'],
        antonyms: ['clear', 'obvious'],
    },
    {
        word: 'meticulous',
        difficulty: 'hard',
        shortDefinition: 'extremely careful',
        definition: 'Showing great attention to every detail.',
        synonyms: ['careful', 'thorough', 'painstaking'],
        antonyms: ['careless', 'sloppy'],
    },
    {
        word: 'obstinate',
        difficulty: 'hard',
        shortDefinition: 'stubbornly refusing to change',
        definition: 'Stubbornly holding to an opinion or course of action.',
        synonyms: ['stubborn', 'unyielding', 'headstrong'],
        antonyms: ['flexible', 'compliant'],
    },
    {
        word: 'volatile',
        difficulty: 'hard',
        shortDefinition: 'likely to change suddenly',
        definition: 'Likely to change suddenly and unpredictably.',
        synonyms: ['unstable', 'changeable', 'explosive'],
        antonyms: ['stable', 'steady'],
    },
];

const TOWER_DEFS: Record<TowerKind, TowerDefinition> = {
    dart: {
        kind: 'dart',
        name: 'Dart',
        difficulty: 'easy',
        range: 178,
        cooldown: 430,
        damage: 15,
        color: 0x5cc8ff,
        accent: 0xfff17a,
        description: 'fast shots',
    },
    cannon: {
        kind: 'cannon',
        name: 'Cannon',
        difficulty: 'easy',
        range: 158,
        cooldown: 1120,
        damage: 25,
        color: 0xff9f43,
        accent: 0xffdd99,
        description: 'bomb knockback',
    },
    missile: {
        kind: 'missile',
        name: 'Missile',
        difficulty: 'medium',
        range: 210,
        cooldown: 980,
        damage: 26,
        color: 0x8dd15f,
        accent: 0xd8ff8c,
        description: 'homing scatter',
    },
    laser: {
        kind: 'laser',
        name: 'Laser',
        difficulty: 'medium',
        range: 225,
        cooldown: 720,
        damage: 18,
        color: 0x65f4e8,
        accent: 0xffffff,
        description: 'beam pierce',
    },
    ricochet: {
        kind: 'ricochet',
        name: 'Ricochet',
        difficulty: 'hard',
        range: 230,
        cooldown: 1120,
        damage: 20,
        color: 0xc46bff,
        accent: 0xff86f7,
        description: 'bouncing chaos',
    },
};

const TOWER_KINDS_BY_DIFFICULTY: Record<Difficulty, TowerKind[]> = {
    easy: ['dart', 'cannon'],
    medium: ['missile', 'laser'],
    hard: ['ricochet'],
};

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function choose<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function formatDifficulty(difficulty: Difficulty): string {
    return difficulty[0].toUpperCase() + difficulty.slice(1);
}

function difficultyColor(difficulty: Difficulty): number {
    if (difficulty === 'easy') {
        return 0x53c67a;
    }
    if (difficulty === 'medium') {
        return 0xf0a33a;
    }
    return 0xe35b5b;
}

function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

function difficultyEmoji(difficulty: Difficulty): string {
    if (difficulty === 'easy') {
        return '🟢';
    }
    if (difficulty === 'medium') {
        return '🟠';
    }
    return '🔴';
}

function clueLabel(clueKind: ClueKind): string {
    if (clueKind === 'definition') {
        return '📖 definition';
    }
    if (clueKind === 'synonym') {
        return '🔁 synonym';
    }
    return '🔄 antonym';
}

function towerIcon(kind: TowerKind): string {
    if (kind === 'dart') {
        return '🎯';
    }
    if (kind === 'cannon') {
        return '💣';
    }
    if (kind === 'missile') {
        return '🚀';
    }
    if (kind === 'laser') {
        return '🔦';
    }
    return '🌀';
}

function projectPointToSegment(point: Point, start: Point, end: Point): { point: Point; distance: number; t: number } {
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

function normalize(dx: number, dy: number): Point {
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
}

class GameScene extends Phaser.Scene {
    private pathPoints: Point[] = [];
    private pathLengths: number[] = [];
    private pathTotalLength = 0;
    private pathCells = new Set<string>();
    private buildSlots = new Map<string, BuildSlot>();
    private towers: Tower[] = [];
    private enemies: Enemy[] = [];
    private projectiles: Projectile[] = [];
    private nextTowerId = 1;
    private nextEnemyId = 1;
    private nextProjectileId = 1;
    private lives = 20;
    private wave = 1;
    private spawnRemaining = 10;
    private spawnDelay = 900;
    private nextSpawnAt = 600;
    private currentPrompt: Prompt | undefined;
    private gameOver = false;
    private hudText!: Phaser.GameObjects.Text;
    private selectedText!: Phaser.GameObjects.Text;
    private promptText!: Phaser.GameObjects.Text;
    private promptStatusText!: Phaser.GameObjects.Text;
    private waveText!: Phaser.GameObjects.Text;
    private hoverCell!: Phaser.GameObjects.Rectangle;
    private hoverPopupText!: Phaser.GameObjects.Text;
    private restartButton!: Phaser.GameObjects.Rectangle;
    private optionButtons: Array<{ bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; word?: WordEntry }> = [];

    constructor() {
        super('game');
    }

    create(): void {
        this.cameras.main.setBackgroundColor('#08181b');
        this.buildPath();
        this.assignBuildSlotWords();
        this.drawArena();
        this.createHud();
        this.createPromptPanel();
        this.createRestartButton();

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.handleBoardClick(pointer.x, pointer.y, this.time.now);
        });

        this.setPromptStatus('Click a colored build square, answer its four-word clue, and the square deploys its preset tower. Click built towers to upgrade.');
        this.updateHud();
    }

    update(time: number, delta: number): void {
        this.updateHoverCell();
        this.updateTowerJams(time);

        if (this.gameOver) {
            return;
        }

        this.updateSpawning(time);
        this.updateEnemies(time, delta);
        this.updateTowers(time);
        this.updateProjectiles(time, delta);
        this.updateHud();
    }

    private buildPath(): void {
        this.pathPoints = [
            { x: GRID_X - CELL_SIZE, y: GRID_Y + CELL_SIZE * 1.45 },
            { x: GRID_X + CELL_SIZE * 4.25, y: GRID_Y + CELL_SIZE * 1.45 },
            { x: GRID_X + CELL_SIZE * 4.25, y: GRID_Y + CELL_SIZE * 7.35 },
            { x: GRID_X + CELL_SIZE * 9.4, y: GRID_Y + CELL_SIZE * 7.35 },
            { x: GRID_X + CELL_SIZE * 9.4, y: GRID_Y + CELL_SIZE * 3.25 },
            { x: GRID_X + CELL_SIZE * 14.2, y: GRID_Y + CELL_SIZE * 3.25 },
            { x: GRID_X + CELL_SIZE * 14.2, y: GRID_Y + CELL_SIZE * 8.35 },
            { x: GRID_X + CELL_SIZE * 18.75, y: GRID_Y + CELL_SIZE * 8.35 },
        ];

        this.pathLengths = [];
        this.pathTotalLength = 0;
        for (let index = 0; index < this.pathPoints.length - 1; index += 1) {
            const segmentLength = distance(this.pathPoints[index], this.pathPoints[index + 1]);
            this.pathLengths.push(segmentLength);
            this.pathTotalLength += segmentLength;
        }

        this.pathCells.clear();
        for (let row = 0; row < GRID_ROWS; row += 1) {
            for (let col = 0; col < GRID_COLS; col += 1) {
                const center = this.cellCenter(col, row);
                if (this.nearestPathPoint(center).distance <= PATH_WIDTH / 2 + 6) {
                    this.pathCells.add(this.cellKey(col, row));
                }
            }
        }
    }

    private assignBuildSlotWords(): void {
        this.buildSlots.clear();
        const pools: Record<Difficulty, WordEntry[]> = {
            easy: VOCAB.filter((entry) => entry.difficulty === 'easy'),
            medium: VOCAB.filter((entry) => entry.difficulty === 'medium'),
            hard: VOCAB.filter((entry) => entry.difficulty === 'hard'),
        };

        for (let row = 0; row < GRID_ROWS; row += 1) {
            for (let col = 0; col < GRID_COLS; col += 1) {
                if (this.isPathCell(col, row)) {
                    continue;
                }

                const center = this.cellCenter(col, row);
                const nearest = this.nearestPathPoint(center);
                const progressRatio = nearest.progress / this.pathTotalLength;
                const difficulty: Difficulty = progressRatio < 0.34 ? 'easy' : progressRatio < 0.68 ? 'medium' : 'hard';
                const pool = pools[difficulty];
                const wordIndex = Math.abs(Math.floor(nearest.progress / 35) + col * 7 + row * 11) % pool.length;
                this.buildSlots.set(this.cellKey(col, row), {
                    col,
                    row,
                    word: pool[wordIndex],
                    towerKind: this.towerKindForSlot(difficulty, col, row),
                    clueKind: this.clueKindForSlot(col, row),
                });
            }
        }
    }

    private towerKindForSlot(difficulty: Difficulty, col: number, row: number): TowerKind {
        const kinds = TOWER_KINDS_BY_DIFFICULTY[difficulty];
        return kinds[Math.abs(col * 5 + row * 3) % kinds.length];
    }

    private clueKindForSlot(col: number, row: number): ClueKind {
        const clueKinds: ClueKind[] = ['definition', 'synonym', 'antonym'];
        return clueKinds[Math.abs(col * 2 + row * 5) % clueKinds.length];
    }

    private drawArena(): void {
        const backdrop = this.add.graphics();
        backdrop.fillStyle(0x071114, 1);
        backdrop.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        backdrop.fillStyle(0x0e2a2e, 1);
        backdrop.fillRoundedRect(GRID_X - 12, GRID_Y - 12, GRID_WIDTH + 24, GRID_HEIGHT + 24, 12);

        const path = this.add.graphics();
        path.lineStyle(PATH_WIDTH + 22, 0x18373c, 1);
        this.strokePath(path);
        path.lineStyle(PATH_WIDTH, 0x2f4f55, 1);
        this.strokePath(path);
        path.lineStyle(6, 0xd3f4ee, 0.12);
        this.strokePath(path);

        const grid = this.add.graphics();
        for (let row = 0; row < GRID_ROWS; row += 1) {
            for (let col = 0; col < GRID_COLS; col += 1) {
                const x = GRID_X + col * CELL_SIZE;
                const y = GRID_Y + row * CELL_SIZE;
                const isPath = this.isPathCell(col, row);
                if (!isPath) {
                    grid.fillStyle(0x113034, 0.78);
                    grid.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                    const slot = this.buildSlots.get(this.cellKey(col, row));
                    if (slot) {
                        grid.fillStyle(difficultyColor(slot.word.difficulty), 0.12);
                        grid.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                        grid.fillStyle(difficultyColor(slot.word.difficulty), 0.3);
                        grid.fillCircle(x + CELL_SIZE - 10, y + 10, 4);
                        grid.lineStyle(1, difficultyColor(slot.word.difficulty), 0.34);
                        grid.strokeCircle(x + CELL_SIZE - 10, y + 10, 7);
                    }
                }
                grid.lineStyle(1, isPath ? 0x9bded5 : 0x456469, isPath ? 0.1 : 0.24);
                grid.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }

        const entry = this.add.text(GRID_X + 6, GRID_Y + 4, 'SPAWN', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#b9fff3',
            fontStyle: 'bold',
        });
        entry.setDepth(3);
        const exit = this.add.text(GRID_X + GRID_WIDTH - 72, GRID_Y + GRID_HEIGHT - 25, 'EXIT', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#ffd1d1',
            fontStyle: 'bold',
        });
        exit.setDepth(3);

        this.hoverCell = this.add.rectangle(0, 0, CELL_SIZE - 6, CELL_SIZE - 6, 0xffffff, 0.08);
        this.hoverCell.setStrokeStyle(2, 0xffffff, 0.35);
        this.hoverCell.setVisible(false);
        this.hoverCell.setDepth(20);

        this.hoverPopupText = this.add.text(0, 0, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: '#effffb',
            backgroundColor: 'rgba(7, 17, 20, 0.9)',
            padding: { left: 8, right: 8, top: 5, bottom: 5 },
            lineSpacing: 4,
        });
        this.hoverPopupText.setDepth(40);
        this.hoverPopupText.setVisible(false);
    }

    private strokePath(graphics: Phaser.GameObjects.Graphics): void {
        graphics.beginPath();
        graphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
        for (let index = 1; index < this.pathPoints.length; index += 1) {
            graphics.lineTo(this.pathPoints[index].x, this.pathPoints[index].y);
        }
        graphics.strokePath();
    }

    private createHud(): void {
        const side = this.add.graphics();
        side.fillStyle(0x0b2024, 0.95);
        side.fillRoundedRect(SIDE_X - 10, GRID_Y - 12, 188, GRID_HEIGHT + 24, 10);
        side.lineStyle(1, 0x7ccac1, 0.28);
        side.strokeRoundedRect(SIDE_X - 10, GRID_Y - 12, 188, GRID_HEIGHT + 24, 10);

        this.add.text(SIDE_X, GRID_Y, 'WORD LOCKS', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '18px',
            color: '#effffb',
            fontStyle: 'bold',
        });

        this.hudText = this.add.text(SIDE_X, GRID_Y + 30, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '15px',
            color: '#d3f4ee',
            lineSpacing: 6,
        });

        const legend = this.add.graphics();
        const legendItems: Array<{ difficulty: Difficulty; label: string }> = [
            { difficulty: 'easy', label: 'Easy: dart or cannon' },
            { difficulty: 'medium', label: 'Medium: missile or laser' },
            { difficulty: 'hard', label: 'Hard: ricochet' },
        ];
        legendItems.forEach((item, index) => {
            const y = GRID_Y + 104 + index * 26;
            legend.fillStyle(difficultyColor(item.difficulty), 0.22);
            legend.fillRoundedRect(SIDE_X, y, 15, 15, 3);
            legend.lineStyle(1, difficultyColor(item.difficulty), 0.7);
            legend.strokeRoundedRect(SIDE_X, y, 15, 15, 3);
            this.add.text(SIDE_X + 22, y - 1, item.label, {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12px',
                color: '#d3f4ee',
            });
        });

        this.selectedText = this.add.text(SIDE_X, GRID_Y + 198, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '13px',
            color: '#9fe9dc',
            wordWrap: { width: 160 },
            lineSpacing: 4,
        });

        this.waveText = this.add.text(SIDE_X, GRID_Y + GRID_HEIGHT - 58, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '13px',
            color: '#b9fff3',
            wordWrap: { width: 160 },
            lineSpacing: 4,
        });
    }

    private createPromptPanel(): void {
        const panel = this.add.graphics();
        panel.fillStyle(0x0d1c22, 0.98);
        panel.fillRoundedRect(24, PANEL_Y, SCREEN_WIDTH - 48, 145, 12);
        panel.lineStyle(1, 0x86e5d8, 0.36);
        panel.strokeRoundedRect(24, PANEL_Y, SCREEN_WIDTH - 48, 145, 12);

        this.promptText = this.add.text(42, PANEL_Y + 24, 'Click a colored square to reveal its clue.', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '34px',
            color: '#effffb',
            wordWrap: { width: 1040 },
            lineSpacing: 8,
        });

        this.optionButtons = [];
        for (let index = 0; index < 4; index += 1) {
            const x = 42 + index * 260 + 120;
            const y = PANEL_Y + 100;
            const bg = this.add.rectangle(x, y, 235, 38, 0x183238, 1);
            bg.setStrokeStyle(1, 0x86e5d8, 0.42);
            bg.setInteractive({ useHandCursor: true });
            bg.setVisible(false);
            const text = this.add.text(x, y, '', {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '17px',
                color: '#effffb',
                fontStyle: 'bold',
            });
            text.setOrigin(0.5);
            text.setInteractive({ useHandCursor: true });
            text.setVisible(false);

            const answer = () => {
                const option = this.optionButtons[index].word;
                if (option) {
                    this.handleChallengeAnswer(option);
                }
            };
            bg.on('pointerdown', answer);
            text.on('pointerdown', answer);
            this.optionButtons.push({ bg, text });
        }

        this.promptStatusText = this.add.text(42, PANEL_Y + 122, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '13px',
            color: '#b9c9ca',
            wordWrap: { width: 880 },
        });
    }

    private createRestartButton(): void {
        const x = SCREEN_WIDTH - 112;
        const y = PANEL_Y + 72;
        this.restartButton = this.add.rectangle(x, y, 150, 44, 0x26393f, 1);
        this.restartButton.setStrokeStyle(2, 0x9fe9dc, 0.6);
        this.restartButton.setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y, 'Restart', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '17px',
            color: '#effffb',
            fontStyle: 'bold',
        });
        text.setOrigin(0.5);
        text.setInteractive({ useHandCursor: true });
        const restart = () => this.scene.restart();
        this.restartButton.on('pointerdown', restart);
        text.on('pointerdown', restart);
    }

    private handleBoardClick(x: number, y: number, time: number): void {
        if (x < GRID_X || x > GRID_X + GRID_WIDTH || y < GRID_Y || y > GRID_Y + GRID_HEIGHT) {
            return;
        }

        const col = Math.floor((x - GRID_X) / CELL_SIZE);
        const row = Math.floor((y - GRID_Y) / CELL_SIZE);
        const tower = this.towers.find((candidate) => candidate.col === col && candidate.row === row);

        if (tower) {
            this.startUpgradeChallenge(tower, time);
            return;
        }

        if (this.gameOver) {
            return;
        }

        if (!this.isBuildableCell(col, row)) {
            this.flashCell(col, row, 0xff5c6c);
            this.setPromptStatus('That square is part of the wide path. Build on the darker grid cells.');
            return;
        }

        this.startBuildChallenge(col, row);
    }

    private startBuildChallenge(col: number, row: number): void {
        const slot = this.buildSlots.get(this.cellKey(col, row));
        if (!slot) {
            this.flashCell(col, row, 0xff5c6c);
            this.setPromptStatus('That position does not have a word lock. Pick a marked build cell.');
            return;
        }

        const towerKind = slot.towerKind;
        this.currentPrompt = this.createChallenge({
            mode: 'build',
            word: slot.word,
            clueKind: slot.clueKind,
            col,
            row,
            towerKind,
        });
        this.flashCell(col, row, difficultyColor(slot.word.difficulty));
        this.renderChallenge();
    }

    private startUpgradeChallenge(tower: Tower, time: number): void {
        if (tower.jamUntil > time) {
            this.setPromptStatus(`${tower.word.word} is still jammed. Let it reboot before upgrading.`);
            this.pulseTower(tower, 0xff5c6c, 0.2);
            return;
        }

        if (tower.level >= MAX_TOWER_LEVEL) {
            this.setPromptStatus(`${tower.word.word} is already at level ${MAX_TOWER_LEVEL}.`);
            this.pulseTower(tower, 0xffe38a, 0.22);
            this.floatingText(tower.x, tower.y - 42, 'MAX LEVEL', '#ffe38a');
            return;
        }

        this.currentPrompt = this.createChallenge({
            mode: 'upgrade',
            word: tower.word,
            clueKind: tower.clueKind,
            tower,
        });
        this.pulseTower(tower, difficultyColor(tower.word.difficulty), 0.22);
        this.renderChallenge();
    }

    private createChallenge(challenge: Omit<Prompt, 'clue' | 'options'>): Prompt {
        return {
            ...challenge,
            clue: this.makeClue(challenge.word, challenge.clueKind),
            options: this.makeAnswerOptions(challenge.word),
        };
    }

    private makeAnswerOptions(word: WordEntry): WordEntry[] {
        const sameDifficulty = shuffle(VOCAB.filter((entry) => entry.difficulty === word.difficulty && entry.word !== word.word));
        const fallback = shuffle(VOCAB.filter((entry) => entry.difficulty !== word.difficulty && entry.word !== word.word));
        return shuffle([word, ...sameDifficulty.slice(0, 3), ...fallback].slice(0, 4));
    }

    private renderChallenge(): void {
        if (!this.currentPrompt) {
            this.hideAnswerOptions();
            return;
        }

        const challenge = this.currentPrompt;
        if (challenge.mode === 'build') {
            const def = TOWER_DEFS[challenge.towerKind ?? 'dart'];
            this.promptText.setText(challenge.clue);
            this.setPromptStatus(`${towerIcon(def.kind)} ${def.name} • choose the matching word to place it.`);
        } else {
            const def = challenge.tower ? TOWER_DEFS[challenge.tower.kind] : undefined;
            this.promptText.setText(challenge.clue);
            this.setPromptStatus(`${def ? `${towerIcon(def.kind)} ${def.name} • ` : ''}choose the matching word to upgrade. Wrong answer jams it briefly.`);
        }

        this.optionButtons.forEach((button, index) => {
            const option = challenge.options[index];
            button.word = option;
            button.text.setText(option.word);
            button.text.setVisible(true);
            button.bg.setVisible(true);
            button.bg.setFillStyle(0x183238, 1);
            button.bg.setStrokeStyle(2, difficultyColor(option.difficulty), 0.55);
        });
    }

    private handleChallengeAnswer(option: WordEntry): void {
        const challenge = this.currentPrompt;
        if (!challenge) {
            return;
        }

        const correct = option.word === challenge.word.word;
        if (!correct) {
            this.handleWrongChallengeAnswer(challenge, option);
            return;
        }

        if (challenge.mode === 'build') {
            if (challenge.col === undefined || challenge.row === undefined || !challenge.towerKind) {
                this.clearChallenge('That build challenge expired. Click a build cell to try again.');
                return;
            }

            const occupied = this.towers.some((tower) => tower.col === challenge.col && tower.row === challenge.row);
            if (occupied || !this.isBuildableCell(challenge.col, challenge.row)) {
                this.clearChallenge('That position is no longer available. Pick another build cell.');
                return;
            }

            const tower = this.placeTower(challenge.col, challenge.row, challenge.towerKind, challenge.word, challenge.clueKind);
            this.clearChallenge(`Correct: ${challenge.word.word}. ${TOWER_DEFS[challenge.towerKind].name} deployed with a new word.`);
            if (tower) {
                this.pulseTower(tower, TOWER_DEFS[tower.kind].accent, 0.18);
            }
            return;
        }

        if (challenge.tower) {
            this.upgradeTower(challenge.tower, challenge.word);
            this.clearChallenge(`Correct: ${challenge.word.word}. Upgraded to level ${challenge.tower.level}; new word loaded.`);
        }
    }

    private handleWrongChallengeAnswer(challenge: Prompt, option: WordEntry): void {
        if (challenge.mode === 'build') {
            if (challenge.col !== undefined && challenge.row !== undefined) {
                this.flashCell(challenge.col, challenge.row, 0xff5c6c);
                const center = this.cellCenter(challenge.col, challenge.row);
                this.floatingText(center.x, center.y - 18, 'NO TOWER', '#ffb3bb');
            }
            this.clearChallenge(`Wrong: ${option.word}. No tower deployed. Click the position again for another attempt.`);
            return;
        }

        if (challenge.tower) {
            challenge.tower.jamUntil = this.time.now + 2600;
            this.wrongAnswerEffect(challenge.tower);
        }
        this.clearChallenge(`Wrong: ${option.word}. The tower is jammed for a moment.`);
    }

    private clearChallenge(message: string): void {
        this.currentPrompt = undefined;
        this.hideAnswerOptions();
        this.promptText.setText(message);
        this.setPromptStatus('Click a colored build square to earn placement, or click a built tower to attempt its next upgrade.');
    }

    private hideAnswerOptions(): void {
        this.optionButtons.forEach((button) => {
            button.word = undefined;
            button.bg.setVisible(false);
            button.text.setVisible(false);
        });
    }

    private placeTower(col: number, row: number, kind: TowerKind, answeredWord: WordEntry, clueKind: ClueKind): Tower | undefined {
        const def = TOWER_DEFS[kind];
        const word = this.nextTowerWord(def.difficulty, [answeredWord.word]);

        const center = this.cellCenter(col, row);
        const base = this.add.circle(center.x, center.y, 20, def.color, 0.88);
        base.setStrokeStyle(3, 0xf5fffd, 0.7);
        base.setDepth(8);
        const cap = this.add.circle(center.x, center.y, 8, def.accent, 1);
        cap.setDepth(9);
        const label = this.add.text(center.x, center.y + 24, word.word, {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: word.word.length > 8 ? '10px' : '12px',
            color: '#effffb',
            fontStyle: 'bold',
            backgroundColor: 'rgba(7, 17, 20, 0.74)',
            padding: { left: 3, right: 3, top: 1, bottom: 1 },
        });
        label.setOrigin(0.5);
        label.setDepth(12);
        const levelLabel = this.add.text(center.x + 17, center.y - 18, '1', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#081114',
            fontStyle: 'bold',
            backgroundColor: '#effffb',
            padding: { left: 4, right: 4, top: 1, bottom: 1 },
        });
        levelLabel.setOrigin(0.5);
        levelLabel.setDepth(13);
        const jamLabel = this.add.text(center.x, center.y - 34, 'JAM', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#ffdee1',
            fontStyle: 'bold',
            backgroundColor: 'rgba(130, 18, 32, 0.9)',
            padding: { left: 4, right: 4, top: 1, bottom: 1 },
        });
        jamLabel.setOrigin(0.5);
        jamLabel.setDepth(15);
        jamLabel.setVisible(false);

        const tower: Tower = {
            id: this.nextTowerId,
            kind: def.kind,
            difficulty: def.difficulty,
            word,
            clueKind,
            answeredWords: [answeredWord.word, word.word],
            col,
            row,
            x: center.x,
            y: center.y,
            level: 1,
            nextFireAt: this.time.now + Phaser.Math.Between(80, 450),
            jamUntil: 0,
            base,
            cap,
            label,
            levelLabel,
            jamLabel,
            stars: [],
        };
        this.nextTowerId += 1;
        this.towers.push(tower);
        this.pulseTower(tower, def.accent);
        this.updateTowerStars(tower);
        this.setPromptStatus(`${def.name} tower built. Next word: "${word.word}".`);
        this.updateHud();
        return tower;
    }

    private upgradeTower(tower: Tower, answeredWord: WordEntry): void {
        if (tower.level >= MAX_TOWER_LEVEL) {
            this.setPromptStatus(`${tower.word.word} is already at level ${MAX_TOWER_LEVEL}.`);
            this.pulseTower(tower, 0xffe38a, 0.22);
            return;
        }

        tower.level += 1;
        tower.levelLabel.setText(String(tower.level));
        tower.nextFireAt = Math.min(tower.nextFireAt, this.time.now + 150);
        this.advanceTowerWord(tower, answeredWord);
        this.updateTowerStars(tower);
        this.correctAnswerEffect(tower);
    }

    private advanceTowerWord(tower: Tower, answeredWord: WordEntry): void {
        if (!tower.answeredWords.includes(answeredWord.word)) {
            tower.answeredWords.push(answeredWord.word);
        }
        const nextWord = this.nextTowerWord(tower.difficulty, tower.answeredWords);
        tower.word = nextWord;
        tower.answeredWords.push(nextWord.word);
        tower.label.setText(nextWord.word);
        tower.label.setFontSize(nextWord.word.length > 8 ? 10 : 12);
    }

    private nextTowerWord(difficulty: Difficulty, avoidWords: string[]): WordEntry {
        const pool = VOCAB.filter((entry) => entry.difficulty === difficulty);
        const unused = shuffle(pool.filter((entry) => !avoidWords.includes(entry.word)));
        if (unused.length > 0) {
            return unused[0];
        }
        const current = avoidWords[avoidWords.length - 1];
        return shuffle(pool.filter((entry) => entry.word !== current))[0] ?? pool[0];
    }

    private updateTowerStars(tower: Tower): void {
        tower.stars.forEach((star) => star.destroy());
        tower.stars = [];

        for (let index = 0; index < tower.level; index += 1) {
            const star = this.add.graphics();
            const x = tower.x - 15 + index * 10;
            const y = tower.y - 30;
            star.fillStyle(0xffe38a, 0.95);
            star.lineStyle(1, 0x6b4a00, 0.9);
            this.drawMiniStar(star, x, y, 4.2, 2.1);
            star.setDepth(14);
            tower.stars.push(star);
        }
    }

    private drawMiniStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, outerRadius: number, innerRadius: number): void {
        graphics.beginPath();
        for (let point = 0; point < 10; point += 1) {
            const angle = -Math.PI / 2 + point * (Math.PI / 5);
            const radius = point % 2 === 0 ? outerRadius : innerRadius;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (point === 0) {
                graphics.moveTo(px, py);
            } else {
                graphics.lineTo(px, py);
            }
        }
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
    }

    private makeClue(word: WordEntry, clueKind: ClueKind): string {
        if (clueKind === 'definition') {
            return word.shortDefinition;
        }
        if (clueKind === 'synonym') {
            return `Similar to "${choose(word.synonyms)}"`;
        }
        return `Opposite of "${choose(word.antonyms)}"`;
    }

    private updateSpawning(time: number): void {
        if (this.spawnRemaining <= 0 && this.enemies.length === 0) {
            this.wave += 1;
            this.spawnRemaining = 8 + this.wave * 3;
            this.spawnDelay = Math.max(360, 920 - this.wave * 45);
            this.nextSpawnAt = time + 1500;
            this.setPromptStatus(`Wave ${this.wave} incoming. Build or answer while you have breathing room.`);
            return;
        }

        if (this.spawnRemaining > 0 && time >= this.nextSpawnAt) {
            this.spawnEnemy();
            this.spawnRemaining -= 1;
            this.nextSpawnAt = time + this.spawnDelay;
        }
    }

    private spawnEnemy(): void {
        const point = this.pathPoints[0];
        const waveBoost = Math.max(0, this.wave - 1);
        const variantRoll = Phaser.Math.Between(1, 10);
        const runner = variantRoll <= 2;
        const brute = variantRoll >= 9;
        const hp = (runner ? 36 : brute ? 86 : 54) + waveBoost * (runner ? 9 : brute ? 21 : 14);
        const speed = (runner ? 76 : brute ? 40 : 56) + waveBoost * 2.5;
        const color = runner ? 0xffef73 : brute ? 0xff6f61 : 0xff9bb2;

        const body = this.add.circle(point.x, point.y, brute ? 15 : runner ? 10 : 12, color, 1);
        body.setStrokeStyle(2, 0x071114, 0.8);
        body.setDepth(6);
        const core = this.add.circle(point.x, point.y, brute ? 6 : 4, 0xffffff, 0.72);
        core.setDepth(7);
        const healthBack = this.add.rectangle(point.x, point.y - 22, 28, 4, 0x14191c, 1);
        healthBack.setDepth(7);
        const healthFill = this.add.rectangle(point.x - 14, point.y - 22, 28, 4, 0x74ff9b, 1);
        healthFill.setOrigin(0, 0.5);
        healthFill.setDepth(8);

        this.enemies.push({
            id: this.nextEnemyId,
            hp,
            maxHp: hp,
            speed,
            baseColor: color,
            waypointIndex: 0,
            distanceTravelled: 0,
            slowUntil: 0,
            stunnedUntil: 0,
            knockbackUntil: 0,
            vx: 0,
            vy: 0,
            motion: 'path',
            alive: true,
            body,
            core,
            healthBack,
            healthFill,
        });
        this.nextEnemyId += 1;
    }

    private updateEnemies(time: number, delta: number): void {
        const deltaSeconds = delta / 1000;
        for (const enemy of [...this.enemies]) {
            if (!enemy.alive) {
                continue;
            }

            if (enemy.motion === 'knocked') {
                this.updateKnockedEnemy(enemy, time, deltaSeconds);
                continue;
            }

            if (enemy.motion === 'stunned') {
                this.updateStunnedEnemy(enemy, time);
                continue;
            }

            if (enemy.motion === 'returning') {
                this.updateReturningEnemy(enemy, deltaSeconds);
                continue;
            }

            const speed = enemy.speed * (enemy.slowUntil > time ? 0.5 : 1);
            enemy.distanceTravelled += speed * deltaSeconds;

            if (enemy.distanceTravelled >= this.pathTotalLength) {
                this.lives -= 1;
                this.leakEnemy(enemy);
                if (this.lives <= 0) {
                    this.endGame();
                }
            } else {
                const pathPosition = this.pointAtPathProgress(enemy.distanceTravelled);
                enemy.waypointIndex = pathPosition.segmentIndex;
                this.setEnemyPosition(enemy, pathPosition.point.x, pathPosition.point.y);
                this.updateEnemyHealthBar(enemy);
            }
        }
    }

    private updateKnockedEnemy(enemy: Enemy, time: number, deltaSeconds: number): void {
        const nextX = enemy.body.x + enemy.vx * deltaSeconds;
        const nextY = enemy.body.y + enemy.vy * deltaSeconds;
        this.setEnemyPosition(enemy, clamp(nextX, GRID_X - 24, GRID_X + GRID_WIDTH + 24), clamp(nextY, GRID_Y - 24, PLAY_BOTTOM + 24));

        const damping = Math.pow(0.08, deltaSeconds);
        enemy.vx *= damping;
        enemy.vy *= damping;
        enemy.body.setFillStyle(0xfff2a8, 1);
        this.spawnSmoke(enemy.body.x, enemy.body.y, 0xffdd99, 0.25);

        const velocity = Math.hypot(enemy.vx, enemy.vy);
        if (time >= enemy.knockbackUntil || velocity < 30) {
            enemy.motion = time < enemy.stunnedUntil ? 'stunned' : 'returning';
            enemy.body.setFillStyle(enemy.motion === 'stunned' ? 0xaee8ff : 0xffd49a, 1);
            if (enemy.motion === 'stunned') {
                this.floatingText(enemy.body.x, enemy.body.y - 26, 'STUN', '#bdefff');
            }
        }

        this.updateEnemyHealthBar(enemy);
    }

    private updateStunnedEnemy(enemy: Enemy, time: number): void {
        enemy.body.setFillStyle(0xaee8ff, 0.9 + Math.sin(time / 80) * 0.1);
        enemy.core.setScale(1 + Math.sin(time / 70) * 0.15);
        if (time >= enemy.stunnedUntil) {
            enemy.core.setScale(1);
            enemy.motion = 'returning';
            enemy.body.setFillStyle(0xffd49a, 1);
        }
        this.updateEnemyHealthBar(enemy);
    }

    private updateReturningEnemy(enemy: Enemy, deltaSeconds: number): void {
        const nearest = this.nearestPathPoint({ x: enemy.body.x, y: enemy.body.y });
        const returnSpeed = enemy.speed * 1.55;
        const gap = distance({ x: enemy.body.x, y: enemy.body.y }, nearest.point);

        if (gap <= returnSpeed * deltaSeconds + 2) {
            enemy.distanceTravelled = nearest.progress;
            enemy.waypointIndex = nearest.segmentIndex;
            enemy.motion = 'path';
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.core.setScale(1);
            enemy.body.setFillStyle(enemy.baseColor, 1);
            this.setEnemyPosition(enemy, nearest.point.x, nearest.point.y);
            this.spark(nearest.point.x, nearest.point.y, 0xb9fff3, 5);
        } else {
            const direction = normalize(nearest.point.x - enemy.body.x, nearest.point.y - enemy.body.y);
            this.setEnemyPosition(enemy, enemy.body.x + direction.x * returnSpeed * deltaSeconds, enemy.body.y + direction.y * returnSpeed * deltaSeconds);
            enemy.body.setFillStyle(0xffd49a, 1);
        }

        this.updateEnemyHealthBar(enemy);
    }

    private setEnemyPosition(enemy: Enemy, x: number, y: number): void {
        enemy.body.setPosition(x, y);
        enemy.core.setPosition(x, y);
        enemy.healthBack.setPosition(x, y - 22);
        enemy.healthFill.setPosition(x - 14, y - 22);
    }

    private updateEnemyHealthBar(enemy: Enemy): void {
        const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
        enemy.healthBack.setPosition(enemy.body.x, enemy.body.y - 22);
        enemy.healthFill.setPosition(enemy.body.x - 14, enemy.body.y - 22);
        enemy.healthFill.width = 28 * ratio;
        enemy.core.setPosition(enemy.body.x, enemy.body.y);
    }

    private updateTowers(time: number): void {
        for (const tower of this.towers) {
            if (tower.jamUntil > time || time < tower.nextFireAt) {
                continue;
            }

            const stats = this.towerStats(tower);
            const target = this.findTarget(tower, stats.range);
            if (!target) {
                continue;
            }

            this.fireTower(tower, target, stats, time);
            tower.nextFireAt = time + stats.cooldown;
        }
    }

    private fireTower(tower: Tower, target: Enemy, stats: TowerStats, time: number): void {
        this.muzzlePulse(tower);
        if (tower.kind === 'laser') {
            this.fireLaser(tower, target, stats);
            return;
        }

        if (tower.kind === 'ricochet') {
            const direction = normalize(target.body.x - tower.x, target.body.y - tower.y);
            const ball = this.add.circle(tower.x, tower.y, 6 + Math.min(3, tower.level), TOWER_DEFS[tower.kind].accent, 1);
            ball.setStrokeStyle(2, 0xffffff, 0.72);
            ball.setDepth(10);
            this.projectiles.push({
                id: this.nextProjectileId,
                kind: 'ricochet',
                x: tower.x,
                y: tower.y,
                vx: direction.x * stats.speed,
                vy: direction.y * stats.speed,
                speed: stats.speed,
                damage: stats.damage,
                splash: 0,
                ttl: 3200 + tower.level * 280,
                bornAt: time,
                target,
                object: ball,
                hasEnteredPath: false,
                hitTimes: new Map<number, number>(),
            });
            this.nextProjectileId += 1;
            return;
        }

        const projectileKind: ProjectileKind = tower.kind === 'cannon' ? 'cannon' : tower.kind === 'missile' ? 'missile' : 'dart';
        const color = projectileKind === 'cannon' ? 0xffb352 : projectileKind === 'missile' ? 0xd9ff7d : 0xfff17a;
        const radius = projectileKind === 'cannon' ? 7 : projectileKind === 'missile' ? 6 : 4;
        const object = this.add.circle(tower.x, tower.y, radius, color, 1);
        object.setDepth(10);
        const direction = normalize(target.body.x - tower.x, target.body.y - tower.y);
        this.projectiles.push({
            id: this.nextProjectileId,
            kind: projectileKind,
            x: tower.x,
            y: tower.y,
            vx: direction.x * stats.speed,
            vy: direction.y * stats.speed,
            speed: stats.speed,
            damage: stats.damage,
            splash: stats.splash,
            ttl: projectileKind === 'missile' ? 3300 : 2200,
            bornAt: time,
            target,
            targetPoint: projectileKind === 'cannon' ? { x: target.body.x, y: target.body.y } : undefined,
            object,
            hitTimes: new Map<number, number>(),
        });
        this.nextProjectileId += 1;
    }

    private updateProjectiles(time: number, delta: number): void {
        const deltaSeconds = delta / 1000;
        for (const projectile of [...this.projectiles]) {
            if (time - projectile.bornAt > projectile.ttl) {
                this.removeProjectile(projectile);
                continue;
            }

            if (projectile.kind === 'missile') {
                this.updateMissile(projectile, deltaSeconds);
            } else if (projectile.kind === 'cannon') {
                this.updateCannon(projectile, deltaSeconds);
            } else if (projectile.kind === 'ricochet') {
                this.updateRicochet(projectile, time, deltaSeconds);
            } else {
                this.updateDart(projectile, deltaSeconds);
            }
        }
    }

    private updateDart(projectile: Projectile, deltaSeconds: number): void {
        const target = projectile.target;
        if (!target?.alive) {
            this.removeProjectile(projectile);
            return;
        }

        const direction = normalize(target.body.x - projectile.x, target.body.y - projectile.y);
        projectile.x += direction.x * projectile.speed * deltaSeconds;
        projectile.y += direction.y * projectile.speed * deltaSeconds;
        projectile.object.setPosition(projectile.x, projectile.y);

        if (distance(projectile, { x: target.body.x, y: target.body.y }) < 14) {
            this.damageEnemy(target, projectile.damage, 0xfff17a);
            this.knockEnemy(target, projectile, 65, 0, 0xfff17a);
            this.removeProjectile(projectile);
        }
    }

    private updateCannon(projectile: Projectile, deltaSeconds: number): void {
        const targetPoint = projectile.targetPoint ?? { x: projectile.x, y: projectile.y };
        const direction = normalize(targetPoint.x - projectile.x, targetPoint.y - projectile.y);
        const step = projectile.speed * deltaSeconds;
        projectile.x += direction.x * step;
        projectile.y += direction.y * step;
        projectile.object.setPosition(projectile.x, projectile.y);

        if (distance(projectile, targetPoint) <= step + 6) {
            this.explode(projectile.x, projectile.y, projectile.splash, projectile.damage, 0xff9f43, 380, 420);
            this.removeProjectile(projectile);
        }
    }

    private updateMissile(projectile: Projectile, deltaSeconds: number): void {
        if (!projectile.target?.alive) {
            projectile.target = this.findClosestEnemy(projectile.x, projectile.y, 260);
            if (!projectile.target) {
                this.removeProjectile(projectile);
                return;
            }
        }

        const target = projectile.target;
        const direction = normalize(target.body.x - projectile.x, target.body.y - projectile.y);
        projectile.vx += (direction.x * projectile.speed - projectile.vx) * 0.08;
        projectile.vy += (direction.y * projectile.speed - projectile.vy) * 0.08;
        const velocity = normalize(projectile.vx, projectile.vy);
        projectile.vx = velocity.x * projectile.speed;
        projectile.vy = velocity.y * projectile.speed;
        projectile.x += projectile.vx * deltaSeconds;
        projectile.y += projectile.vy * deltaSeconds;
        projectile.object.setPosition(projectile.x, projectile.y);
        projectile.object.rotation = Math.atan2(projectile.vy, projectile.vx);
        this.spawnSmoke(projectile.x - velocity.x * 9, projectile.y - velocity.y * 9, 0xb8ff8a);

        if (distance(projectile, { x: target.body.x, y: target.body.y }) < 18) {
            this.explode(projectile.x, projectile.y, projectile.splash, projectile.damage, 0xb8ff8a, 310, 280);
            this.removeProjectile(projectile);
        }
    }

    private updateRicochet(projectile: Projectile, time: number, deltaSeconds: number): void {
        projectile.x += projectile.vx * deltaSeconds;
        projectile.y += projectile.vy * deltaSeconds;
        const nearest = this.nearestPathPoint(projectile);
        const wallRadius = PATH_WIDTH / 2 - 8;

        if (!projectile.hasEnteredPath && nearest.distance <= wallRadius) {
            projectile.hasEnteredPath = true;
        }

        if (projectile.hasEnteredPath && nearest.distance > wallRadius) {
            const normal = normalize(projectile.x - nearest.point.x, projectile.y - nearest.point.y);
            projectile.x = nearest.point.x + normal.x * wallRadius;
            projectile.y = nearest.point.y + normal.y * wallRadius;
            const dot = projectile.vx * normal.x + projectile.vy * normal.y;
            projectile.vx -= 2 * dot * normal.x;
            projectile.vy -= 2 * dot * normal.y;
            this.spark(projectile.x, projectile.y, 0xff86f7, 8);
        }

        projectile.object.setPosition(projectile.x, projectile.y);
        this.spawnSmoke(projectile.x, projectile.y, 0xc46bff, 0.35);

        for (const enemy of this.enemies) {
            if (!enemy.alive) {
                continue;
            }
            const lastHit = projectile.hitTimes.get(enemy.id) ?? -Infinity;
            if (time - lastHit > 420 && distance(projectile, { x: enemy.body.x, y: enemy.body.y }) < 20) {
                projectile.hitTimes.set(enemy.id, time);
                this.damageEnemy(enemy, projectile.damage, 0xff86f7);
                this.knockEnemy(enemy, projectile, 130, 120, 0xff86f7);
                this.chainZap(projectile.x, projectile.y, enemy.body.x, enemy.body.y, 0xff86f7);
            }
        }
    }

    private fireLaser(tower: Tower, target: Enemy, stats: TowerStats): void {
        const color = TOWER_DEFS[tower.kind].accent;
        const beam = this.add.graphics();
        beam.setDepth(14);
        beam.lineStyle(9 + tower.level, color, 0.18);
        beam.beginPath();
        beam.moveTo(tower.x, tower.y);
        beam.lineTo(target.body.x, target.body.y);
        beam.strokePath();
        beam.lineStyle(3 + Math.min(4, tower.level), 0xffffff, 0.88);
        beam.beginPath();
        beam.moveTo(tower.x, tower.y);
        beam.lineTo(target.body.x, target.body.y);
        beam.strokePath();
        this.tweens.add({
            targets: beam,
            alpha: 0,
            duration: 170,
            onComplete: () => beam.destroy(),
        });

        this.damageEnemy(target, stats.damage, color);

        if (tower.level >= 2) {
            const candidates = this.enemies
                .filter((enemy) => enemy.alive && enemy.id !== target.id)
                .map((enemy) => ({ enemy, dist: this.distanceToLine({ x: enemy.body.x, y: enemy.body.y }, tower, { x: target.body.x, y: target.body.y }) }))
                .filter(({ dist }) => dist < 24 + tower.level * 4)
                .slice(0, 3);
            for (const { enemy } of candidates) {
                this.damageEnemy(enemy, stats.damage * 0.45, color);
            }
        }

        this.spark(target.body.x, target.body.y, color, 10 + tower.level * 2);
    }

    private towerStats(tower: Tower): TowerStats {
        const def = TOWER_DEFS[tower.kind];
        const level = tower.level - 1;
        const damage = Math.round(def.damage * (1 + level * 0.34));
        const range = def.range + level * 16;
        const cooldown = Math.max(180, def.cooldown * Math.pow(0.88, level));

        if (tower.kind === 'cannon') {
            return { range, cooldown, damage, splash: 62 + level * 10, speed: 315 };
        }
        if (tower.kind === 'missile') {
            return { range, cooldown, damage, splash: 58 + level * 8, speed: 245 + level * 18 };
        }
        if (tower.kind === 'ricochet') {
            return { range, cooldown, damage, splash: 0, speed: 360 + level * 26 };
        }
        if (tower.kind === 'laser') {
            return { range, cooldown, damage, splash: 0, speed: 0 };
        }
        return { range, cooldown, damage, splash: 0, speed: 465 + level * 18 };
    }

    private findTarget(tower: Tower, range: number): Enemy | undefined {
        return this.enemies
            .filter((enemy) => enemy.alive && distance(tower, { x: enemy.body.x, y: enemy.body.y }) <= range)
            .sort((a, b) => b.distanceTravelled - a.distanceTravelled)[0];
    }

    private findClosestEnemy(x: number, y: number, range: number): Enemy | undefined {
        return this.enemies
            .filter((enemy) => enemy.alive && distance({ x, y }, { x: enemy.body.x, y: enemy.body.y }) <= range)
            .sort((a, b) => distance({ x, y }, { x: a.body.x, y: a.body.y }) - distance({ x, y }, { x: b.body.x, y: b.body.y }))[0];
    }

    private damageEnemy(enemy: Enemy, damage: number, color: number): void {
        if (!enemy.alive) {
            return;
        }

        enemy.hp -= damage;
        enemy.body.setFillStyle(0xffffff, 1);
        this.time.delayedCall(55, () => {
            if (enemy.alive && enemy.motion === 'path') {
                enemy.body.setFillStyle(enemy.slowUntil > this.time.now ? 0xaee8ff : enemy.baseColor, 1);
            }
        });
        this.damageNumber(enemy.body.x, enemy.body.y - 18, Math.round(damage), color);

        if (enemy.hp <= 0) {
            this.killEnemy(enemy, color);
        } else {
            this.updateEnemyHealthBar(enemy);
        }
    }

    private explode(x: number, y: number, radius: number, damage: number, color: number, knockbackForce = 260, stunMs = 0): void {
        const ring = this.add.circle(x, y, radius * 0.25, color, 0.08);
        ring.setStrokeStyle(4, color, 0.9);
        ring.setDepth(13);
        this.tweens.add({
            targets: ring,
            radius,
            alpha: 0,
            duration: 260,
            onComplete: () => ring.destroy(),
        });
        this.spark(x, y, color, 16);

        for (const enemy of this.enemies) {
            if (!enemy.alive) {
                continue;
            }
            const dist = distance({ x, y }, { x: enemy.body.x, y: enemy.body.y });
            if (dist <= radius) {
                const falloff = 1 - dist / Math.max(1, radius);
                this.damageEnemy(enemy, damage * (0.45 + falloff * 0.75), color);
                this.knockEnemy(enemy, { x, y }, knockbackForce * (0.25 + falloff * 0.85), stunMs * falloff, color);
            }
        }
    }

    private knockEnemy(enemy: Enemy, origin: Point, force: number, stunMs: number, color: number): void {
        if (!enemy.alive) {
            return;
        }

        let away = normalize(enemy.body.x - origin.x, enemy.body.y - origin.y);
        if (away.x === 0 && away.y === 0) {
            const angle = Math.random() * Math.PI * 2;
            away = { x: Math.cos(angle), y: Math.sin(angle) };
        }
        const jitter = Phaser.Math.FloatBetween(-0.45, 0.45);
        const cos = Math.cos(jitter);
        const sin = Math.sin(jitter);
        const scatter = {
            x: away.x * cos - away.y * sin,
            y: away.x * sin + away.y * cos,
        };
        const now = this.time.now;
        enemy.vx = enemy.vx * 0.35 + scatter.x * force;
        enemy.vy = enemy.vy * 0.35 + scatter.y * force;
        enemy.motion = 'knocked';
        enemy.knockbackUntil = Math.max(enemy.knockbackUntil, now + 260 + force * 0.65);
        enemy.stunnedUntil = Math.max(enemy.stunnedUntil, now + 260 + force * 0.45 + stunMs);
        enemy.body.setFillStyle(color, 0.92);
    }

    private killEnemy(enemy: Enemy, color: number): void {
        enemy.alive = false;
        this.spark(enemy.body.x, enemy.body.y, color, 18);
        this.removeEnemy(enemy);
    }

    private leakEnemy(enemy: Enemy): void {
        this.setPromptStatus(`An enemy slipped through. Lives: ${Math.max(0, this.lives)}.`);
        this.spark(enemy.body.x, enemy.body.y, 0xff5c6c, 10);
        this.removeEnemy(enemy);
    }

    private removeEnemy(enemy: Enemy): void {
        enemy.alive = false;
        enemy.body.destroy();
        enemy.core.destroy();
        enemy.healthBack.destroy();
        enemy.healthFill.destroy();
        this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    }

    private removeProjectile(projectile: Projectile): void {
        projectile.object.destroy();
        projectile.trail?.destroy();
        this.projectiles = this.projectiles.filter((candidate) => candidate.id !== projectile.id);
    }

    private endGame(): void {
        this.gameOver = true;
        this.lives = 0;
        this.promptText.setText(`Base breached on wave ${this.wave}. Restart and try a different tower mix.`);
        this.setPromptStatus('Game over. The restart button is ready.');
        const overlay = this.add.rectangle(GRID_X + GRID_WIDTH / 2, GRID_Y + GRID_HEIGHT / 2, GRID_WIDTH, GRID_HEIGHT, 0x081114, 0.55);
        overlay.setDepth(50);
        const text = this.add.text(overlay.x, overlay.y, 'GAME OVER', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '52px',
            color: '#ffdee1',
            fontStyle: 'bold',
        });
        text.setOrigin(0.5);
        text.setDepth(51);
    }

    private updateTowerJams(time: number): void {
        for (const tower of this.towers) {
            const jammed = tower.jamUntil > time;
            tower.jamLabel.setVisible(jammed);
            tower.base.setAlpha(jammed ? 0.45 + Math.sin(time / 80) * 0.18 : 0.88);
        }
    }

    private updateHud(): void {
        this.hudText.setText(`Lives ${this.lives}\nWave ${this.wave}\nTowers ${this.towers.length}`);
        this.selectedText.setText(`Click a colored square\nto answer and place.\nClick an existing tower\nto answer and upgrade.\nLevel cap: ${MAX_TOWER_LEVEL}`);
        this.waveText.setText(`${this.spawnRemaining} enemies queued\n${this.enemies.length} enemies active\n${this.projectiles.length} projectiles live`);
    }

    private updateHoverCell(): void {
        const pointer = this.input.activePointer;
        const x = pointer.x;
        const y = pointer.y;
        if (x < GRID_X || x > GRID_X + GRID_WIDTH || y < GRID_Y || y > GRID_Y + GRID_HEIGHT) {
            this.hoverCell.setVisible(false);
            this.hoverPopupText.setVisible(false);
            return;
        }
        const col = Math.floor((x - GRID_X) / CELL_SIZE);
        const row = Math.floor((y - GRID_Y) / CELL_SIZE);
        const center = this.cellCenter(col, row);
        const tower = this.towers.find((candidate) => candidate.col === col && candidate.row === row);
        const buildable = this.isBuildableCell(col, row) && !tower;
        const slot = this.buildSlots.get(this.cellKey(col, row));
        const hoverColor = buildable && slot ? difficultyColor(slot.word.difficulty) : tower ? 0xffe38a : 0xff5c6c;
        this.hoverCell.setPosition(center.x, center.y);
        this.hoverCell.setVisible(true);
        this.hoverCell.setFillStyle(hoverColor, buildable ? 0.14 : 0.1);
        this.hoverCell.setStrokeStyle(2, hoverColor, 0.55);

        if (tower) {
            this.showHoverPopup(x, y, this.hoverTextForTower(tower));
        } else if (buildable && slot) {
            this.showHoverPopup(x, y, this.hoverTextForSlot(slot));
        } else {
            this.hoverPopupText.setVisible(false);
        }
    }

    private hoverTextForSlot(slot: BuildSlot): string {
        const def = TOWER_DEFS[slot.towerKind];
        return `${towerIcon(def.kind)} ${def.name}\n${difficultyEmoji(slot.word.difficulty)} ${formatDifficulty(slot.word.difficulty)} • ${clueLabel(slot.clueKind)}`;
    }

    private hoverTextForTower(tower: Tower): string {
        const def = TOWER_DEFS[tower.kind];
        return `${towerIcon(def.kind)} ${def.name} L${tower.level}\n${difficultyEmoji(tower.word.difficulty)} ${formatDifficulty(tower.word.difficulty)} • ${clueLabel(tower.clueKind)}`;
    }

    private showHoverPopup(pointerX: number, pointerY: number, text: string): void {
        this.hoverPopupText.setText(text);
        this.hoverPopupText.setPosition(clamp(pointerX + 16, 12, SCREEN_WIDTH - 260), clamp(pointerY + 16, 12, SCREEN_HEIGHT - 72));
        this.hoverPopupText.setVisible(true);
    }

    private flashCell(col: number, row: number, color: number): void {
        const center = this.cellCenter(col, row);
        const rect = this.add.rectangle(center.x, center.y, CELL_SIZE - 4, CELL_SIZE - 4, color, 0.28);
        rect.setDepth(19);
        this.tweens.add({
            targets: rect,
            alpha: 0,
            duration: 280,
            onComplete: () => rect.destroy(),
        });
    }

    private correctAnswerEffect(tower: Tower): void {
        const ring = this.add.circle(tower.x, tower.y, 18, 0x74ff9b, 0.05);
        ring.setStrokeStyle(4, 0x74ff9b, 0.92);
        ring.setDepth(16);
        this.tweens.add({
            targets: ring,
            radius: 64,
            alpha: 0,
            duration: 460,
            onComplete: () => ring.destroy(),
        });
        this.spark(tower.x, tower.y, 0x74ff9b, 18);
        this.floatingText(tower.x, tower.y - 42, `LEVEL ${tower.level}`, '#b9ffc9');
        this.pulseTower(tower, 0x74ff9b);
    }

    private wrongAnswerEffect(tower: Tower): void {
        const ring = this.add.circle(tower.x, tower.y, 18, 0xff5c6c, 0.06);
        ring.setStrokeStyle(4, 0xff5c6c, 0.95);
        ring.setDepth(16);
        this.tweens.add({
            targets: ring,
            radius: 50,
            alpha: 0,
            duration: 340,
            onComplete: () => ring.destroy(),
        });
        this.floatingText(tower.x, tower.y - 42, 'JAMMED', '#ffb3bb');
        this.tweens.add({
            targets: [tower.base, tower.cap],
            x: '+=4',
            yoyo: true,
            repeat: 4,
            duration: 45,
        });
    }

    private pulseTower(tower: Tower, color: number, alpha = 0.26): void {
        const ring = this.add.circle(tower.x, tower.y, 24, color, alpha);
        ring.setDepth(7);
        this.tweens.add({
            targets: ring,
            radius: 52,
            alpha: 0,
            duration: 420,
            onComplete: () => ring.destroy(),
        });
    }

    private muzzlePulse(tower: Tower): void {
        const def = TOWER_DEFS[tower.kind];
        this.tweens.add({
            targets: tower.cap,
            scale: 1.45,
            yoyo: true,
            duration: 70,
        });
        const dot = this.add.circle(tower.x, tower.y, 5, def.accent, 0.86);
        dot.setDepth(11);
        this.tweens.add({
            targets: dot,
            radius: 18,
            alpha: 0,
            duration: 160,
            onComplete: () => dot.destroy(),
        });
    }

    private spark(x: number, y: number, color: number, count: number): void {
        for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(24, 92);
            const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(1.6, 3.6), color, 0.9);
            dot.setDepth(18);
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.2,
                duration: Phaser.Math.Between(220, 520),
                onComplete: () => dot.destroy(),
            });
        }
    }

    private spawnSmoke(x: number, y: number, color: number, alpha = 0.45): void {
        if (Math.random() > 0.45) {
            return;
        }
        const puff = this.add.circle(x, y, Phaser.Math.FloatBetween(2, 5), color, alpha);
        puff.setDepth(4);
        this.tweens.add({
            targets: puff,
            radius: Phaser.Math.FloatBetween(8, 15),
            alpha: 0,
            duration: 260,
            onComplete: () => puff.destroy(),
        });
    }

    private chainZap(x1: number, y1: number, x2: number, y2: number, color: number): void {
        const zap = this.add.graphics();
        zap.setDepth(15);
        zap.lineStyle(3, color, 0.8);
        zap.beginPath();
        zap.moveTo(x1, y1);
        const midX = (x1 + x2) / 2 + Phaser.Math.Between(-8, 8);
        const midY = (y1 + y2) / 2 + Phaser.Math.Between(-8, 8);
        zap.lineTo(midX, midY);
        zap.lineTo(x2, y2);
        zap.strokePath();
        this.tweens.add({
            targets: zap,
            alpha: 0,
            duration: 130,
            onComplete: () => zap.destroy(),
        });
    }

    private damageNumber(x: number, y: number, value: number, color: number): void {
        const text = this.add.text(x, y, String(value), {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: Phaser.Display.Color.IntegerToColor(color).rgba,
            fontStyle: 'bold',
        });
        text.setOrigin(0.5);
        text.setDepth(19);
        this.tweens.add({
            targets: text,
            y: y - 18,
            alpha: 0,
            duration: 460,
            onComplete: () => text.destroy(),
        });
    }

    private floatingText(x: number, y: number, value: string, color: string): void {
        const text = this.add.text(x, y, value, {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color,
            fontStyle: 'bold',
        });
        text.setOrigin(0.5);
        text.setDepth(20);
        this.tweens.add({
            targets: text,
            y: y - 24,
            alpha: 0,
            duration: 700,
            onComplete: () => text.destroy(),
        });
    }

    private setPromptStatus(value: string): void {
        this.promptStatusText.setText(value);
    }

    private cellCenter(col: number, row: number): Point {
        return {
            x: GRID_X + col * CELL_SIZE + CELL_SIZE / 2,
            y: GRID_Y + row * CELL_SIZE + CELL_SIZE / 2,
        };
    }

    private cellKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    private isPathCell(col: number, row: number): boolean {
        return this.pathCells.has(this.cellKey(col, row));
    }

    private isBuildableCell(col: number, row: number): boolean {
        return col >= 0 && row >= 0 && col < GRID_COLS && row < GRID_ROWS && !this.isPathCell(col, row);
    }

    private pointAtPathProgress(progress: number): { point: Point; segmentIndex: number } {
        let remaining = clamp(progress, 0, this.pathTotalLength);
        for (let index = 0; index < this.pathPoints.length - 1; index += 1) {
            const segmentLength = this.pathLengths[index];
            if (remaining <= segmentLength) {
                const start = this.pathPoints[index];
                const end = this.pathPoints[index + 1];
                const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;
                return {
                    point: {
                        x: start.x + (end.x - start.x) * ratio,
                        y: start.y + (end.y - start.y) * ratio,
                    },
                    segmentIndex: index,
                };
            }
            remaining -= segmentLength;
        }

        return { point: this.pathPoints[this.pathPoints.length - 1], segmentIndex: this.pathPoints.length - 2 };
    }

    private nearestPathPoint(point: Point): { point: Point; distance: number; segmentIndex: number; progress: number } {
        let best = { point: this.pathPoints[0], distance: Infinity, segmentIndex: 0, progress: 0 };
        let distanceBeforeSegment = 0;
        for (let index = 0; index < this.pathPoints.length - 1; index += 1) {
            const projection = projectPointToSegment(point, this.pathPoints[index], this.pathPoints[index + 1]);
            if (projection.distance < best.distance) {
                best = {
                    point: projection.point,
                    distance: projection.distance,
                    segmentIndex: index,
                    progress: distanceBeforeSegment + this.pathLengths[index] * projection.t,
                };
            }
            distanceBeforeSegment += this.pathLengths[index];
        }
        return best;
    }

    private distanceToLine(point: Point, start: Point, end: Point): number {
        return projectPointToSegment(point, start, end).distance;
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    parent: 'app',
    backgroundColor: '#071114',
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};

new Phaser.Game(config);