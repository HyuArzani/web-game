"use client";

import dynamic from "next/dynamic";

/**
 * Thin client wrapper for the Kraepelin Keep game route.
 * dynamic-imports the game entry with ssr:false so Phaser loads only here.
 * A client page CANNOT export metadata — that lives in layout.tsx above.
 */
const KraepelinKeepGame = dynamic(
  () => import("@/games/kraepelin-keep").then((m) => m.KraepelinKeepGame),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14110f",
          color: "#f2e9d8",
          fontFamily: "var(--font-silkscreen), monospace",
          letterSpacing: 4,
        }}
      >
        LOADING...
      </div>
    ),
  },
);

export default function KraepelinKeepPage() {
  return <KraepelinKeepGame />;
}
