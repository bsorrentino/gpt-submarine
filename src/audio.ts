import type { EffectKind } from './game.ts';
export class AudioEngine {
  context?: AudioContext;
  enabled=false;
  async toggle() {
    this.context??=new AudioContext();
    await this.context.resume();this.enabled=!this.enabled;return this.enabled;
  }
  play(kind:EffectKind) {
    if(!this.enabled||!this.context)return;
    const ctx=this.context,duration=kind==='fire'?1.5:kind==='underwater'?.9:.45;
    const buffer=ctx.createBuffer(1,ctx.sampleRate*duration,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='underwater'?230:kind==='fire'?900:2400;
    gain.gain.value=kind==='splash'?.12:.22;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
    if(kind!=='splash') {const osc=ctx.createOscillator(),envelope=ctx.createGain();osc.frequency.setValueAtTime(95,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(25,ctx.currentTime+duration);envelope.gain.setValueAtTime(.2,ctx.currentTime);envelope.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(envelope);envelope.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);}
  }
}
