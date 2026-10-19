let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Note {
  freq: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
}

function playNotes(notes: Note[]) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  for (const note of notes) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = note.type ?? 'square';
    osc.frequency.value = note.freq;
    const start = now + (note.delay ?? 0);
    const peak = note.gain ?? 0.12;
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + note.duration + 0.02);
  }
}

let muted = false;
export function setMuted(value: boolean) {
  muted = value;
}
export function isMuted() {
  return muted;
}

function guard(fn: () => void) {
  if (muted) return;
  try {
    fn();
  } catch {
    /* audio unsupported or blocked until user gesture; fail silently */
  }
}

export const sfx = {
  click: () => guard(() => playNotes([{ freq: 440, duration: 0.05, type: 'square', gain: 0.06 }])),
  typeTick: () => guard(() => playNotes([{ freq: 620, duration: 0.03, type: 'square', gain: 0.04 }])),
  exact: () =>
    guard(() =>
      playNotes([
        { freq: 523.25, duration: 0.09, type: 'square' },
        { freq: 783.99, duration: 0.14, delay: 0.09, type: 'square' },
      ]),
    ),
  partial: () => guard(() => playNotes([{ freq: 440, duration: 0.12, type: 'triangle' }])),
  none: () => guard(() => playNotes([{ freq: 150, duration: 0.18, type: 'sawtooth', gain: 0.09 }])),
  win: () =>
    guard(() =>
      playNotes([
        { freq: 523.25, duration: 0.1, type: 'square' },
        { freq: 659.25, duration: 0.1, delay: 0.1, type: 'square' },
        { freq: 783.99, duration: 0.1, delay: 0.2, type: 'square' },
        { freq: 1046.5, duration: 0.3, delay: 0.3, type: 'square' },
      ]),
    ),
  lose: () =>
    guard(() =>
      playNotes([
        { freq: 392, duration: 0.16, type: 'sawtooth' },
        { freq: 329.63, duration: 0.16, delay: 0.16, type: 'sawtooth' },
        { freq: 261.63, duration: 0.3, delay: 0.32, type: 'sawtooth' },
      ]),
    ),
  tierCommon: () => guard(() => playNotes([{ freq: 392, duration: 0.1, type: 'square' }])),
  tierUncommon: () =>
    guard(() =>
      playNotes([
        { freq: 440, duration: 0.08, type: 'square' },
        { freq: 554.37, duration: 0.14, delay: 0.08, type: 'square' },
      ]),
    ),
  tierRare: () =>
    guard(() =>
      playNotes([
        { freq: 523.25, duration: 0.08, type: 'square' },
        { freq: 659.25, duration: 0.08, delay: 0.08, type: 'square' },
        { freq: 880, duration: 0.18, delay: 0.16, type: 'square' },
      ]),
    ),
  tierUltra: () =>
    guard(() =>
      playNotes([
        { freq: 659.25, duration: 0.08, type: 'square' },
        { freq: 783.99, duration: 0.08, delay: 0.08, type: 'square' },
        { freq: 987.77, duration: 0.08, delay: 0.16, type: 'square' },
        { freq: 1318.5, duration: 0.3, delay: 0.24, type: 'square' },
      ]),
    ),
  invalid: () => guard(() => playNotes([{ freq: 180, duration: 0.1, type: 'square', gain: 0.08 }])),
};
