import Phaser from 'phaser';
import wizardIdleUrl from './assets/wizard_idle.png';
import wizardCastUrl from './assets/wizard_cast.png';
import wizardGameOverUrl from './assets/wizard_gameover.png';
import goblinUrl from './assets/goblin_jetpack.png';
import slimeUrl from './assets/slime_flyer.png';
import wraithUrl from './assets/skeleton_wraith.png';
import batUrl from './assets/shadow_bat.png';

const WIZARD_SIZE = 64;
const ENEMY_SIZE = 48;

export class WizardDefenseScene extends Phaser.Scene {
  constructor() { super('WizardDefenseScene'); }
  preload() {
    this.load.spritesheet('wizard-idle', wizardIdleUrl, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wizard-cast', wizardCastUrl, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('wizard-gameover', wizardGameOverUrl, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('goblin', goblinUrl, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('slime', slimeUrl, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('wraith', wraithUrl, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('bat', batUrl, { frameWidth: 48, frameHeight: 48 });
  }
  create() {
    this.createAnimations();
    this.wizard = this.add.sprite(120, 420, 'wizard-idle').setOrigin(0.5, 1).setScale(2);
    this.wizard.play('wizard-idle');
    this.spawnEnemy('goblin', 500, 360);
    this.spawnEnemy('slime', 620, 300);
    this.spawnEnemy('wraith', 740, 350);
    this.spawnEnemy('bat', 860, 280);
    this.input.keyboard.on('keydown-SPACE', () => this.castSpell());
    this.input.keyboard.on('keydown-G', () => this.gameOver());
  }
  createAnimations() {
    this.anims.create({ key: 'wizard-idle', frames: this.anims.generateFrameNumbers('wizard-idle', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'wizard-cast', frames: this.anims.generateFrameNumbers('wizard-cast', { start: 0, end: 3 }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'wizard-gameover', frames: this.anims.generateFrameNumbers('wizard-gameover', { start: 0, end: 2 }), frameRate: 8, repeat: 0 });
    this.createEnemyAnimations('goblin', 4);
    this.createEnemyAnimations('slime', 3);
    this.createEnemyAnimations('wraith', 3);
    this.createEnemyAnimations('bat', 3);
  }
  createEnemyAnimations(key, columns) {
    const rows = { enter: 0, idle: 1, attack: 2, death: 3 };
    const counts = { enter: Math.min(columns, 3), idle: columns, attack: Math.min(columns, 3), death: columns };
    for (const [name, count] of Object.entries(counts)) {
      const row = rows[name];
      const frames = Array.from({ length: count }, (_, column) => ({ key, frame: row * columns + column }));
      this.anims.create({ key: `${key}-${name}`, frames, frameRate: name === 'idle' ? 6 : 10, repeat: name === 'idle' ? -1 : 0 });
    }
  }
  spawnEnemy(key, x, y) {
    const enemy = this.add.sprite(x, y, key).setOrigin(0.5, 1).setScale(2);
    enemy.play(`${key}-enter`);
    enemy.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => enemy.play(`${key}-idle`));
    return enemy;
  }
  castSpell() {
    if (this.wizard.anims.currentAnim?.key === 'wizard-cast') return;
    this.wizard.play('wizard-cast');
    this.wizard.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.wizard.play('wizard-idle'));
  }
  gameOver() {
    this.wizard.play('wizard-gameover');
    this.wizard.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.wizard.setTint(0x777777));
  }
}

export const phaserConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-root',
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b1630',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [WizardDefenseScene],
};
