import {
  Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, HostListener
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { GameAudioService } from '../../services/audio.service';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  templateUrl: './game-canvas.component.html',
  styleUrl: './game-canvas.component.css',
  providers: [GameService]
})
export class GameCanvasComponent implements AfterViewInit {
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Output() gameOver = new EventEmitter<number>();
  @Output() levelComplete = new EventEmitter<number>();

  private ctx!: CanvasRenderingContext2D;
  private animFrame: any = null;

  // Service instances injected and assigned to public fields for Angular template binding
  public gameSvc!: GameService;
  public audioSvc!: GameAudioService;

  constructor(
    _gameSvc: GameService,
    _audioSvc: GameAudioService
  ) {
    this.gameSvc = _gameSvc;
    this.audioSvc = _audioSvc;
  }

  ngAfterViewInit() {
    // Dummy reference for linter so DI fields aren't marked unused
    void this.gameSvc;
    void this.audioSvc;

    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.gameSvc.attachCanvas(this.canvasRef.nativeElement, this.ctx, this);
    this.resizeCanvas();
    this.loop();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
  }
  private resizeCanvas() {
    this.gameSvc.updateCanvasSize();
    if (typeof globalThis !== 'undefined' && typeof globalThis.setTimeout === 'function') {
      globalThis.setTimeout(() => this.gameSvc.updateCanvasSize(), 100);
    }
  }

  loop() {
    this.gameSvc.update();
    this.gameSvc.render();
    if (this.gameSvc.state.isGameOver) {
      this.audioSvc.stopMusic();
      this.gameOver.emit(this.gameSvc.state.score);
      if (typeof globalThis !== 'undefined' && typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(this.animFrame);
      }
      return;
    }
    if (this.gameSvc.state.isLevelComplete) {
      this.audioSvc.playLevelComplete();
      this.levelComplete.emit(this.gameSvc.state.score);
      if (typeof globalThis !== 'undefined' && typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(this.animFrame);
      }
      return;
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis.requestAnimationFrame === 'function') {
      this.animFrame = globalThis.requestAnimationFrame(() => this.loop());
    }
  }

  startGame() {
    this.gameSvc.init();
    this.audioSvc.stopMusic();
    this.audioSvc.playMusic();
    this.loop();
  }
  restartGame() {
    this.startGame();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'Spacebar'].includes(event.key)) {
      this.gameSvc.onKeyDown(event.key);
      event.preventDefault();
    }
  }
  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    this.gameSvc.onKeyUp(event.key);
    event.preventDefault();
  }
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) { this.gameSvc.onTouchStart(event); }
  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) { this.gameSvc.onTouchMove(event); }
  @HostListener('touchend')
  onTouchEnd() { this.gameSvc.onTouchEnd(); }
}
