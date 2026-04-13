import { useCallback, useEffect, useRef, useState } from 'react';

export type AmbientSoundType = 'none' | 'rain' | 'ocean' | 'cafe' | 'forest' | 'fireplace';

export interface AmbientSoundInfo {
  id: AmbientSoundType;
  label: string;
  emoji: string;
}

export const AMBIENT_SOUNDS: AmbientSoundInfo[] = [
  { id: 'none', label: 'Silêncio', emoji: '🔇' },
  { id: 'rain', label: 'Chuva', emoji: '🌧️' },
  { id: 'ocean', label: 'Oceano', emoji: '🌊' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'forest', label: 'Floresta', emoji: '🌲' },
  { id: 'fireplace', label: 'Lareira', emoji: '🔥' },
];

const STORAGE_KEY = 'eduflow_ambient_sound';
const VOLUME_KEY = 'eduflow_ambient_volume';

interface SoundGraph {
  sources: AudioBufferSourceNode[];
  oscillators: OscillatorNode[];
}

function createNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const size = seconds * ctx.sampleRate;
  const buffer = ctx.createBuffer(2, size, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function buildRain(ctx: AudioContext, noise: AudioBuffer, out: GainNode): SoundGraph {
  const sources: AudioBufferSourceNode[] = [];

  const s1 = ctx.createBufferSource();
  s1.buffer = noise; s1.loop = true;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'highpass'; f1.frequency.value = 5000; f1.Q.value = 0.3;
  const g1 = ctx.createGain(); g1.gain.value = 0.06;
  s1.connect(f1).connect(g1).connect(out); s1.start(); sources.push(s1);

  const s2 = ctx.createBufferSource();
  s2.buffer = noise; s2.loop = true;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = 2000; f2.Q.value = 0.4;
  const g2 = ctx.createGain(); g2.gain.value = 0.12;
  s2.connect(f2).connect(g2).connect(out); s2.start(); sources.push(s2);

  const s3 = ctx.createBufferSource();
  s3.buffer = noise; s3.loop = true;
  const f3 = ctx.createBiquadFilter();
  f3.type = 'lowpass'; f3.frequency.value = 400; f3.Q.value = 0.5;
  const g3 = ctx.createGain(); g3.gain.value = 0.08;
  s3.connect(f3).connect(g3).connect(out); s3.start(); sources.push(s3);

  return { sources, oscillators: [] };
}

function buildOcean(ctx: AudioContext, noise: AudioBuffer, out: GainNode): SoundGraph {
  const sources: AudioBufferSourceNode[] = [];
  const oscillators: OscillatorNode[] = [];

  const s1 = ctx.createBufferSource();
  s1.buffer = noise; s1.loop = true;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'lowpass'; f1.frequency.value = 800; f1.Q.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine'; lfo.frequency.value = 0.08;
  const lfoG = ctx.createGain(); lfoG.gain.value = 400;
  lfo.connect(lfoG).connect(f1.frequency); lfo.start();
  oscillators.push(lfo);
  const g1 = ctx.createGain(); g1.gain.value = 0.18;
  s1.connect(f1).connect(g1).connect(out); s1.start(); sources.push(s1);

  const s2 = ctx.createBufferSource();
  s2.buffer = noise; s2.loop = true;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'highpass'; f2.frequency.value = 3000;
  const g2 = ctx.createGain(); g2.gain.value = 0.03;
  s2.connect(f2).connect(g2).connect(out); s2.start(); sources.push(s2);

  return { sources, oscillators };
}

function buildCafe(ctx: AudioContext, noise: AudioBuffer, out: GainNode): SoundGraph {
  const sources: AudioBufferSourceNode[] = [];

  const s1 = ctx.createBufferSource();
  s1.buffer = noise; s1.loop = true;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'lowpass'; f1.frequency.value = 1200; f1.Q.value = 0.3;
  const g1 = ctx.createGain(); g1.gain.value = 0.09;
  s1.connect(f1).connect(g1).connect(out); s1.start(); sources.push(s1);

  const s2 = ctx.createBufferSource();
  s2.buffer = noise; s2.loop = true;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = 3000; f2.Q.value = 1.5;
  const g2 = ctx.createGain(); g2.gain.value = 0.025;
  s2.connect(f2).connect(g2).connect(out); s2.start(); sources.push(s2);

  return { sources, oscillators: [] };
}

function buildForest(ctx: AudioContext, noise: AudioBuffer, out: GainNode): SoundGraph {
  const sources: AudioBufferSourceNode[] = [];
  const oscillators: OscillatorNode[] = [];

  const s1 = ctx.createBufferSource();
  s1.buffer = noise; s1.loop = true;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = 600; f1.Q.value = 0.5;
  const windLfo = ctx.createOscillator();
  windLfo.type = 'sine'; windLfo.frequency.value = 0.15;
  const windG = ctx.createGain(); windG.gain.value = 200;
  windLfo.connect(windG).connect(f1.frequency); windLfo.start();
  oscillators.push(windLfo);
  const g1 = ctx.createGain(); g1.gain.value = 0.1;
  s1.connect(f1).connect(g1).connect(out); s1.start(); sources.push(s1);

  const s2 = ctx.createBufferSource();
  s2.buffer = noise; s2.loop = true;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'highpass'; f2.frequency.value = 6000;
  const g2 = ctx.createGain(); g2.gain.value = 0.03;
  s2.connect(f2).connect(g2).connect(out); s2.start(); sources.push(s2);

  return { sources, oscillators };
}

function buildFireplace(ctx: AudioContext, noise: AudioBuffer, out: GainNode): SoundGraph {
  const sources: AudioBufferSourceNode[] = [];
  const oscillators: OscillatorNode[] = [];

  const s1 = ctx.createBufferSource();
  s1.buffer = noise; s1.loop = true;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'lowpass'; f1.frequency.value = 500; f1.Q.value = 0.8;
  const g1 = ctx.createGain(); g1.gain.value = 0.12;
  s1.connect(f1).connect(g1).connect(out); s1.start(); sources.push(s1);

  const s2 = ctx.createBufferSource();
  s2.buffer = noise; s2.loop = true;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'highpass'; f2.frequency.value = 4000; f2.Q.value = 1.0;
  const crackleLfo = ctx.createOscillator();
  crackleLfo.type = 'sawtooth'; crackleLfo.frequency.value = 3;
  const crackleG = ctx.createGain(); crackleG.gain.value = 0.04;
  const g2 = ctx.createGain(); g2.gain.value = 0.04;
  crackleLfo.connect(crackleG).connect(g2.gain); crackleLfo.start();
  oscillators.push(crackleLfo);
  s2.connect(f2).connect(g2).connect(out); s2.start(); sources.push(s2);

  const s3 = ctx.createBufferSource();
  s3.buffer = noise; s3.loop = true;
  const f3 = ctx.createBiquadFilter();
  f3.type = 'bandpass'; f3.frequency.value = 800; f3.Q.value = 0.4;
  const g3 = ctx.createGain(); g3.gain.value = 0.07;
  s3.connect(f3).connect(g3).connect(out); s3.start(); sources.push(s3);

  return { sources, oscillators };
}

const BUILDERS: Record<Exclude<AmbientSoundType, 'none'>, typeof buildRain> = {
  rain: buildRain,
  ocean: buildOcean,
  cafe: buildCafe,
  forest: buildForest,
  fireplace: buildFireplace,
};

export function useAmbientSound() {
  const [soundType, setSoundType] = useState<AmbientSoundType>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v && AMBIENT_SOUNDS.some(s => s.id === v)) return v as AmbientSoundType;
    } catch { /* ignore */ }
    return 'none';
  });

  const [volume, setVolume] = useState(() => {
    try {
      const v = localStorage.getItem(VOLUME_KEY);
      if (v) { const n = parseFloat(v); if (!isNaN(n)) return n; }
    } catch { /* ignore */ }
    return 0.5;
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const graphRef = useRef<SoundGraph | null>(null);

  const cleanup = useCallback(() => {
    const g = graphRef.current;
    if (!g) return;
    g.sources.forEach(s => { try { s.stop(); } catch { /* */ } });
    g.oscillators.forEach(o => { try { o.stop(); } catch { /* */ } });
    graphRef.current = null;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, soundType);
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch { /* ignore */ }
  }, [soundType, volume]);

  useEffect(() => {
    cleanup();
    if (soundType === 'none') return;

    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctxRef.current = new AC();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    if (!masterRef.current) {
      masterRef.current = ctx.createGain();
      masterRef.current.connect(ctx.destination);
    }
    masterRef.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.3);

    const noise = createNoiseBuffer(ctx, 4);
    const builder = BUILDERS[soundType];
    if (builder) graphRef.current = builder(ctx, noise, masterRef.current);

    return () => cleanup();
  }, [soundType, cleanup]);

  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.1);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      cleanup();
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
        masterRef.current = null;
      }
    };
  }, [cleanup]);

  return { soundType, setSoundType, volume, setVolume };
}
