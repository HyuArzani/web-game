import Phaser from "phaser";
import { bakeAll } from "../pixelart";

/**
 * Boot scene — bakes all pixel sprites into canvas textures (fixed keys),
 * then hands off to the Game scene. No external assets are loaded.
 */
export default class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    try {
      bakeAll(this);
    } catch (e) {
      // Surface any pixel-art baking failure loudly.
      console.error("[Boot] bakeAll failed:", e);
    }
    this.scene.start("Game");
  }
}
