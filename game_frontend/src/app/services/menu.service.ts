import { Injectable } from '@angular/core';

// UI and score/menu state for overlays and modals
export interface MenuState {
  showMenu: boolean;
  showInstructions: boolean;
  showGameOver: boolean;
  showLevelComplete: boolean;
  score: number;
  highScore: number;
}

@Injectable()
export class GameMenuService {
  state: MenuState = {
    showMenu: true,
    showInstructions: false,
    showGameOver: false,
    showLevelComplete: false,
    score: 0,
    highScore: typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
      ? parseInt(globalThis.localStorage.getItem('circus_highscore') || '0', 10) || 0
      : 0,
  };

  startGame() {
    this.state.showMenu = false;
    this.state.showGameOver = false;
    this.state.showInstructions = false;
    this.state.showLevelComplete = false;
    this.state.score = 0;
  }

  restartGame() {
    this.startGame();
  }

  showInstructions() {
    this.state.showMenu = false;
    this.state.showInstructions = true;
    this.state.showGameOver = false;
    this.state.showLevelComplete = false;
  }

  hideInstructions() {
    this.state.showInstructions = false;
    this.state.showMenu = true;
  }

  onGameOver(score: number) {
    this.state.showGameOver = true;
    this.state.showLevelComplete = false;
    this.state.showMenu = false;
    this.state.score = score;
    this.state.highScore = Math.max(this.state.highScore, score);
    if (typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem('circus_highscore', '' + this.state.highScore);
    }
  }

  onLevelComplete(score: number) {
    this.state.showLevelComplete = true;
    this.state.showMenu = false;
    this.state.showGameOver = false;
    this.state.score = score;
    this.state.highScore = Math.max(this.state.highScore, score);
    if (typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem('circus_highscore', '' + this.state.highScore);
    }
  }
}
