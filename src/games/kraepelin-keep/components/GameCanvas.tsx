"use client";

import dynamic from "next/dynamic";

const PhaserHost = dynamic(() => import("./PhaserHost"), { ssr: false });

type Props = {
  parentRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Client-only wrapper that lazy-loads PhaserHost (and thus Phaser) so the
 * heavy game library never runs through SSR.
 */
export default function GameCanvas({ parentRef }: Props) {
  return <PhaserHost parentRef={parentRef} />;
}
