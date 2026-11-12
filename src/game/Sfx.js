// Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio).
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.step = 0;
  }

  // Precisa ser criado/retomado após um gesto do usuário (tecla)
  #ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  #tone(freq, dur, { type = 'square', vol = 0.06, delay = 0, slideTo = null } = {}) {
    if (this.muted || !this.#ensure()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  wakka() {
    this.step ^= 1;
    this.#tone(this.step ? 420 : 300, 0.07, { type: 'triangle', vol: 0.08 });
  }
  power() {
    this.#tone(180, 0.35, { type: 'sawtooth', slideTo: 700, vol: 0.07 });
  }
  ghost() {
    this.#tone(300, 0.25, { type: 'square', slideTo: 1200, vol: 0.08 });
  }
  death() {
    for (let i = 0; i < 6; i++) this.#tone(600 - i * 70, 0.14, { type: 'sawtooth', delay: i * 0.13, slideTo: 200 });
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.#tone(f, 0.18, { delay: i * 0.14, vol: 0.08 }));
  }
  life() {
    [880, 1175].forEach((f, i) => this.#tone(f, 0.12, { delay: i * 0.1 }));
  }
  start() {
    [392, 523, 659, 784].forEach((f, i) => this.#tone(f, 0.12, { delay: i * 0.09 }));
  }
}
