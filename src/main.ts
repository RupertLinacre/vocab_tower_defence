import Phaser from 'phaser';
import './style.css';
import { GameScene } from './GameScene';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './layout';

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
