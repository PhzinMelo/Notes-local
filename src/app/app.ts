import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  /** Só por injetar, o tema salvo é aplicado ao <body> assim que o app abre, em qualquer tela. */
  private readonly theme = inject(ThemeService);
}
