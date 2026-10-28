/**
 * games/registry.ts — the single source of truth for the arcade.
 *
 * SITE is a one-place rename for the owner later. The hub renders ONLY from
 * this registry — no hardcoded game cards. Adding a future game = a new
 * games/<slug>/ folder + a 3-line route wrapper in app/<slug>/page.tsx + one
 * GAMES entry here.
 */

export type GameStatus = "playable" | "soon";

export type GameMeta = {
  slug: string;
  title: string;
  tagline: string;
  status: GameStatus;
  accent: string;
};

export const SITE = {
  title: "Arcade",
  tagline: "Tiny spell & math games — pick a cartridge",
};

export const GAMES: GameMeta[] = [
  {
    slug: "kraepelin-keep",
    title: "Kraepelin Keep",
    tagline:
      "Defend the keep with math — the last digit of the answer is the spell",
    status: "playable",
    accent: "#ff6b35",
  },
];
