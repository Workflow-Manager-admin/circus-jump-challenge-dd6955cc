import { Component } from '@angular/core';
import { GameShellComponent } from './components/game-shell/game-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameShellComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
