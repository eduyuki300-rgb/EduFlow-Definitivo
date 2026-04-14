// Audio Singleton to prevent memory leaks and AudioContext exhaustion
let sharedAudioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) sharedAudioContext = new AC();
  }
  return sharedAudioContext;
};

export const playSuccessSound = (isCompletion = false) => {
  try {
    if (isCompletion && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
    
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Resume context if suspended (common in browsers)
    if (ctx.state === 'suspended') void ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isCompletion) {
      // More celebratory sound for completion
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Standard chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    }
  } catch (e) {
    console.error('[Audio] Play failed:', e);
  }
};
