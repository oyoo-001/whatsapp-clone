let ringtoneAudio = null;
let ringtoneUrl = null;
let vibInterval = null;

function getRingtoneUrl() {
  if (ringtoneUrl) return ringtoneUrl;

  const sampleRate = 48000;
  const duration = 1.6;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const w = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cyclePos = t % 1.6;
    let sample = 0;

    if ((cyclePos < 0.45) || (cyclePos >= 0.75 && cyclePos < 1.2)) {
      const ringT = cyclePos < 0.45 ? cyclePos : cyclePos - 0.75;
      const freq = ringT < 0.15 ? 440 : ringT < 0.3 ? 480 : 440;
      sample = Math.sin(2 * Math.PI * freq * t) * 0.35;
      if (ringT < 0.015) sample *= ringT / 0.015;
      if (ringT > 0.4) sample *= Math.max(0, 1 - (ringT - 0.4) / 0.05);
    }

    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  ringtoneUrl = URL.createObjectURL(blob);
  return ringtoneUrl;
}

export const playMessageSound = () => {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    if (c.state === 'suspended') c.resume();
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

    ringtoneAudio = new Audio(getRingtoneUrl());
    ringtoneAudio.loop = true;
    ringtoneAudio.volume = 0.85;
    ringtoneAudio.play().catch(() => {});

    if (navigator.vibrate) {
      const pattern = [400, 200, 400, 600];
      navigator.vibrate(pattern);
      vibInterval = setInterval(() => navigator.vibrate(pattern), 1600);
    }
  } catch {}
};

export const stopRingtone = () => {
  if (ringtoneAudio) {
    ringtoneAudio.pause();
    ringtoneAudio.src = '';
    ringtoneAudio = null;
  }
  if (vibInterval) {
    clearInterval(vibInterval);
    vibInterval = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);
};

export default playMessageSound;