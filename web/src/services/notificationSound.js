let ctx = null;
let ringOsc = null;
let ringGain = null;

const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

export const playMessageSound = () => {
  try {
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.08);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {}
};

export const playRingtone = () => {
  try {
    stopRingtone();
    const c = getCtx();
    ringGain = c.createGain();
    ringGain.gain.setValueAtTime(0.4, c.currentTime);
    ringGain.connect(c.destination);

    const playPattern = () => {
      if (!ringGain) return;
      const now = c.currentTime;
      // Two-tone ring pattern: 440Hz + 480Hz alternating
      // Ring 1s, pause 2s (typical phone ring)
      for (let i = 0; i < 3; i++) {
        const t = now + i * 3;
        const osc440 = c.createOscillator();
        osc440.type = 'sine';
        osc440.frequency.setValueAtTime(440, t);
        osc440.connect(ringGain);
        osc440.start(t);
        osc440.stop(t + 0.15);

        const osc480 = c.createOscillator();
        osc480.type = 'sine';
        osc480.frequency.setValueAtTime(480, t + 0.15);
        osc480.connect(ringGain);
        osc480.start(t + 0.15);
        osc480.stop(t + 0.3);

        const osc440b = c.createOscillator();
        osc440b.type = 'sine';
        osc440b.frequency.setValueAtTime(440, t + 0.3);
        osc440b.connect(ringGain);
        osc440b.start(t + 0.3);
        osc440b.stop(t + 0.4);

        const osc480b = c.createOscillator();
        osc480b.type = 'sine';
        osc480b.frequency.setValueAtTime(480, t + 0.4);
        osc480b.connect(ringGain);
        osc480b.start(t + 0.4);
        osc480b.stop(t + 0.5);
      }
    };

    playPattern();
    ringOsc = setInterval(playPattern, 3000);
  } catch {}
};

export const stopRingtone = () => {
  if (ringOsc) {
    clearInterval(ringOsc);
    ringOsc = null;
  }
  if (ringGain) {
    ringGain.disconnect();
    ringGain = null;
  }
};

export default playMessageSound;