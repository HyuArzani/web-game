'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { phaserConfig } from './WizardDefenseScene';
export default function PixelWizardGame() {
  const gameRef = useRef(null);
  useEffect(() => {
    if (!gameRef.current) gameRef.current = new Phaser.Game(phaserConfig);
    return () => { gameRef.current?.destroy(true); gameRef.current = null; };
  }, []);
  return <div id="phaser-root" style={{ width: '100%', height: '100vh' }} />;
}
