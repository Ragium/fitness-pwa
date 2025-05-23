import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    RouterModule
  ],
  template: `
    <div class="unauthorized-container">
      <mat-card>
        <mat-card-title>Hozzáférés megtagadva</mat-card-title>
        <mat-card-content>
          <p>Ez az oldal csak bejelentkezett felhasználók számára elérhető.</p>
          <p>Kérjük, jelentkezzen be vagy regisztráljon a tartalom megtekintéséhez.</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" [routerLink]="['/login']">Bejelentkezés</button>
          <button mat-button [routerLink]="['/register']">Regisztráció</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px); // Adjust for toolbar height if any
      padding: 20px;
      text-align: center;
    }
    mat-card {
      max-width: 400px;
      width: 100%;
    }
    mat-card-actions {
      justify-content: center;
    }
  `]
})
export class UnauthorizedComponent {

} 