/*
Circus Charlie style Level-1 logic, retro pixel-art, circus palette
*/
import { Injectable } from '@angular/core';

// Types for positions, objects, etc.
export interface Vec {
  x: number;
  y: number;
}
export interface Obstacle {
  x: number;    // for scrolling
  y: number;
  width: number;
  height: number;
  sprite: string;
  kind: 'fire' | 'animal';
  active: boolean;
  dx: number;
}

export interface GameState {
  score: number;
  highScore: number;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    jumping: boolean;
    jumpTime: number;
    width: number;
    height: number;
    alive: boolean;
    frame: number;
    direction: 'right' | 'left';
  };
  obstacles: Obstacle[];
  tick: number;
  isGameOver: boolean;
  isLevelComplete: boolean;
  groundY: number;
  worldOffset: number;
  winLine: number;
}

@Injectable()
export class GameService {
  public state: GameState;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  private parent: any;
  private canvasW = 430;
  private canvasH = 240;

  private controls = {
    left: false,
    right: false,
    jump: false,
  };

  constructor() {
    this.state = this.defaultState();
  }

  // PUBLIC_INTERFACE
  attachCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, parentRef: any) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.parent = parentRef;
    this.updateCanvasSize();
  }

  // PUBLIC_INTERFACE
  updateCanvasSize() {
    if (typeof globalThis !== 'undefined' && globalThis.innerWidth && globalThis.innerHeight) {
      const maxW = Math.min(globalThis.innerWidth - 24, 430);
      const maxH = Math.min(globalThis.innerHeight - 120, 240);
      this.canvas.width = maxW;
      this.canvas.height = maxH;
      this.canvasW = maxW;
      this.canvasH = maxH;
    }
  }

  // PUBLIC_INTERFACE
  init() {
    this.state = this.defaultState();
    this.initObstacles();
  }

  private defaultState(): GameState {
    let highScore = 0;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      const raw = globalThis.localStorage.getItem('circus_highscore');
      highScore = raw ? parseInt(raw, 10) || 0 : 0;
    }
    return {
      score: 0,
      highScore,
      player: {
        x: 25, y: 186, vx: 0, vy: 0, jumping: false, jumpTime: 0, width: 27, height: 34, alive: true, frame: 0, direction: 'right'
      },
      obstacles: [],
      tick: 0,
      isGameOver: false,
      isLevelComplete: false,
      groundY: 186,
      worldOffset: 0,
      winLine: 2000
    };
  }

  private initObstacles() {
    const obs: Obstacle[] = [];
    let pos = 125;
    for (let i = 0; i < 14; ++i) {
      if (i % 2 === 0) {
        obs.push({
          x: pos, y: 182, width: 34, height: 34,
          kind: 'fire', active: true, dx: (i%4===0)? (Math.random()*1.8+0.8)*(Math.random()>.7? (Math.random()>.5?1:-1):0): 0,
          sprite: 'fire'
        });
      } else {
        obs.push({
          x: pos, y: 192, width: 36, height: 26,
          kind: 'animal', active: true, dx: (Math.random()>.5)? ((Math.random()>.5?1:-1)*Math.random()*2.4): 0,
          sprite: 'lion'
        });
      }
      pos += 75 + Math.round(Math.random() * 48);
    }
    this.state.obstacles = obs;
  }

  update() {
    const st = this.state;
    st.tick++;
    if (this.controls.left) {
      st.player.vx = -2.2;
      st.player.direction = 'left';
    } else if (this.controls.right) {
      st.player.vx = 3.2;
      st.player.direction = 'right';
    } else {
      st.player.vx *= 0.78;
      if (Math.abs(st.player.vx) < 0.15) st.player.vx = 0;
    }
    if (this.controls.jump && !st.player.jumping) {
      st.player.jumping = true;
      st.player.vy = -7.7;
      st.player.jumpTime = 0;
      this.parent.audio.playJump();
    }
    if (st.player.jumping) {
      st.player.jumpTime++;
      if (st.player.jumpTime > 22) st.player.vy += 0.22;
      else st.player.vy += 0.38;
    } else if (st.player.y < st.groundY) {
      st.player.vy += 0.85;
    }
    st.player.x += st.player.vx;
    st.player.y += st.player.vy;
    if (st.player.x > this.canvasW/2 && st.worldOffset < st.winLine-this.canvasW*0.5) {
      st.worldOffset += st.player.x - this.canvasW/2;
      st.player.x = this.canvasW/2;
    }
    if (st.player.y > st.groundY) {
      st.player.y = st.groundY;
      st.player.vy = 0;
      st.player.jumping = false;
      st.player.jumpTime = 0;
    }
    st.player.y = Math.min(st.player.y, st.groundY);
    st.obstacles.forEach(o => {
      o.x += o.dx;
      if ((o.dx !== 0) && (o.x < 30 || o.x > st.winLine-50)) o.dx *= -1;
      if (o.active && this.aabb(
        st.player.x+2, st.player.y+8, st.player.width-6, st.player.height-14,
        o.x-st.worldOffset, o.y, o.width, o.height
      )) {
        st.player.alive = false;
        st.isGameOver = true;
        if (st.score > st.highScore) {
          st.highScore = st.score;
          if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
            globalThis.localStorage.setItem('circus_highscore', '' + st.highScore);
          }
        }
        this.parent.audio.playDeath();
      }
      if (o.active && (st.player.x-st.worldOffset > o.x+o.width)) {
        st.score += (o.kind==='fire'? 30 : 40);
        o.active = false;
        this.parent.audio.playScore();
      }
    });
    if (st.player.x+st.worldOffset > st.winLine-8) {
      st.isLevelComplete = true;
      st.highScore = Math.max(st.score, st.highScore);
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        globalThis.localStorage.setItem('circus_highscore', '' + st.highScore);
      }
    }
  }

  private aabb(ax:number, ay:number, aw:number, ah:number, bx:number, by:number, bw:number, bh:number): boolean {
    return (ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by);
  }

  render() {
    const ctx = this.ctx, st = this.state;
    ctx.clearRect(0,0,this.canvasW,this.canvasH);
    let grad = ctx.createLinearGradient(0, 0, 0, this.canvasH);
    grad.addColorStop(0, '#ffd600'); grad.addColorStop(0.85, '#e65100');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,this.canvasW,this.canvasH);
    ctx.fillStyle = "#caa058";
    ctx.fillRect(0,st.groundY+24,this.canvasW, this.canvasH-st.groundY-24);
    ctx.fillStyle = "#ffd600";
    ctx.fillRect(0, st.groundY+18, this.canvasW, 8);
    ctx.strokeStyle = "#22007b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0,st.groundY+18);
    ctx.lineTo(this.canvasW,st.groundY+18);
    ctx.stroke();
    for(let i=0;i<8;++i) {
      ctx.save();
      ctx.strokeStyle = "#e65100";
      ctx.lineWidth = 7;
      ctx.beginPath();
      let x = 35+i*62-(st.worldOffset%62);
      ctx.moveTo(x,0);
      ctx.lineTo(x,this.canvasH);
      ctx.stroke();
      ctx.restore();
    }
    st.obstacles.forEach(o => {
      const ox = o.x - st.worldOffset;
      if (o.kind === 'fire') {
        this.drawFireRing(ctx, ox, o.y, o.dx != 0);
      }
      if (o.kind === 'animal') {
        this.drawLion(ctx, ox, o.y, o.active);
      }
    });
    ctx.save();
    let fx = st.winLine-st.worldOffset;
    ctx.globalAlpha = 0.83;
    ctx.fillStyle = "#1565c0";
    ctx.fillRect(fx, st.groundY-60, 13, 70);
    ctx.fillStyle = "#ffd600";
    ctx.font = "bold 27px Arial, monospace";
    ctx.rotate(-0.04);
    ctx.fillText("GOAL!", fx-14, st.groundY-15);
    ctx.restore();
    this.drawAcrobat(ctx, st.player.x, st.player.y, st.player.jumping, st.player.direction);
    ctx.save();
    ctx.globalAlpha = 0.29;
    ctx.font = "22px Arial";
    ctx.fillStyle = "#22007b";
    ctx.fillText("Circus Jump Challenge", 40, 34);
    ctx.restore();
  }

  private drawAcrobat(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    jumping: boolean,
    direction: 'right' | 'left'
  ) {
    ctx.save();
    ctx.translate(x, y);
    if (direction === 'left') ctx.scale(-1, 1);
    ctx.fillStyle = (jumping)? "#ffd600" : "#e65100";
    ctx.fillRect(-10, 2, 22, 22);
    ctx.beginPath();
    ctx.arc(0, -8, 10, 0, Math.PI*2);
    ctx.fillStyle = "#ffd600";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -12, 8, Math.PI, 2*Math.PI);
    ctx.fillStyle="#1565c0";
    ctx.fill();
    ctx.strokeStyle="#1565c0";
    ctx.lineWidth=2.5; ctx.beginPath();
    ctx.arc(-3, -14, 2.6, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle="#22007b";
    ctx.lineWidth=3.5;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.lineTo(-15, -3 + (jumping? -5:4));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.lineTo(15, 1+(jumping? -7:2));
    ctx.stroke();
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(-7, 16);
    ctx.lineTo(-13, 34 + (jumping? -6:3));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, 17);
    ctx.lineTo(13, 34 + (jumping? -4:6));
    ctx.stroke();
    ctx.restore();
  }

  private drawLion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    active: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = active? "#e65100" : "#aaa";
    ctx.fillRect(-16, 9, 34, 15);
    ctx.beginPath();
    ctx.arc(-5,6,13,0,2*Math.PI);
    ctx.fillStyle="#d98a0f";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-3,6,9,0,2*Math.PI);
    ctx.fillStyle="#ffd600";
    ctx.fill();
    ctx.fillRect(-6,12,7,4);
    ctx.fillStyle="#22007b";
    ctx.fillRect(-15,13,4,6);
    ctx.beginPath();
    ctx.moveTo(16,20); ctx.lineTo(24,27); ctx.lineWidth=2.7; ctx.strokeStyle="#ffcf6b"; ctx.stroke();
    ctx.restore();
  }

  private drawFireRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    animate: boolean
  ) {
    ctx.save();
    ctx.translate(x, y+9);
    ctx.beginPath();
    for (let i = 0; i < 7; ++i) {
      ctx.save();
      let rotation = ((Math.PI*2)/7)*i;
      if (animate && typeof globalThis !== 'undefined' && globalThis.performance && typeof globalThis.performance.now === 'function') {
        rotation += Math.sin(globalThis.performance.now()/360 + i) / 4;
      }
      ctx.rotate(rotation);
      ctx.moveTo(0, -22);
      ctx.lineTo(-5, -10);
      ctx.lineTo(5, -10);
      ctx.closePath();
      ctx.fillStyle = ["#ff7417", "#ffd600", "#e65100", "#fff6c7"][i%4];
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, 2 * Math.PI);
    ctx.lineWidth = 4.3;
    ctx.strokeStyle = "#ffd600";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff6c7";
    ctx.fill();
    ctx.restore();
  }

  onKeyDown(key: string) {
    if (key === 'ArrowLeft') this.controls.left = true;
    if (key === 'ArrowRight') this.controls.right = true;
    if (key === ' ' || key === 'Spacebar' || key === 'ArrowUp') this.controls.jump = true;
  }
  onKeyUp(key: string) {
    if (key === 'ArrowLeft') this.controls.left = false;
    if (key === 'ArrowRight') this.controls.right = false;
    if (key === ' ' || key === 'Spacebar' || key === 'ArrowUp') this.controls.jump = false;
  }
  private dragX = 0;
  private dragY = 0;
  private touched = false;
  onTouchStart(e: TouchEvent) {
    if (e.touches.length > 1) return;
    this.dragX = e.touches[0].clientX;
    this.dragY = e.touches[0].clientY;
    this.touched = true;
  }
  onTouchMove(e: TouchEvent) {
    if (!this.touched || e.touches.length > 1) return;
    let dx = e.touches[0].clientX - this.dragX;
    let dy = e.touches[0].clientY - this.dragY;
    if (dx < -28) { this.controls.left = true; this.controls.right = false; this.controls.jump = false; }
    else if (dx > 28) { this.controls.right = true; this.controls.left = false; this.controls.jump = false; }
    else if (dy < -22) { this.controls.jump = true; }
  }
  onTouchEnd() {
    this.controls.left = false;
    this.controls.right = false;
    this.controls.jump = false;
    this.touched = false;
  }
}
