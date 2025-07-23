import {
  Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { GameAudioService } from '../../services/audio.service';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [CommonModule], // <-- Add CommonModule to imports
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

  private destroyed = false;

  // Internal error overlay flag/message for fatal animation loop errors
  public internalError: { message: string; error?: any } | null = null;

  // Simple animation frame counter for debugging
  private frameCounter: number = 0;

  // --- Improved cleanup and control for animation frame and handlers --- //

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

  // PUBLIC_INTERFACE
  /**
   * Life-cycle init: attaches the canvas and starts the render loop.
   * Ensures loop is started with a clean state.
   */
  ngAfterViewInit() {
    // Dummy reference for linter so DI fields aren't marked unused
    void this.gameSvc;
    void this.audioSvc;

    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.gameSvc.attachCanvas(this.canvasRef.nativeElement, this.ctx, this);
    this.resizeCanvas();
    this.startLoop();
  }

  // PUBLIC_INTERFACE
  /**
   * Cleans up resources when the component is destroyed.
   */
  ngOnDestroy() {
    this.destroyed = true;
    this.cancelAnimLoop();
  }

  private cancelAnimLoop() {
    if (typeof globalThis !== 'undefined' && typeof globalThis.cancelAnimationFrame === 'function') {
      if (this.animFrame !== null) {
        globalThis.cancelAnimationFrame(this.animFrame);
        this.animFrame = null;
      }
    }
  }

  /**
   * Cleanly restart animation loop and defensively cancel prior frame if running.
   */
  private startLoop() {
    this.cancelAnimLoop();
    if (!this.destroyed) {
      // Run one frame "ahead" to ensure no build-up of multiple loops (particularly on fast restarts).
      this.animFrame = globalThis.requestAnimationFrame(() => this.loop());
    }
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

  private isGameInputDisabled = false;

  // PUBLIC_INTERFACE (called by restart & start)
  /**
   * Main animation/game loop. Handles frame update, input disabling, resource cleanup,
   * and state transitions (e.g. game over and level complete). Cleans up the animation frame on completion.
   *
   * Now robust to animation errors (try/catch all logic), logs frameId and state, overlays UI on crash.
   */
  loop() {
    // Always clear previous frame handle
    if (this.animFrame !== null) {
      // Animation frame auto-clearing responsibility (for safety, for manual restarts)
      this.animFrame = null;
    }

    // Optional: increment frame counter for each run
    this.frameCounter++;
    const frameId = this.frameCounter;

    try {
      // Debug: Mark frame begin
      if ((frameId % 30) === 0) {
        // Logging every ~0.5s to avoid spamming (if running at 60 FPS)
        console.debug(`[CircusGame][Frame ${frameId}] Animation loop running...`, {
          gameState: {
            tick: this.gameSvc?.state?.tick,
            score: this.gameSvc?.state?.score,
            isGameOver: this.gameSvc?.state?.isGameOver,
            isLevelComplete: this.gameSvc?.state?.isLevelComplete
          }
        });
      }

      // If game over or level complete, stop updating/render loop
      if (this.gameSvc.state.isGameOver || this.gameSvc.state.isLevelComplete) {
        // Stop input during overlays.
        this.isGameInputDisabled = true;
        if (this.gameSvc.state.isGameOver) {
          console.warn(`[CircusGame][Frame ${frameId}] State transition: GAME OVER at tick=${this.gameSvc.state.tick} score=${this.gameSvc.state.score}`);
          this.audioSvc.stopMusic();
          this.gameOver.emit(this.gameSvc.state.score);
        }
        if (this.gameSvc.state.isLevelComplete) {
          console.info(`[CircusGame][Frame ${frameId}] State transition: LEVEL COMPLETE at tick=${this.gameSvc.state.tick} score=${this.gameSvc.state.score}`);
          this.audioSvc.playLevelComplete();
          this.levelComplete.emit(this.gameSvc.state.score);
        }
        this.cancelAnimLoop();
        console.debug(`[CircusGame][Frame ${frameId}] Animation loop stopped for overlay (GameOver or LevelComplete).`);
        return;
      } else {
        this.isGameInputDisabled = false;
      }

      this.gameSvc.update();
      this.gameSvc.render();

      if (!this.destroyed && typeof globalThis !== 'undefined' && typeof globalThis.requestAnimationFrame === 'function') {
        this.animFrame = globalThis.requestAnimationFrame(() => this.loop());
      }
    } catch (err: any) {
      // Log to JS console with error details and game state
      console.error(`[CircusGame][Frame ${frameId}] FATAL error in animation loop. Animation frozen.`, err, {
        gameState: {
          tick: this.gameSvc?.state?.tick,
          score: this.gameSvc?.state?.score,
          isGameOver: this.gameSvc?.state?.isGameOver,
          isLevelComplete: this.gameSvc?.state?.isLevelComplete
        }
      });
      // Bring up UI overlay: set error object for canvas overlay rendering
      this.internalError = {
        message: 'We encountered an internal error and the game has stopped. Check the console for technical details.',
        error: (err && typeof err === 'object' && 'message' in err) ? err.message : ('' + err)
      };
      this.cancelAnimLoop();
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Called to begin a new game round from outside (shell/menu component).
   * Safely cancels old animation loop and restarts, to prevent duplicate/ghost animation frames.
   * Resets error overlays and frame counter.
   */
  startGame() {
    this.cancelAnimLoop();
    this.isGameInputDisabled = false;
    this.gameSvc.init();
    this.audioSvc.stopMusic();
    this.audioSvc.playMusic();
    this.internalError = null;
    this.frameCounter = 0;
    this.startLoop();
  }

  // PUBLIC_INTERFACE
  /**
   * Called from outside to restart game (eg. after game over or level complete).
   * Ensures complete resource cleanup and robust new game startup.
   * Also resets error overlays and frame counter for robustness.
   */
  restartGame() {
    this.internalError = null;
    this.frameCounter = 0;
    this.startGame();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Only allow input if game is active
    if (this.isGameInputDisabled) {
      // Allow only R and Enter for restart if needed (UI handles restart, but for robustness; could restrict further)
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'Spacebar'].includes(event.key)) {
      this.gameSvc.onKeyDown(event.key);
      event.preventDefault();
    }
  }
  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (this.isGameInputDisabled) return;
    this.gameSvc.onKeyUp(event.key);
    event.preventDefault();
  }
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) { if (!this.isGameInputDisabled) this.gameSvc.onTouchStart(event); }
  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) { if (!this.isGameInputDisabled) this.gameSvc.onTouchMove(event); }
  @HostListener('touchend')
  onTouchEnd() { if (!this.isGameInputDisabled) this.gameSvc.onTouchEnd(); }
}

