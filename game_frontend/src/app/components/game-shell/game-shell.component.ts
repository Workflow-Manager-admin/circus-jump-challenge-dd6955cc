import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameCanvasComponent } from '../game-canvas/game-canvas.component';
import { GameMenuService } from '../../services/menu.service';
import { GameAudioService } from '../../services/audio.service';

@Component({
  selector: 'app-game-shell',
  standalone: true,
  imports: [CommonModule, GameCanvasComponent],
  templateUrl: './game-shell.component.html',
  styleUrl: './game-shell.component.css',
  providers: [GameMenuService, GameAudioService]
})
export class GameShellComponent implements AfterViewInit {
  @ViewChild(GameCanvasComponent) gameCanvas!: GameCanvasComponent;

  get showMenu() { return this.menuService.state.showMenu; }
  get showInstructions() { return this.menuService.state.showInstructions; }
  get showGameOver() { return this.menuService.state.showGameOver; }
  get showLevelComplete() { return this.menuService.state.showLevelComplete; }
  get score() { return this.menuService.state.score; }
  get highScore() { return this.menuService.state.highScore; }

  // Service instances injected and assigned to public fields for Angular template binding
  public menuService!: GameMenuService;
  public audio!: GameAudioService;

  constructor(
    _menuService: GameMenuService,
    _audio: GameAudioService
  ) {
    this.menuService = _menuService;
    this.audio = _audio;
  }

  ngAfterViewInit(): void {
    // Dummy reference for linter so DI fields aren't marked unused
    void this.menuService;
    void this.audio;
  }

  onGameStart() {
    this.menuService.startGame();
    this.gameCanvas.startGame();
    if (this.audio.isMusicOn()) this.audio.playMusic();
  }

  onGameRestart() {
    this.menuService.restartGame();
    this.gameCanvas.restartGame();
    if (this.audio.isMusicOn()) this.audio.playMusic();
  }

  onShowInstructions() {
    this.menuService.showInstructions();
    this.audio.playMenuSelect();
    this.audio.stopMusic();
  }

  onCloseInstructions() {
    this.menuService.hideInstructions();
    this.audio.playMenuBack();
  }

  onMuteToggle() {
    this.audio.toggleMute();
  }
}
