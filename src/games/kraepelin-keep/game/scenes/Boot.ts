import Phaser from "phaser";
import { bakeAll } from "../pixelart";

/**
 * Boot scene — loads external PNG assets (wizard sprites + spell overlays),
 * bakes procedural pixel sprites as fallback, then hands off to Game.
 *
 * The wizard PNGs (wiz_idle, wiz_cast) replace the procedural "wiz" texture
 * for rendering. The procedural "wiz" is still baked as a fallback but the
 * Game scene uses the PNG textures by default.
 */
export default class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // Load the wizard PNG sprites (24x32 transparent RGBA).
    this.load.image("wiz_idle", "sprites/wizard/wiz_idle_a.png");
    this.load.image("wiz_cast", "sprites/wizard/wiz_cast_1.png");

    // Load the 4 enemy PNG spritesheets (24x24 per frame, transparent RGBA).
    this.load.spritesheet("enemy_a", "sprites/enemies/goblin_jetpack_sheet.png", { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet("enemy_b", "sprites/enemies/slime_flyer_sheet.png", { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet("enemy_c", "sprites/enemies/skeleton_wraith_sheet.png", { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet("enemy_d", "sprites/enemies/shadow_bat_sheet.png", { frameWidth: 24, frameHeight: 24 });

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
    // The procedural "wiz" key is kept but Game.ts uses "wiz_idle"/"wiz_cast"
    // PNG textures for the actual wizard rendering.
    try {
      bakeAll(this);
    } catch (e) {
      console.error("[Boot] bakeAll failed:", e);
    }
    this.scene.start("Game");
  }
}
