import Phaser from 'phaser';
import { ALL_VOCAB } from './vocab';
import { DEFAULT_GAME_DIFFICULTY, DIFFICULTY_SETTING_LIST, DIFFICULTY_SETTINGS, isGameDifficultyKey, type GameDifficultyKey, type GameDifficultySetting } from './difficultySettings';
import { createAnswerOptions, createClue, learnedWordText } from './learning';
import {
    CELL_SIZE,
    GRID_COLS,
    GRID_HEIGHT,
    GRID_ROWS,
    GRID_WIDTH,
    GRID_X,
    GRID_Y,
    INITIAL_WAVE_GRACE_MS,
    MAX_TOWER_LEVEL,
    PANEL_Y,
    PATH_WIDTH,
    PLAY_BOTTOM,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    SIDE_X,
} from './layout';
import { TOWER_DEFS, TOWER_KINDS_BY_DIFFICULTY } from './towerData';
import {
    clamp,
    clueLabel,
    difficultyColor,
    difficultyEmoji,
    distance,
    formatDifficulty,
    normalize,
    projectPointToSegment,
    shuffle,
    towerIcon,
} from './gameHelpers';
import type { BuildSlot, ClueKind, Difficulty, Enemy, Point, Projectile, ProjectileKind, Prompt, Tower, TowerKind, TowerStats, WordEntry } from './gameTypes';

const DIFFICULTY_STORAGE_KEY = 'vocabTowerDefenceDifficulty';
const HEALTH_STORAGE_KEY = 'vocabTowerDefenceMonsterHealth';
const MIN_HEALTH_MULTIPLIER = 0.7;
const MAX_HEALTH_MULTIPLIER = 2.2;
const HEALTH_SLIDER_WIDTH = 128;
const ENEMY_SPACING_PADDING = 3;
const COLLISION_RESTITUTION = 0.42;
const WALL_RESTITUTION = 0.55;

export class GameScene extends Phaser.Scene {
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
    private difficultyKey: GameDifficultyKey = DEFAULT_GAME_DIFFICULTY;
    private difficultySetting: GameDifficultySetting = DIFFICULTY_SETTINGS[DEFAULT_GAME_DIFFICULTY];
    private monsterHealthMultiplier = 1;
    private lives = 20;
    private wave = 1;
    private spawnRemaining = 9;
    private spawnDelay = 1050;
    private nextSpawnAt = INITIAL_WAVE_GRACE_MS;
    private currentPrompt: Prompt | undefined;
    private gameOver = false;
    private hudText!: Phaser.GameObjects.Text;
    private selectedText!: Phaser.GameObjects.Text;
    private promptText!: Phaser.GameObjects.Text;
    private promptStatusText!: Phaser.GameObjects.Text;
    private waveText!: Phaser.GameObjects.Text;
    private hoverCell!: Phaser.GameObjects.Rectangle;
    private hoverPopupText!: Phaser.GameObjects.Text;
    private rangePreview!: Phaser.GameObjects.Arc;
    private restartButton!: Phaser.GameObjects.Rectangle;
    private optionButtons: Array<{ bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; word?: WordEntry }> = [];
    private settingsButtons: Array<{ key: GameDifficultyKey; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }> = [];
    private settingsNoteText!: Phaser.GameObjects.Text;
    private healthSliderTrack!: Phaser.GameObjects.Rectangle;
    private healthSliderFill!: Phaser.GameObjects.Rectangle;
    private healthSliderKnob!: Phaser.GameObjects.Arc;
    private healthSliderLabel!: Phaser.GameObjects.Text;

    constructor() {
        super('game');
    }

    create(): void {
        this.loadDifficultySetting();
        this.resetRoundState();
        this.cameras.main.setBackgroundColor('#08181b');
        this.buildPath();
        this.assignBuildSlotWords();
        this.drawArena();
        this.createHud();
        this.createPromptPanel();
        this.createRestartButton();
        this.nextSpawnAt = this.time.now + INITIAL_WAVE_GRACE_MS;

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isUiPointer(pointer.x, pointer.y)) {
                return;
            }
            this.handleBoardClick(pointer.x, pointer.y, this.time.now);
        });

        this.setPromptStatus(`${this.difficultySetting.label} difficulty selected. Pick a colored square and solve its clue before the wave arrives.`);
        this.updateHud();
    }

    private loadDifficultySetting(): void {
        const stored = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
        this.difficultyKey = isGameDifficultyKey(stored) ? stored : DEFAULT_GAME_DIFFICULTY;
        this.difficultySetting = DIFFICULTY_SETTINGS[this.difficultyKey];
        const storedHealth = Number(window.localStorage.getItem(HEALTH_STORAGE_KEY));
        this.monsterHealthMultiplier = Number.isFinite(storedHealth) ? clamp(storedHealth, MIN_HEALTH_MULTIPLIER, MAX_HEALTH_MULTIPLIER) : 1;
    }

    private resetRoundState(): void {
        this.pathPoints = [];
        this.pathLengths = [];
        this.pathTotalLength = 0;
        this.pathCells.clear();
        this.buildSlots.clear();
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.nextTowerId = 1;
        this.nextEnemyId = 1;
        this.nextProjectileId = 1;
        this.lives = 20;
        this.wave = 1;
        this.spawnRemaining = 9;
        this.spawnDelay = this.spawnDelayForWave(1);
        this.nextSpawnAt = this.time.now + INITIAL_WAVE_GRACE_MS;
        this.currentPrompt = undefined;
        this.gameOver = false;
        this.optionButtons = [];
        this.settingsButtons = [];
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
            easy: ALL_VOCAB.filter((entry) => entry.difficulty === 'easy'),
            medium: ALL_VOCAB.filter((entry) => entry.difficulty === 'medium'),
            hard: ALL_VOCAB.filter((entry) => entry.difficulty === 'hard'),
            veryHard: ALL_VOCAB.filter((entry) => entry.difficulty === 'veryHard'),
        };

        for (let row = 0; row < GRID_ROWS; row += 1) {
            for (let col = 0; col < GRID_COLS; col += 1) {
                if (this.isPathCell(col, row)) {
                    continue;
                }

                const center = this.cellCenter(col, row);
                const nearest = this.nearestPathPoint(center);
                const progressRatio = nearest.progress / this.pathTotalLength;
                const difficulty: Difficulty = progressRatio < 0.28 ? 'easy' : progressRatio < 0.55 ? 'medium' : progressRatio < 0.82 ? 'hard' : 'veryHard';
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
        const clueKinds: ClueKind[] = ['definition', 'definition', 'synonym', 'antonym'];
        return clueKinds[Math.abs(col * 2 + row * 5) % clueKinds.length];
    }

    private chooseWeightedClueKind(): ClueKind {
        const roll = Math.random();
        if (roll < 0.5) {
            return 'definition';
        }
        if (roll < 0.75) {
            return 'synonym';
        }
        return 'antonym';
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

        this.rangePreview = this.add.circle(0, 0, 10, 0x9fe9dc, 0.035);
        this.rangePreview.setStrokeStyle(2, 0x9fe9dc, 0.24);
        this.rangePreview.setVisible(false);
        this.rangePreview.setDepth(5);

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

        this.add.text(SIDE_X, GRID_Y, 'WORD WORKSHOP', {
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
            { difficulty: 'hard', label: 'Challenge: ricochet' },
            { difficulty: 'veryHard', label: 'Super: cluster or fire' },
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

        this.createSettingsMenu();

        this.selectedText = this.add.text(SIDE_X, GRID_Y + 504, '', {
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

    private createSettingsMenu(): void {
        this.add.text(SIDE_X, GRID_Y + 204, 'SETTINGS', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: '#effffb',
            fontStyle: 'bold',
        });

        this.add.text(SIDE_X, GRID_Y + 226, 'Difficulty', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#b9fff3',
        });

        this.settingsButtons = [];
        DIFFICULTY_SETTING_LIST.forEach((setting, index) => {
            const x = SIDE_X + 78;
            const y = GRID_Y + 262 + index * 38;
            const bg = this.add.rectangle(x, y, 156, 30, 0x183238, 1);
            bg.setInteractive({ useHandCursor: true });
            const text = this.add.text(x, y, setting.label, {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '13px',
                color: '#effffb',
                fontStyle: 'bold',
            });
            text.setOrigin(0.5);
            text.setInteractive({ useHandCursor: true });
            const select = () => this.selectDifficulty(setting.key);
            bg.on('pointerdown', select);
            text.on('pointerdown', select);
            this.settingsButtons.push({ key: setting.key, bg, text });
        });

        this.settingsNoteText = this.add.text(SIDE_X, GRID_Y + 386, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#b9c9ca',
            wordWrap: { width: 160 },
            lineSpacing: 3,
        });

        this.createHealthSlider();

        this.updateSettingsButtons();
    }

    private createHealthSlider(): void {
        this.add.text(SIDE_X, GRID_Y + 426, 'Monster health', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#b9fff3',
        });

        const x = SIDE_X + 78;
        const y = GRID_Y + 454;
        this.healthSliderTrack = this.add.rectangle(x, y, HEALTH_SLIDER_WIDTH, 8, 0x183238, 1);
        this.healthSliderTrack.setStrokeStyle(1, 0x86e5d8, 0.42);
        this.healthSliderTrack.setInteractive({ useHandCursor: true });
        this.healthSliderFill = this.add.rectangle(x - HEALTH_SLIDER_WIDTH / 2, y, 1, 8, 0xff9bb2, 0.88);
        this.healthSliderFill.setOrigin(0, 0.5);
        this.healthSliderKnob = this.add.circle(x, y, 8, 0xffd1dc, 1);
        this.healthSliderKnob.setStrokeStyle(2, 0xffffff, 0.72);
        this.healthSliderKnob.setInteractive({ useHandCursor: true });
        this.healthSliderLabel = this.add.text(SIDE_X, GRID_Y + 468, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: '#d3f4ee',
        });

        const startDrag = (pointer: Phaser.Input.Pointer) => this.setMonsterHealthFromPointer(pointer.x);
        this.healthSliderTrack.on('pointerdown', startDrag);
        this.healthSliderKnob.on('pointerdown', startDrag);
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && this.isPointerNearHealthSlider(pointer.x, pointer.y)) {
                this.setMonsterHealthFromPointer(pointer.x);
            }
        });

        this.updateHealthSlider();
    }

    private selectDifficulty(key: GameDifficultyKey): void {
        if (key === this.difficultyKey) {
            this.setPromptStatus(`${this.difficultySetting.label} difficulty is already selected.`);
            return;
        }

        window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, key);
        this.scene.restart();
    }

    private updateSettingsButtons(): void {
        this.settingsButtons.forEach((button) => {
            const setting = DIFFICULTY_SETTINGS[button.key];
            const selected = button.key === this.difficultyKey;
            button.bg.setFillStyle(selected ? setting.color : 0x183238, selected ? 0.34 : 1);
            button.bg.setStrokeStyle(selected ? 3 : 1, setting.color, selected ? 0.95 : 0.42);
            button.text.setColor(selected ? '#ffffff' : '#d3f4ee');
        });

        this.settingsNoteText.setText(`${this.difficultySetting.label}: ${this.difficultySetting.detail}\nChanging difficulty restarts wave 1.`);
    }

    private setMonsterHealthFromPointer(pointerX: number): void {
        const left = SIDE_X + 78 - HEALTH_SLIDER_WIDTH / 2;
        const ratio = clamp((pointerX - left) / HEALTH_SLIDER_WIDTH, 0, 1);
        const value = MIN_HEALTH_MULTIPLIER + ratio * (MAX_HEALTH_MULTIPLIER - MIN_HEALTH_MULTIPLIER);
        this.monsterHealthMultiplier = Math.round(value * 20) / 20;
        window.localStorage.setItem(HEALTH_STORAGE_KEY, String(this.monsterHealthMultiplier));
        this.updateHealthSlider();
        this.setPromptStatus(`Monster health set to ${this.monsterHealthMultiplier.toFixed(2)}x. New monsters will use this health.`);
    }

    private isPointerNearHealthSlider(pointerX: number, pointerY: number): boolean {
        const left = SIDE_X + 78 - HEALTH_SLIDER_WIDTH / 2 - 18;
        const right = SIDE_X + 78 + HEALTH_SLIDER_WIDTH / 2 + 18;
        const top = GRID_Y + 430;
        const bottom = GRID_Y + 482;
        return pointerX >= left && pointerX <= right && pointerY >= top && pointerY <= bottom;
    }

    private updateHealthSlider(): void {
        const ratio = (this.monsterHealthMultiplier - MIN_HEALTH_MULTIPLIER) / (MAX_HEALTH_MULTIPLIER - MIN_HEALTH_MULTIPLIER);
        const left = SIDE_X + 78 - HEALTH_SLIDER_WIDTH / 2;
        this.healthSliderFill.width = Math.max(1, HEALTH_SLIDER_WIDTH * ratio);
        this.healthSliderKnob.setPosition(left + HEALTH_SLIDER_WIDTH * ratio, GRID_Y + 454);
        this.healthSliderLabel.setText(`${this.monsterHealthMultiplier.toFixed(2)}x health`);
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

    private isUiPointer(x: number, y: number): boolean {
        return x >= SIDE_X - 18 || y >= PANEL_Y;
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

        if (this.gameOver) {
            return;
        }

        const col = Math.floor((x - GRID_X) / CELL_SIZE);
        const row = Math.floor((y - GRID_Y) / CELL_SIZE);
        const tower = this.towers.find((candidate) => candidate.col === col && candidate.row === row);

        if (tower) {
            this.startUpgradeChallenge(tower, time);
            return;
        }

        if (!this.isBuildableCell(col, row)) {
            this.flashCell(col, row, 0xff5c6c);
            this.setPromptStatus('That square is part of the path. Try one of the darker build pads beside it.');
            return;
        }

        this.startBuildChallenge(col, row);
    }

    private startBuildChallenge(col: number, row: number): void {
        const slot = this.buildSlots.get(this.cellKey(col, row));
        if (!slot) {
            this.flashCell(col, row, 0xff5c6c);
            this.setPromptStatus('That spot is not ready for a tower. Pick a colored build pad.');
            return;
        }

        const towerKind = slot.towerKind;
        const clueKind = this.chooseWeightedClueKind();
        slot.clueKind = clueKind;
        this.currentPrompt = this.createChallenge({
            mode: 'build',
            word: slot.word,
            clueKind,
            col,
            row,
            towerKind,
        });
        this.flashCell(col, row, difficultyColor(slot.word.difficulty));
        this.renderChallenge();
    }

    private startUpgradeChallenge(tower: Tower, time: number): void {
        if (tower.jamUntil > time) {
            this.setPromptStatus(`${TOWER_DEFS[tower.kind].name} is taking a tiny reboot pause. Try the upgrade again in a moment.`);
            this.pulseTower(tower, 0xff5c6c, 0.2);
            return;
        }

        if (tower.level >= MAX_TOWER_LEVEL) {
            this.setPromptStatus(`${TOWER_DEFS[tower.kind].name} is already at level ${MAX_TOWER_LEVEL}.`);
            this.pulseTower(tower, 0xffe38a, 0.22);
            this.floatingText(tower.x, tower.y - 42, 'MAX LEVEL', '#ffe38a');
            return;
        }

        const clueKind = this.chooseWeightedClueKind();
        tower.clueKind = clueKind;
        this.currentPrompt = this.createChallenge({
            mode: 'upgrade',
            word: tower.word,
            clueKind,
            tower,
        });
        this.pulseTower(tower, difficultyColor(tower.word.difficulty), 0.22);
        this.renderChallenge();
    }

    private createChallenge(challenge: Omit<Prompt, 'clue' | 'options'>): Prompt {
        return {
            ...challenge,
            clue: createClue(challenge.word, challenge.clueKind),
            options: createAnswerOptions(challenge.word, ALL_VOCAB),
        };
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
            this.setPromptStatus(`${def ? `${towerIcon(def.kind)} ${def.name} • ` : ''}choose the matching word to upgrade. A miss only causes a tiny reboot pause.`);
        }

        this.optionButtons.forEach((button, index) => {
            const option = challenge.options[index];
            button.word = option;
            button.text.setText(option.word);
            button.text.setFontSize(option.word.length > 12 ? 14 : 17);
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
            this.clearChallenge(`Correct. ${learnedWordText(challenge.word)} ${TOWER_DEFS[challenge.towerKind].name} deployed.`);
            if (tower) {
                this.pulseTower(tower, TOWER_DEFS[tower.kind].accent, 0.18);
            }
            return;
        }

        if (challenge.tower) {
            this.upgradeTower(challenge.tower, challenge.word);
            this.clearChallenge(`Correct. ${learnedWordText(challenge.word)} Upgraded to level ${challenge.tower.level}.`);
        }
    }

    private handleWrongChallengeAnswer(challenge: Prompt, option: WordEntry): void {
        if (challenge.mode === 'build') {
            if (challenge.col !== undefined && challenge.row !== undefined) {
                this.flashCell(challenge.col, challenge.row, 0xff5c6c);
                const center = this.cellCenter(challenge.col, challenge.row);
                this.floatingText(center.x, center.y - 18, 'TRY AGAIN', '#ffb3bb');
            }
            this.clearChallenge(`Not quite: ${option.word}. The answer was ${learnedWordText(challenge.word)} Try that build pad again when ready.`);
            return;
        }

        if (challenge.tower) {
            challenge.tower.jamUntil = this.time.now + 1700;
            this.wrongAnswerEffect(challenge.tower);
        }
        this.clearChallenge(`Not quite: ${option.word}. The answer was ${learnedWordText(challenge.word)} The tower is rebooting for a moment.`);
    }

    private clearChallenge(message: string): void {
        this.currentPrompt = undefined;
        this.hideAnswerOptions();
        this.promptText.setText(message);
        this.setPromptStatus('Choose a colored build pad to place a tower, or choose a built tower to try its next upgrade.');
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
        this.drawTowerDecoration(kind, center.x, center.y, def.color, def.accent);
        const cap = this.add.circle(center.x, center.y, 8, def.accent, 1);
        cap.setDepth(10);
        const label = this.add.text(center.x, center.y + 24, towerIcon(def.kind), {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '18px',
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
        const jamLabel = this.add.text(center.x, center.y - 34, 'PAUSE', {
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
        this.setPromptStatus(`${def.name} tower built. Its next upgrade word is hidden until you answer the clue.`);
        this.updateHud();
        return tower;
    }

    private upgradeTower(tower: Tower, answeredWord: WordEntry): void {
        if (tower.level >= MAX_TOWER_LEVEL) {
            this.setPromptStatus(`${TOWER_DEFS[tower.kind].name} is already at level ${MAX_TOWER_LEVEL}.`);
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
        tower.label.setText(towerIcon(tower.kind));
        tower.label.setFontSize(18);
    }

    private nextTowerWord(difficulty: Difficulty, avoidWords: string[]): WordEntry {
        const pool = ALL_VOCAB.filter((entry) => entry.difficulty === difficulty);
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

    private drawTowerDecoration(kind: TowerKind, x: number, y: number, color: number, accent: number): void {
        const graphics = this.add.graphics();
        graphics.setDepth(9);
        graphics.lineStyle(2, 0xf5fffd, 0.48);

        if (kind === 'dart') {
            graphics.fillStyle(accent, 0.95);
            graphics.fillTriangle(x, y - 22, x - 7, y + 2, x + 7, y + 2);
            graphics.strokeTriangle(x, y - 22, x - 7, y + 2, x + 7, y + 2);
            graphics.fillStyle(0xffffff, 0.9);
            graphics.fillCircle(x, y - 2, 5);
            return;
        }

        if (kind === 'cannon') {
            graphics.fillStyle(color, 0.92);
            graphics.fillRoundedRect(x - 18, y - 9, 36, 18, 8);
            graphics.strokeRoundedRect(x - 18, y - 9, 36, 18, 8);
            graphics.fillStyle(accent, 0.98);
            this.drawMiniStar(graphics, x, y, 8, 3.6);
            return;
        }

        if (kind === 'missile') {
            graphics.fillStyle(accent, 0.92);
            graphics.fillTriangle(x, y - 23, x - 10, y + 8, x + 10, y + 8);
            graphics.strokeTriangle(x, y - 23, x - 10, y + 8, x + 10, y + 8);
            graphics.fillStyle(color, 0.9);
            graphics.fillCircle(x, y + 2, 8);
            return;
        }

        if (kind === 'laser') {
            graphics.fillStyle(accent, 0.72);
            graphics.fillCircle(x, y, 13);
            graphics.lineStyle(3, color, 0.9);
            graphics.strokeCircle(x, y, 15);
            graphics.lineBetween(x - 14, y, x + 14, y);
            graphics.lineBetween(x, y - 14, x, y + 14);
            return;
        }

        if (kind === 'ricochet') {
            graphics.lineStyle(4, accent, 0.9);
            graphics.strokeCircle(x, y, 14);
            graphics.lineStyle(2, 0xffffff, 0.65);
            graphics.strokeCircle(x + 3, y - 3, 8);
            return;
        }

        if (kind === 'cluster') {
            graphics.fillStyle(accent, 0.96);
            this.drawMiniStar(graphics, x, y, 13, 5.5);
            graphics.lineStyle(2, color, 0.84);
            graphics.strokeCircle(x, y, 16);
            return;
        }

        graphics.fillStyle(accent, 0.95);
        graphics.fillTriangle(x, y - 22, x - 12, y + 8, x + 12, y + 8);
        graphics.fillStyle(0xffa23a, 0.92);
        graphics.fillTriangle(x, y - 13, x - 8, y + 10, x + 8, y + 10);
        graphics.lineStyle(2, 0xffffff, 0.5);
        graphics.strokeCircle(x, y, 15);
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

    private updateSpawning(time: number): void {
        if (this.spawnRemaining <= 0 && this.enemies.length === 0) {
            this.wave += 1;
            this.spawnRemaining = 8 + this.wave * 3;
            this.spawnDelay = this.spawnDelayForWave(this.wave);
            this.nextSpawnAt = time + 2600;
            this.setPromptStatus(`Wave ${this.wave} is getting ready. You have a short breather for building and upgrades.`);
            return;
        }

        if (this.spawnRemaining > 0 && time >= this.nextSpawnAt) {
            this.spawnEnemy();
            this.spawnRemaining -= 1;
            this.nextSpawnAt = time + this.spawnDelay;
        }
    }

    private spawnDelayForWave(wave: number): number {
        return Math.max(
            this.difficultySetting.minSpawnDelayMs,
            this.difficultySetting.levelOneSpawnDelayMs - Math.max(0, wave - 1) * this.difficultySetting.waveSpawnStepMs,
        );
    }

    private enemySpeedMultiplierForWave(wave: number): number {
        return this.difficultySetting.levelOneSpeedMultiplier + Math.max(0, wave - 1) * this.difficultySetting.waveSpeedGrowth;
    }

    private spawnEnemy(): void {
        const point = this.pathPoints[0];
        const waveBoost = Math.max(0, this.wave - 1);
        const variantRoll = Phaser.Math.Between(1, 10);
        const runner = variantRoll <= 2;
        const brute = variantRoll >= 9;
        const hp = Math.round(((runner ? 36 : brute ? 86 : 54) + waveBoost * (runner ? 9 : brute ? 21 : 14)) * this.monsterHealthMultiplier);
        const radius = brute ? 15 : runner ? 10 : 12;
        const speed = (runner ? 76 : brute ? 40 : 56) * this.enemySpeedMultiplierForWave(this.wave);
        const color = runner ? 0xffef73 : brute ? 0xff6f61 : 0xff9bb2;

        const body = this.add.circle(point.x, point.y, radius, color, 1);
        body.setStrokeStyle(2, 0x071114, 0.8);
        body.setDepth(6);
        const core = this.add.circle(point.x, point.y, brute ? 6 : 4, 0xffffff, 0.72);
        core.setDepth(7);
        const eyeOffsetX = brute ? 5 : runner ? 3.5 : 4;
        const eyeOffsetY = brute ? -4 : -3;
        const eyeRadius = brute ? 2.1 : runner ? 1.6 : 1.8;
        const leftEye = this.add.circle(point.x - eyeOffsetX, point.y + eyeOffsetY, eyeRadius, 0x071114, 0.95);
        const rightEye = this.add.circle(point.x + eyeOffsetX, point.y + eyeOffsetY, eyeRadius, 0x071114, 0.95);
        leftEye.setDepth(8);
        rightEye.setDepth(8);
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
            radius,
            mass: radius * radius,
            baseColor: color,
            waypointIndex: 0,
            distanceTravelled: 0,
            slowUntil: 0,
            stunnedUntil: 0,
            knockbackUntil: 0,
            burningUntil: 0,
            nextBurnTickAt: 0,
            burnDamage: 0,
            burnSpreadAt: 0,
            burnSpreadRadius: 0,
            vx: 0,
            vy: 0,
            motion: 'path',
            alive: true,
            body,
            core,
            leftEye,
            rightEye,
            eyeOffsetX,
            eyeOffsetY,
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

            this.updateBurningEnemy(enemy, time);
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

        this.resolvePathTraffic();
        this.resolveEnemyCollisions(time);
        this.enemies.forEach((enemy) => this.constrainEnemyToPath(enemy, enemy.motion === 'knocked'));
    }

    private updateKnockedEnemy(enemy: Enemy, time: number, deltaSeconds: number): void {
        const nextX = enemy.body.x + enemy.vx * deltaSeconds;
        const nextY = enemy.body.y + enemy.vy * deltaSeconds;
        this.setEnemyPosition(enemy, nextX, nextY);
        this.constrainEnemyToPath(enemy, true);

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
            this.constrainEnemyToPath(enemy, false);
            enemy.body.setFillStyle(0xffd49a, 1);
        }

        this.updateEnemyHealthBar(enemy);
    }

    private resolvePathTraffic(): void {
        const pathEnemies = this.enemies
            .filter((enemy) => enemy.alive && enemy.motion === 'path')
            .sort((a, b) => b.distanceTravelled - a.distanceTravelled);

        for (let index = 1; index < pathEnemies.length; index += 1) {
            const leader = pathEnemies[index - 1];
            const follower = pathEnemies[index];
            const minimumGap = leader.radius + follower.radius + ENEMY_SPACING_PADDING;
            const currentGap = leader.distanceTravelled - follower.distanceTravelled;

            if (currentGap >= minimumGap) {
                continue;
            }

            follower.distanceTravelled = Math.max(0, leader.distanceTravelled - minimumGap);
            const pathPosition = this.pointAtPathProgress(follower.distanceTravelled);
            follower.waypointIndex = pathPosition.segmentIndex;
            this.setEnemyPosition(follower, pathPosition.point.x, pathPosition.point.y);
            this.updateEnemyHealthBar(follower);
        }
    }

    private resolveEnemyCollisions(time: number): void {
        const liveEnemies = this.enemies.filter((enemy) => enemy.alive);
        for (let pass = 0; pass < 2; pass += 1) {
            for (let firstIndex = 0; firstIndex < liveEnemies.length; firstIndex += 1) {
                for (let secondIndex = firstIndex + 1; secondIndex < liveEnemies.length; secondIndex += 1) {
                    this.resolveEnemyPairCollision(liveEnemies[firstIndex], liveEnemies[secondIndex], time);
                }
            }
        }
    }

    private resolveEnemyPairCollision(first: Enemy, second: Enemy, time: number): void {
        const dx = first.body.x - second.body.x;
        const dy = first.body.y - second.body.y;
        const minDistance = first.radius + second.radius + ENEMY_SPACING_PADDING;
        let gap = Math.hypot(dx, dy);
        let normal = gap > 0 ? { x: dx / gap, y: dy / gap } : this.fallbackCollisionNormal(first, second);

        if (gap >= minDistance) {
            return;
        }

        if (gap === 0) {
            gap = 0.001;
            normal = this.fallbackCollisionNormal(first, second);
        }

        const overlap = minDistance - gap;
        const firstWeight = this.collisionMoveWeight(first);
        const secondWeight = this.collisionMoveWeight(second);
        const totalWeight = firstWeight + secondWeight || 1;
        this.moveEnemyBy(first, normal.x * overlap * (firstWeight / totalWeight), normal.y * overlap * (firstWeight / totalWeight));
        this.moveEnemyBy(second, -normal.x * overlap * (secondWeight / totalWeight), -normal.y * overlap * (secondWeight / totalWeight));

        this.constrainEnemyToPath(first, first.motion === 'knocked');
        this.constrainEnemyToPath(second, second.motion === 'knocked');

        const knockbackImpact = first.motion === 'knocked' || second.motion === 'knocked';
        if (!knockbackImpact) {
            return;
        }

        const relativeVelocity = (first.vx - second.vx) * normal.x + (first.vy - second.vy) * normal.y;
        const collisionSpeed = Math.max(0, -relativeVelocity, Math.hypot(first.vx, first.vy) * 0.22, Math.hypot(second.vx, second.vy) * 0.22);
        if (collisionSpeed < 22) {
            return;
        }

        const totalMass = first.mass + second.mass;
        const impulse = collisionSpeed * (1 + COLLISION_RESTITUTION);
        this.applyCollisionVelocity(first, normal.x * impulse * (second.mass / totalMass), normal.y * impulse * (second.mass / totalMass), time);
        this.applyCollisionVelocity(second, -normal.x * impulse * (first.mass / totalMass), -normal.y * impulse * (first.mass / totalMass), time);

        if (Math.random() < 0.35) {
            this.spark((first.body.x + second.body.x) / 2, (first.body.y + second.body.y) / 2, 0xfff2a8, 4);
        }
    }

    private collisionMoveWeight(enemy: Enemy): number {
        if (enemy.motion === 'knocked') {
            return 1;
        }
        if (enemy.motion === 'returning') {
            return 0.72;
        }
        if (enemy.motion === 'stunned') {
            return 0.46;
        }
        return 0.28;
    }

    private fallbackCollisionNormal(first: Enemy, second: Enemy): Point {
        const angle = ((first.id * 97 + second.id * 53) % 360) * Phaser.Math.DEG_TO_RAD;
        return { x: Math.cos(angle), y: Math.sin(angle) };
    }

    private moveEnemyBy(enemy: Enemy, dx: number, dy: number): void {
        this.setEnemyPosition(enemy, enemy.body.x + dx, enemy.body.y + dy);
        if (enemy.motion === 'path') {
            const nearest = this.nearestPathPoint({ x: enemy.body.x, y: enemy.body.y });
            enemy.distanceTravelled = Math.min(enemy.distanceTravelled, nearest.progress);
        }
    }

    private applyCollisionVelocity(enemy: Enemy, vx: number, vy: number, time: number): void {
        const impactSpeed = Math.hypot(vx, vy);
        if (impactSpeed < 12) {
            return;
        }

        enemy.vx += vx;
        enemy.vy += vy;
        if (impactSpeed >= 36 && enemy.motion !== 'knocked') {
            enemy.motion = 'knocked';
            enemy.knockbackUntil = Math.max(enemy.knockbackUntil, time + 180 + impactSpeed * 1.2);
            enemy.stunnedUntil = Math.max(enemy.stunnedUntil, time + 90 + impactSpeed * 0.7);
            enemy.body.setFillStyle(0xffd49a, 1);
        }
    }

    private constrainEnemyToPath(enemy: Enemy, bounce: boolean): void {
        if (!enemy.alive || this.pathPoints.length < 2) {
            return;
        }

        const nearest = this.nearestPathPoint({ x: enemy.body.x, y: enemy.body.y });
        const wallRadius = Math.max(8, PATH_WIDTH / 2 - enemy.radius - 5);
        if (nearest.distance <= wallRadius) {
            return;
        }

        let normal = normalize(enemy.body.x - nearest.point.x, enemy.body.y - nearest.point.y);
        if (normal.x === 0 && normal.y === 0) {
            normal = this.pathNormalAt(nearest.segmentIndex);
        }

        const correctedX = nearest.point.x + normal.x * wallRadius;
        const correctedY = nearest.point.y + normal.y * wallRadius;
        this.setEnemyPosition(enemy, correctedX, correctedY);

        if (enemy.motion === 'path') {
            enemy.distanceTravelled = nearest.progress;
        }

        if (!bounce) {
            return;
        }

        const outwardVelocity = enemy.vx * normal.x + enemy.vy * normal.y;
        if (outwardVelocity > 0) {
            enemy.vx -= (1 + WALL_RESTITUTION) * outwardVelocity * normal.x;
            enemy.vy -= (1 + WALL_RESTITUTION) * outwardVelocity * normal.y;
            if (outwardVelocity > 80 && Math.random() < 0.2) {
                this.spark(correctedX, correctedY, 0xb9fff3, 3);
            }
        }
    }

    private pathNormalAt(segmentIndex: number): Point {
        const start = this.pathPoints[segmentIndex] ?? this.pathPoints[0];
        const end = this.pathPoints[segmentIndex + 1] ?? this.pathPoints[this.pathPoints.length - 1];
        const direction = normalize(end.x - start.x, end.y - start.y);
        return { x: -direction.y, y: direction.x };
    }

    private setEnemyPosition(enemy: Enemy, x: number, y: number): void {
        enemy.body.setPosition(x, y);
        enemy.core.setPosition(x, y);
        enemy.leftEye.setPosition(x - enemy.eyeOffsetX, y + enemy.eyeOffsetY);
        enemy.rightEye.setPosition(x + enemy.eyeOffsetX, y + enemy.eyeOffsetY);
        enemy.healthBack.setPosition(x, y - 22);
        enemy.healthFill.setPosition(x - 14, y - 22);
    }

    private updateEnemyHealthBar(enemy: Enemy): void {
        const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
        enemy.healthBack.setPosition(enemy.body.x, enemy.body.y - 22);
        enemy.healthFill.setPosition(enemy.body.x - 14, enemy.body.y - 22);
        enemy.healthFill.width = 28 * ratio;
        enemy.core.setPosition(enemy.body.x, enemy.body.y);
        enemy.leftEye.setPosition(enemy.body.x - enemy.eyeOffsetX, enemy.body.y + enemy.eyeOffsetY);
        enemy.rightEye.setPosition(enemy.body.x + enemy.eyeOffsetX, enemy.body.y + enemy.eyeOffsetY);
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

        if (tower.kind === 'cluster' || tower.kind === 'fire') {
            const projectileKind: ProjectileKind = tower.kind;
            const direction = normalize(target.body.x - tower.x, target.body.y - tower.y);
            const color = projectileKind === 'cluster' ? 0xfff0a6 : 0xff8a2f;
            const radius = projectileKind === 'cluster' ? 8 : 7;
            const object = this.add.circle(tower.x, tower.y, radius, color, 1);
            object.setStrokeStyle(2, 0xffffff, 0.6);
            object.setDepth(10);
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
                ttl: 2900,
                bornAt: time,
                target,
                targetPoint: { x: target.body.x, y: target.body.y },
                object,
                knockback: stats.knockback,
                stunMs: stats.stunMs,
                fragments: stats.fragments,
                burnDamage: stats.burnDamage,
                burnDuration: stats.burnDuration,
                spreadRadius: stats.spreadRadius,
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
            homing: stats.homing,
            knockback: stats.knockback,
            stunMs: stats.stunMs,
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
            } else if (projectile.kind === 'cluster') {
                this.updateCluster(projectile, deltaSeconds);
            } else if (projectile.kind === 'fragment') {
                this.updateFragment(projectile, deltaSeconds);
            } else if (projectile.kind === 'fire') {
                this.updateFireProjectile(projectile, deltaSeconds);
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
            this.explode(projectile.x, projectile.y, projectile.splash, projectile.damage, 0xff9f43, 0, 0);
            this.removeProjectile(projectile);
        }
    }

    private updateCluster(projectile: Projectile, deltaSeconds: number): void {
        const targetPoint = projectile.targetPoint ?? { x: projectile.x, y: projectile.y };
        const direction = normalize(targetPoint.x - projectile.x, targetPoint.y - projectile.y);
        const step = projectile.speed * deltaSeconds;
        projectile.x += direction.x * step;
        projectile.y += direction.y * step;
        projectile.object.setPosition(projectile.x, projectile.y);
        projectile.object.rotation += 0.16;
        this.spawnSmoke(projectile.x - direction.x * 8, projectile.y - direction.y * 8, 0xffc66d, 0.28);

        if (distance(projectile, targetPoint) <= step + 8) {
            this.clusterBurst(projectile);
            this.removeProjectile(projectile);
        }
    }

    private clusterBurst(projectile: Projectile): void {
        const fragmentCount = projectile.fragments ?? 6;
        const knockback = projectile.knockback ?? 360;
        const stunMs = projectile.stunMs ?? 220;
        this.explode(projectile.x, projectile.y, projectile.splash * 0.72, projectile.damage * 0.55, 0xfff0a6, knockback * 0.7, stunMs * 0.45);

        for (let index = 0; index < fragmentCount; index += 1) {
            const angle = (Math.PI * 2 * index) / fragmentCount + Phaser.Math.FloatBetween(-0.22, 0.22);
            const radius = Phaser.Math.Between(44, 92);
            const targetPoint = {
                x: projectile.x + Math.cos(angle) * radius,
                y: projectile.y + Math.sin(angle) * radius,
            };
            const direction = normalize(targetPoint.x - projectile.x, targetPoint.y - projectile.y);
            const shard = this.add.circle(projectile.x, projectile.y, 4, 0xfff0a6, 1);
            shard.setStrokeStyle(1, 0xff6b6b, 0.9);
            shard.setDepth(11);
            this.projectiles.push({
                id: this.nextProjectileId,
                kind: 'fragment',
                x: projectile.x,
                y: projectile.y,
                vx: direction.x * (projectile.speed * 1.2),
                vy: direction.y * (projectile.speed * 1.2),
                speed: projectile.speed * 1.2,
                damage: projectile.damage * 0.62,
                splash: Math.max(28, projectile.splash * 0.42),
                ttl: 850,
                bornAt: this.time.now,
                targetPoint,
                object: shard,
                knockback: knockback * 0.82,
                stunMs: stunMs * 0.55,
                hitTimes: new Map<number, number>(),
            });
            this.nextProjectileId += 1;
        }
    }

    private updateFragment(projectile: Projectile, deltaSeconds: number): void {
        const targetPoint = projectile.targetPoint ?? { x: projectile.x, y: projectile.y };
        const step = projectile.speed * deltaSeconds;
        const direction = normalize(targetPoint.x - projectile.x, targetPoint.y - projectile.y);
        projectile.x += direction.x * step;
        projectile.y += direction.y * step;
        projectile.object.setPosition(projectile.x, projectile.y);
        this.spawnSmoke(projectile.x, projectile.y, 0xfff0a6, 0.2);

        if (distance(projectile, targetPoint) <= step + 4) {
            this.explode(projectile.x, projectile.y, projectile.splash, projectile.damage, 0xffc66d, projectile.knockback ?? 300, projectile.stunMs ?? 120);
            this.removeProjectile(projectile);
        }
    }

    private updateFireProjectile(projectile: Projectile, deltaSeconds: number): void {
        const targetPoint = projectile.targetPoint ?? { x: projectile.x, y: projectile.y };
        const direction = normalize(targetPoint.x - projectile.x, targetPoint.y - projectile.y);
        const step = projectile.speed * deltaSeconds;
        projectile.x += direction.x * step;
        projectile.y += direction.y * step;
        projectile.object.setPosition(projectile.x, projectile.y);
        this.spawnSmoke(projectile.x - direction.x * 8, projectile.y - direction.y * 8, 0xff7a2f, 0.34);

        if (distance(projectile, targetPoint) <= step + 8) {
            this.igniteArea(projectile.x, projectile.y, projectile.splash, projectile.damage, projectile.burnDamage ?? 5, projectile.burnDuration ?? 2600, projectile.spreadRadius ?? 58);
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
        const homing = projectile.homing ?? 0.08;
        projectile.vx += (direction.x * projectile.speed - projectile.vx) * homing;
        projectile.vy += (direction.y * projectile.speed - projectile.vy) * homing;
        const velocity = normalize(projectile.vx, projectile.vy);
        projectile.vx = velocity.x * projectile.speed;
        projectile.vy = velocity.y * projectile.speed;
        projectile.x += projectile.vx * deltaSeconds;
        projectile.y += projectile.vy * deltaSeconds;
        projectile.object.setPosition(projectile.x, projectile.y);
        projectile.object.rotation = Math.atan2(projectile.vy, projectile.vx);
        this.spawnSmoke(projectile.x - velocity.x * 9, projectile.y - velocity.y * 9, 0xb8ff8a);

        if (distance(projectile, { x: target.body.x, y: target.body.y }) < 18) {
            this.explode(projectile.x, projectile.y, projectile.splash, projectile.damage, 0xb8ff8a, projectile.knockback ?? 310, projectile.stunMs ?? 280);
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
                this.chainZap(projectile.x, projectile.y, enemy.body.x, enemy.body.y, 0xff86f7);
                this.removeProjectile(projectile);
                return;
            }
        }
    }

    private fireLaser(tower: Tower, target: Enemy, stats: TowerStats): void {
        const color = TOWER_DEFS[tower.kind].accent;
        const targetPoint = { x: target.body.x, y: target.body.y };
        const segments: Array<{ start: Point; end: Point; multiplier: number }> = [
            { start: { x: tower.x, y: tower.y }, end: targetPoint, multiplier: 0.42 },
        ];

        let currentStart = targetPoint;
        let currentDirection = normalize(targetPoint.x - tower.x, targetPoint.y - tower.y);
        for (let reflection = 0; reflection < (stats.reflections ?? 0); reflection += 1) {
            const nearest = this.nearestPathPoint(currentStart);
            const segmentStart = this.pathPoints[nearest.segmentIndex];
            const segmentEnd = this.pathPoints[nearest.segmentIndex + 1];
            const pathDirection = normalize(segmentEnd.x - segmentStart.x, segmentEnd.y - segmentStart.y);
            let normal = normalize(currentStart.x - nearest.point.x, currentStart.y - nearest.point.y);
            if (normal.x === 0 && normal.y === 0) {
                normal = { x: -pathDirection.y, y: pathDirection.x };
            }
            const sidePoint = {
                x: nearest.point.x + normal.x * (PATH_WIDTH / 2 - 8),
                y: nearest.point.y + normal.y * (PATH_WIDTH / 2 - 8),
            };
            segments.push({ start: currentStart, end: sidePoint, multiplier: 0.38 * Math.pow(0.82, reflection) });
            const dot = currentDirection.x * normal.x + currentDirection.y * normal.y;
            let reflected = normalize(currentDirection.x - 2 * dot * normal.x, currentDirection.y - 2 * dot * normal.y);
            if (reflected.x === 0 && reflected.y === 0) {
                reflected = { x: pathDirection.x, y: pathDirection.y };
            }
            const travel = stats.range * (0.42 - Math.min(0.18, reflection * 0.04));
            const endPoint = { x: sidePoint.x + reflected.x * travel, y: sidePoint.y + reflected.y * travel };
            segments.push({ start: sidePoint, end: endPoint, multiplier: 0.32 * Math.pow(0.82, reflection) });
            currentStart = endPoint;
            currentDirection = reflected;
        }

        const beam = this.add.graphics();
        beam.setDepth(14);
        beam.lineStyle(9 + tower.level * 1.8, color, 0.22 + tower.level * 0.09);
        for (const segment of segments) {
            beam.beginPath();
            beam.moveTo(segment.start.x, segment.start.y);
            beam.lineTo(segment.end.x, segment.end.y);
            beam.strokePath();
        }
        beam.lineStyle(3 + Math.min(5, tower.level), 0xffffff, 0.74 + tower.level * 0.04);
        for (const segment of segments) {
            beam.beginPath();
            beam.moveTo(segment.start.x, segment.start.y);
            beam.lineTo(segment.end.x, segment.end.y);
            beam.strokePath();
        }
        this.tweens.add({
            targets: beam,
            alpha: 0,
            duration: 210,
            onComplete: () => beam.destroy(),
        });

        const hits = new Map<number, { enemy: Enemy; multiplier: number }>();
        const beamWidth = 19 + tower.level * 4;
        for (const segment of segments) {
            for (const enemy of this.enemies) {
                if (!enemy.alive) {
                    continue;
                }
                const dist = this.distanceToLine({ x: enemy.body.x, y: enemy.body.y }, segment.start, segment.end);
                if (dist <= beamWidth) {
                    const previous = hits.get(enemy.id)?.multiplier ?? 0;
                    hits.set(enemy.id, { enemy, multiplier: Math.max(previous, segment.multiplier) });
                }
            }
        }
        hits.set(target.id, { enemy: target, multiplier: 1 });
        for (const { enemy, multiplier } of hits.values()) {
            this.damageEnemy(enemy, stats.damage * multiplier, color);
        }

        this.spark(targetPoint.x, targetPoint.y, color, 10 + tower.level * 2);
        for (const segment of segments.slice(1, 1 + Math.min(4, tower.level))) {
            this.spark(segment.end.x, segment.end.y, color, 4 + tower.level);
        }
    }

    private towerStats(tower: Tower): TowerStats {
        const def = TOWER_DEFS[tower.kind];
        const level = tower.level - 1;

        if (tower.kind === 'dart') {
            return {
                range: def.range + level * 16,
                cooldown: Math.max(115, def.cooldown * Math.pow(0.72, level)),
                damage: Math.round(def.damage + level * 4),
                splash: 0,
                speed: 500 + level * 38,
            };
        }

        if (tower.kind === 'cannon') {
            return {
                range: def.range + level * 14,
                cooldown: Math.max(230, def.cooldown * Math.pow(0.7, level)),
                damage: Math.round(def.damage * (1 + level * 0.24)),
                splash: 58 + level * 12,
                speed: 310 + level * 18,
            };
        }
        if (tower.kind === 'missile') {
            return {
                range: def.range + level * 20,
                cooldown: Math.max(430, def.cooldown * Math.pow(0.86, level)),
                damage: Math.round(def.damage * (1.32 + level * 0.42)),
                splash: 54 + level * 10,
                speed: 245 + level * 24,
                homing: 0.1 + level * 0.045,
                knockback: 230 + level * 68,
                stunMs: 110 + level * 42,
            };
        }
        if (tower.kind === 'ricochet') {
            return {
                range: def.range + level * 16,
                cooldown: Math.max(620, def.cooldown * Math.pow(0.9, level)),
                damage: Math.round(def.damage * (1 + level * 0.38)),
                splash: 0,
                speed: 380 + level * 32,
            };
        }
        if (tower.kind === 'laser') {
            return {
                range: def.range + level * 18,
                cooldown: Math.max(390, def.cooldown * Math.pow(0.88, level)),
                damage: Math.round(def.damage * (1 + level * 0.32)),
                splash: 0,
                speed: 0,
                reflections: level,
            };
        }
        if (tower.kind === 'cluster') {
            return {
                range: def.range + level * 18,
                cooldown: Math.max(780, def.cooldown * Math.pow(0.87, level)),
                damage: Math.round(def.damage * (1 + level * 0.31)),
                splash: 74 + level * 11,
                speed: 230 + level * 20,
                knockback: 340 + level * 70,
                stunMs: 160 + level * 42,
                fragments: 5 + level,
            };
        }
        return {
            range: def.range + level * 18,
            cooldown: Math.max(560, def.cooldown * Math.pow(0.86, level)),
            damage: Math.round(def.damage + level * 3),
            splash: 66 + level * 14,
            speed: 260 + level * 18,
            burnDamage: 5 + level * 2.2,
            burnDuration: 2600 + level * 520,
            spreadRadius: 54 + level * 12,
        };
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
                enemy.body.setFillStyle(enemy.burningUntil > this.time.now ? 0xff7a2f : enemy.slowUntil > this.time.now ? 0xaee8ff : enemy.baseColor, 1);
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
                if (enemy.alive && (knockbackForce > 0 || stunMs > 0)) {
                    this.knockEnemy(enemy, { x, y }, knockbackForce * (0.25 + falloff * 0.85), stunMs * falloff, color);
                }
            }
        }
    }

    private igniteArea(x: number, y: number, radius: number, impactDamage: number, burnDamage: number, burnDuration: number, spreadRadius: number): void {
        const pool = this.add.circle(x, y, radius * 0.3, 0xff7a2f, 0.18);
        pool.setStrokeStyle(5, 0xfff35b, 0.72);
        pool.setDepth(12);
        this.tweens.add({
            targets: pool,
            radius,
            alpha: 0,
            duration: 520,
            onComplete: () => pool.destroy(),
        });
        this.spark(x, y, 0xfff35b, 20);

        for (const enemy of this.enemies) {
            if (!enemy.alive) {
                continue;
            }
            const dist = distance({ x, y }, { x: enemy.body.x, y: enemy.body.y });
            if (dist <= radius) {
                const falloff = 1 - dist / Math.max(1, radius);
                this.damageEnemy(enemy, impactDamage * (0.28 + falloff * 0.52), 0xfff35b);
                if (enemy.alive) {
                    this.igniteEnemy(enemy, burnDamage * (0.82 + falloff * 0.36), burnDuration, spreadRadius);
                }
            }
        }
    }

    private igniteEnemy(enemy: Enemy, burnDamage: number, burnDuration: number, spreadRadius: number): void {
        const now = this.time.now;
        enemy.burningUntil = Math.max(enemy.burningUntil, now + burnDuration);
        enemy.nextBurnTickAt = Math.min(enemy.nextBurnTickAt || now, now + 60);
        enemy.burnDamage = Math.max(enemy.burnDamage, burnDamage);
        enemy.burnSpreadAt = Math.min(enemy.burnSpreadAt || now, now + 180);
        enemy.burnSpreadRadius = Math.max(enemy.burnSpreadRadius, spreadRadius);
        enemy.body.setFillStyle(0xff7a2f, 1);
    }

    private updateBurningEnemy(enemy: Enemy, time: number): void {
        if (time >= enemy.burningUntil) {
            if (enemy.burnDamage > 0) {
                enemy.burnDamage = 0;
                enemy.burnSpreadRadius = 0;
                if (enemy.motion === 'path') {
                    enemy.body.setFillStyle(enemy.baseColor, 1);
                }
            }
            return;
        }

        enemy.body.setFillStyle(0xff7a2f, 0.86 + Math.sin(time / 90) * 0.12);
        if (time >= enemy.nextBurnTickAt) {
            enemy.nextBurnTickAt = time + 430;
            this.damageEnemy(enemy, enemy.burnDamage, 0xfff35b);
            if (!enemy.alive) {
                return;
            }
            this.spawnSmoke(enemy.body.x, enemy.body.y, 0xffa23a, 0.34);
        }

        if (time >= enemy.burnSpreadAt) {
            enemy.burnSpreadAt = time + 360;
            for (const other of this.enemies) {
                if (!other.alive || other.id === enemy.id || time < other.burningUntil) {
                    continue;
                }
                if (distance({ x: enemy.body.x, y: enemy.body.y }, { x: other.body.x, y: other.body.y }) <= enemy.burnSpreadRadius) {
                    this.igniteEnemy(other, enemy.burnDamage * 0.72, Math.max(1100, enemy.burningUntil - time - 250), enemy.burnSpreadRadius * 0.88);
                    this.chainZap(enemy.body.x, enemy.body.y, other.body.x, other.body.y, 0xffa23a);
                }
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
        this.setPromptStatus(`A word runner slipped through. Lives: ${Math.max(0, this.lives)}.`);
        this.spark(enemy.body.x, enemy.body.y, 0xff5c6c, 10);
        this.removeEnemy(enemy);
    }

    private removeEnemy(enemy: Enemy): void {
        enemy.alive = false;
        enemy.body.destroy();
        enemy.core.destroy();
        enemy.leftEye.destroy();
        enemy.rightEye.destroy();
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
        this.promptText.setText(`The word gate needs a reset after wave ${this.wave}. Try a new tower mix.`);
        this.setPromptStatus('Nice try. The restart button is ready when you want another run.');
        const overlay = this.add.rectangle(GRID_X + GRID_WIDTH / 2, GRID_Y + GRID_HEIGHT / 2, GRID_WIDTH, GRID_HEIGHT, 0x081114, 0.55);
        overlay.setDepth(50);
        const text = this.add.text(overlay.x, overlay.y, 'TRY AGAIN', {
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
        const nextWaveSeconds = this.spawnRemaining > 0 ? Math.max(0, Math.ceil((this.nextSpawnAt - this.time.now) / 1000)) : 0;
        this.hudText.setText(`Lives ${this.lives}\nWave ${this.wave}\nTowers ${this.towers.length}`);
        this.selectedText.setText(`Build pads ask clues.\nCorrect answers build.\nBuilt towers can level up.\nLevel cap: ${MAX_TOWER_LEVEL}`);
        this.waveText.setText(`${this.spawnRemaining} queued\n${this.enemies.length} on the path\nNext in ${nextWaveSeconds}s\n${this.projectiles.length} shots flying`);
        this.updateSettingsButtons();
        this.updateHealthSlider();
    }

    private updateHoverCell(): void {
        const pointer = this.input.activePointer;
        const x = pointer.x;
        const y = pointer.y;
        if (x < GRID_X || x > GRID_X + GRID_WIDTH || y < GRID_Y || y > GRID_Y + GRID_HEIGHT) {
            this.hoverCell.setVisible(false);
            this.hoverPopupText.setVisible(false);
            this.rangePreview.setVisible(false);
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
            this.showRangePreview(tower.x, tower.y, this.towerStats(tower).range, 0xffe38a);
            this.showHoverPopup(x, y, this.hoverTextForTower(tower));
        } else if (buildable && slot) {
            this.showRangePreview(center.x, center.y, TOWER_DEFS[slot.towerKind].range, difficultyColor(slot.word.difficulty));
            this.showHoverPopup(x, y, this.hoverTextForSlot(slot));
        } else {
            this.rangePreview.setVisible(false);
            this.hoverPopupText.setVisible(false);
        }
    }

    private showRangePreview(x: number, y: number, radius: number, color: number): void {
        this.rangePreview.setPosition(x, y);
        this.rangePreview.setRadius(radius);
        this.rangePreview.setFillStyle(color, 0.035);
        this.rangePreview.setStrokeStyle(2, color, 0.24);
        this.rangePreview.setVisible(true);
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
        this.floatingText(tower.x, tower.y - 42, 'PAUSED', '#ffb3bb');
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
