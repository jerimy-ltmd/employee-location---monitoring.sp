// Audio and vibration utilities for urgent pings and messaging
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * High-urgency alert tone for Urgent Ping
 * Plays an attention-grabbing alternating siren/chime
 */
export function playUrgentPingSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 3 urgent pulses
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = now + i * 0.35;
      const duration = 0.25;

      osc.type = 'sawtooth';
      // Pitch jump
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.exponentialRampToValueAtTime(1320, startTime + duration * 0.7);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    }
  } catch (err) {
    console.warn('Could not play audio alert:', err);
  }
}

/**
 * Gentle chime for new incoming chat message
 */
export function playMessageBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn('Could not play message beep:', err);
  }
}

/**
 * Triggers vibration API if supported by device/browser
 */
export function triggerDeviceVibration() {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Urgent vibration pattern: vibrate 300ms, pause 150ms, vibrate 300ms, pause 150ms, vibrate 600ms
      navigator.vibrate([300, 150, 300, 150, 600]);
    }
  } catch (err) {
    console.warn('Vibration API error:', err);
  }
}
