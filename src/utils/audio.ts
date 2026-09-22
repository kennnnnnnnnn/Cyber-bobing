// 基于 Web Audio API 实现的博饼瓷碗撞击音效与喜庆乐音

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
 * 模拟单个骰子撞击瓷碗的清脆“叮叮”声
 */
export function playDiceClink(frequency = 2200, volume = 0.3) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // 泛音频带模拟白瓷碗共振
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency + (Math.random() * 400 - 200), ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.6, ctx.currentTime + 0.08);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // 忽略音频播放异常
  }
}

/**
 * 模拟连续摇骰子时，6个骰子在瓷碗中激荡翻滚的连续音效
 */
export function playRollingSound(durationMs = 1200) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed > durationMs) {
      clearInterval(interval);
      return;
    }
    // 每次产生1-2个不同音高的碰击声
    const count = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const freq = 1800 + Math.random() * 1600;
      const vol = 0.15 + Math.random() * 0.2;
      playDiceClink(freq, vol);
    }
  }, 45);
}

/**
 * 中奖喜庆欢庆音
 */
export function playWinJingle(isZhuangyuan = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = isZhuangyuan
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98] // 状元高亢乐音 C5, E5, G5, C6, E6, G6
      : [523.25, 659.25, 783.99, 1046.5];                 // 普通中奖乐音

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.45);
    });
  } catch {
    // 忽略异常
  }
}
