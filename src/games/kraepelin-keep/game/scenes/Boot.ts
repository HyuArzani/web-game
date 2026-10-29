import Phaser from "phaser";
import { bakeAll } from "../pixelart";

/**
 * Boot scene — loads external PNG assets (wizard sprites + spell overlays),
 * bakes procedural pixel sprites as fallback, then hands off to Game.
 *
 * The wizard PNG sheets (wiz_idle, wiz_cast, wiz_gameover) replace the
 * procedural "wiz" texture for rendering. The procedural "wiz" is still
 * baked as a fallback.
 */
export default class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // Load the wizard PNG spritesheets (64x64 transparent RGBA).
    this.load.spritesheet("wiz_idle", "sprites/pixel-wizard/wizard_idle.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("wiz_cast", "sprites/pixel-wizard/wizard_cast.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("wiz_gameover", "sprites/pixel-wizard/wizard_gameover.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    // Load the 4 enemy PNG spritesheets (48x48 per frame, transparent RGBA).
    this.load.spritesheet("enemy_a", "sprites/pixel-wizard/goblin_jetpack.png", { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet("enemy_b", "sprites/pixel-wizard/slime_flyer.png", { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet("enemy_c", "sprites/pixel-wizard/skeleton_wraith.png", { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet("enemy_d", "sprites/pixel-wizard/shadow_bat.png", { frameWidth: 48, frameHeight: 48 });

    // Load the 10 spell-effect overlay PNGs (20x20 transparent).
    for (let d = 0; d <= 9; d++) {
      this.load.image(`spell_${d}`, `sprites/spells/spell_${d}.png`);
    }

    // Load the landscape background (540x960, fills the play area).
    this.load.image("bg_landscape", "sprites/backgrounds/castle_landscape.png");
    // Load the castle PNG (transparent, centered on the wall).
    this.load.image("castle_png", "sprites/castle/castle.png");
    // Load the wall/battlements strip (540x48, sits at WALL_TOP_Y).
    this.load.image("wall_strip", "sprites/castle/wall_strip.png");
  }

  create(): void {
    // Bake procedural sprites as fallback (wisp, keep, wall, moon, star, wiz).
    // The procedural "wiz" key remains as a fallback for wizard rendering.
    try {
      bakeAll(this);
    } catch (e) {
      console.error("[Boot] bakeAll failed:", e);
    }
    this.scene.start("Game");
  }
}
