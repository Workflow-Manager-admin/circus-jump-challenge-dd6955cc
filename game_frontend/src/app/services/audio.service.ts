import { Injectable } from '@angular/core';

@Injectable()
export class GameAudioService {
  private enabled: boolean = true;
  private musicTrack?: HTMLAudioElement;
  private notes: {[key: string]: number} = {
    jump: 330,
    menu: 523,
    coin: 587,
    death: 155,
    win: 784
  };

  isMusicOn() { return this.enabled; }
  toggleMute() { this.enabled = !this.enabled; this.stopMusic(); }
  stopMusic() { if (this.musicTrack !== undefined) { this.musicTrack.pause(); this.musicTrack = undefined; } }

  playMusic() {
    if (!this.enabled || typeof globalThis === 'undefined' || typeof (globalThis as any).Audio === 'undefined') return;
    if (this.musicTrack) { this.musicTrack.currentTime = 0; this.musicTrack.play(); return; }
    const melody = [
        [392,0.19],[392,0.19],[392,0.31],[233,0.17],[349,0.31],[392,0.27],
        [523,0.37],[392,0.19],[349,0.17],[392,0.11],[392,0.13],[392,0.29],
        [311,0.11],[392,0.24],[523,0.29],[392,0.19],[329,0.11],[293,0.27],[392,0.33]
    ];
    let ctx = new ((globalThis as any).AudioContext || (globalThis as any).webkitAudioContext)();
    let audioBuffer = ctx.createBuffer(1, ctx.sampleRate*8, ctx.sampleRate);
    let data = audioBuffer.getChannelData(0);
    let idx = 0;
    melody.forEach(([freq, dur]) => {
      const length = Math.floor(ctx.sampleRate*dur);
      for(let i=0;i<length;++i) {
        data[idx++] = Math.sin(2*Math.PI*freq*(i/ctx.sampleRate)) * Math.exp(-i/length) * 0.42;
      }
    });
    for(;idx<data.length;++idx) data[idx]=0;
    let blob = this.bufferToWav(audioBuffer);
    let url = URL.createObjectURL(blob);
    this.musicTrack = typeof (globalThis as any).Audio !== 'undefined' ? new (globalThis as any).Audio(url) : undefined;
    if (this.musicTrack) {
      this.musicTrack.loop = true;
      this.musicTrack.volume = 0.14;
      this.musicTrack.play();
    }
  }

  playJump() { this.playBeep('jump'); }
  playScore() { this.playBeep('coin'); }
  playMenuSelect() { this.playBeep('menu'); }
  playMenuBack() { this.playBeep('menu'); }
  playDeath() { this.playBeep('death'); }
  playLevelComplete() { this.playBeep('win'); }

  private playBeep(kind: string) {
    if (!this.enabled || typeof globalThis === 'undefined' || typeof (globalThis as any).AudioContext === 'undefined') return;
    let ctx = new ((globalThis as any).AudioContext || (globalThis as any).webkitAudioContext)();
    let osc = ctx.createOscillator();
    let gain = ctx.createGain();
    osc.type = (kind==='death')?'triangle':(kind==='coin'?'square':'sine');
    osc.frequency.value = this.notes[kind] || 392;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.16;
    osc.start();
    osc.stop(ctx.currentTime + 0.17);
    osc.onended = () => ctx.close();
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    let len = buffer.length * buffer.numberOfChannels * 2 + 44;
    let view = new DataView(new ArrayBuffer(len));
    let offset = 0;
    function writeString(view:any, offset:number, str:string) {
      for(let i=0;i<str.length;++i) view.setUint8(offset+i, str.charCodeAt(i));
    }
    writeString(view, 0, 'RIFF'); view.setUint32(4, 36+buffer.length*2, true);
    writeString(view, 8, 'WAVE'); writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate*2, true);
    view.setUint16(32, buffer.numberOfChannels*2, true);
    view.setUint16(34, 16, true); writeString(view, 36, 'data');
    view.setUint32(40, buffer.length*2, true); offset = 44;
    for(let i=0;i<buffer.length;++i) {
      let s = Math.max(-1, Math.min(1, buffer.getChannelData(0)[i]));
      view.setInt16(offset, s<0?s*0x8000:s*0x7fff, true); offset+=2;
    }
    return new Blob([view.buffer], {type:'audio/wav'});
  }
}
