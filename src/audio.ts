import type { SoundKind } from './game.ts';

// Short, stepped pitch sequences and clocked LFSR noise evoke 1980s sound chips.
const patches: Record<SoundKind, { duration: number; notes: number[]; noise: number; clock: number; decay: number }> = {
  'charge-launch': { duration: .18, notes: [720, 540, 360, 180, 90], noise: .25, clock: 3200, decay: 1.6 },
  'charge-splash': { duration: .28, notes: [280, 190, 120, 70], noise: .85, clock: 6000, decay: 2.2 },
  'torpedo-surface': { duration: .48, notes: [900, 660, 420, 210, 105, 55], noise: .7, clock: 9000, decay: 1.8 },
  'ship-hit': { duration: 1.25, notes: [150, 115, 85, 65, 45, 32, 24], noise: .8, clock: 4200, decay: 1.4 },
  'sub-hit': { duration: .65, notes: [240, 120, 60, 330, 440, 660], noise: .5, clock: 1800, decay: 1.5 },
  'charge-miss': { duration: .4, notes: [160, 120, 85, 55, 35], noise: .35, clock: 900, decay: 2.5 },
};

export class AudioEngine {
  context?: AudioContext;
  enabled = false;
  private buffers = new Map<SoundKind, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private output?: GainNode;

  async toggle() {
    if (this.enabled) {
      this.enabled = false;
      for (const voice of this.voices) voice.stop();
      this.voices.clear();
      return false;
    }
    this.context ??= new AudioContext();
    await this.context.resume();
    if (!this.output) {
      this.output = this.context.createGain();
      // Twelve simultaneous voices remain below full scale, even when aligned.
      this.output.gain.value = .25;
      this.output.connect(this.context.destination);
    }
    this.enabled = true;
    return true;
  }

  private synthesize(kind: SoundKind): AudioBuffer {
    const ctx = this.context!, patch = patches[kind];
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * patch.duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let phase = 0, noisePhase = 0, register = 0x7fff, noise = 1;
    for (let i = 0; i < data.length; i++) {
      const progress = i / data.length;
      const note = patch.notes[Math.min(patch.notes.length - 1, Math.floor(progress * patch.notes.length))];
      phase = (phase + note / ctx.sampleRate) % 1;
      noisePhase += patch.clock * (1 - .65 * progress) / ctx.sampleRate;
      if (noisePhase >= 1) {
        noisePhase %= 1;
        register = (register >> 1) | (((register ^ (register >> 1)) & 1) << 14);
        noise = (register & 1) * 2 - 1;
      }
      const tone = phase < .5 ? 1 : -1;
      const envelope = Math.min(1, i / (ctx.sampleRate * .004)) * Math.pow(1 - progress, patch.decay);
      // Quantization adds a little 8-bit grit; the envelope avoids endpoint clicks.
      const sample = Math.round((tone * (1 - patch.noise) + noise * patch.noise) * 31) / 31;
      data[i] = sample * envelope * .3;
    }
    return buffer;
  }

  play(kind: SoundKind) {
    if (!this.enabled || !this.context || this.context.state !== 'running' || !this.output) return;
    if (!this.buffers.has(kind)) this.buffers.set(kind, this.synthesize(kind));
    if (this.voices.size >= 12) {
      const oldest = this.voices.values().next().value!;
      oldest.stop();
      this.voices.delete(oldest);
    }
    const source = this.context.createBufferSource();
    source.buffer = this.buffers.get(kind)!;
    source.connect(this.output);
    this.voices.add(source);
    source.onended = () => { source.disconnect(); this.voices.delete(source); };
    source.start();
  }
}
