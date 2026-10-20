/*
  games/kraepelin-keep/game/pixelart.ts — bake Phaser textures from the PURE
  pixel-art data in pixelmaps.ts.

  All sprites are registered under FIXED keys (wisp_a, wisp_b, wisp_c, wiz,
  keep, wall, moon, star). Real PNGs can later be loaded under the same keys
  with zero code change — see ART & SFX HOOKUPS in game/tuning.ts.

  The grid data + palette + drawKeep live in pixelmaps.ts (import-free) so the
  hub can render hero art WITHOUT loading Phaser.
*/

import Phaser from "phaser";
import { SPRITES, PIXEL_PALETTE, drawKeep, KEEP_W, KEEP_H } from "../pixelmaps";

/** Bake a spritesheet from string-grid frames. */
function makeSheet(
  scene: Phaser.Scene,
  key: string,
  frames: string[][],
  fw: number,
  fh: number,
): void {
  const n = frames.length;
  frames.forEach((rows, fi) =>
    rows.forEach((row, ri) => {
      if (row.length !== fw) {
        throw new Error(
          `[pixelart] ${key} frame ${fi} row ${ri} length ${row.length} != ${fw}`,
        );
      }
    }),
  );
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const ct = scene.textures.createCanvas(key, fw * n, fh);
  if (!ct) throw new Error(`[pixelart] could not create canvas for ${key}`);
  const ctx = ct.context;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, fw * n, fh);
  for (let fi = 0; fi < n; fi++) {
    const rows = frames[fi];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const color = PIXEL_PALETTE[row[c]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(fi * fw + c, r, 1, 1);
      }
    }
  }
  ct.refresh();
  const tex = scene.textures.get(key);
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  tex.add("__BASE", 0, 0, 0, fw, fh);
}

/** Bake the keep (2 states: pristine + cracked) using drawKeep from pixelmaps. */
function bakeKeep(scene: Phaser.Scene): void {
  const fw = KEEP_W;
  const fh = KEEP_H;
  const n = 2;
  if (scene.textures.exists("keep")) scene.textures.remove("keep");
  const ct = scene.textures.createCanvas("keep", fw * n, fh);
  if (!ct) throw new Error("[pixelart] could not create canvas for keep");
  const ctx = ct.context;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, fw * n, fh);
  drawKeep(ctx, 0, false);
  drawKeep(ctx, fw, true);
  ct.refresh();
  const tex = scene.textures.get("keep");
  tex.add(0, 0, 0, 0, fw, fh);
  tex.add(1, 0, fw, 0, fw, fh);
  tex.add("__BASE", 0, 0, 0, fw, fh);
}

/** Bake every game sprite. Called once from Boot. */
export function bakeAll(scene: Phaser.Scene): void {
  for (const key of Object.keys(SPRITES)) {
    const spec = SPRITES[key];
    makeSheet(scene, key, spec.frames, spec.w, spec.h);
  }
  bakeKeep(scene);
}
