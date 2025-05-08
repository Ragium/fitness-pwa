import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { Workout } from '../../models/workout.model';

@Component({
  selector: 'app-workout-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatListModule,
    MatChipsModule
  ],
  template: `
    <mat-card class="workout-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>fitness_center</mat-icon>
        <mat-card-title>{{ workout.name }}</mat-card-title>
        <mat-card-subtitle>{{ formatDate(workout.date) }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Gyakorlatok</mat-panel-title>
            <mat-panel-description>
              {{ workout.exercises.length }} gyakorlat
            </mat-panel-description>
          </mat-expansion-panel-header>
          <mat-list>
            <mat-list-item *ngFor="let exercise of workout.exercises">
              <mat-icon matListItemIcon>fitness_center</mat-icon>
              <div matListItemTitle>{{ exercise.name }}</div>
              <div matListItemLine>
                {{ exercise.sets }} széria x {{ exercise.reps }} ismétlés
                <mat-chip-listbox>
                  <mat-chip>{{ getTypeLabel(exercise.type) }}</mat-chip>
                </mat-chip-listbox>
              </div>
            </mat-list-item>
          </mat-list>
        </mat-expansion-panel>

        <p *ngIf="workout.notes" class="notes">
          <strong>Megjegyzés:</strong> {{ workout.notes }}
        </p>
      </mat-card-content>
      <mat-card-actions>
        <button mat-button color="primary" (click)="onEdit()">
          <mat-icon>edit</mat-icon>
          Szerkesztés
        </button>
        <button mat-button color="warn" (click)="onDelete()">
          <mat-icon>delete</mat-icon>
          Törlés
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .workout-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-content {
      flex: 1;
    }

    mat-card-actions {
      display: flex;
      justify-content: flex-end;
      padding: 8px 16px;
    }

    .notes {
      margin-top: 16px;
      font-style: italic;
      color: #666;
    }

    mat-chip-listbox {
      display: inline-block;
      margin-left: 8px;
    }
  `]
})
export class WorkoutCardComponent {
  @Input() workout!: Workout;
  @Output() delete = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();

  formatDate(date: Date | string): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Érvénytelen dátum:', date);
      return 'Érvénytelen dátum';
    }
    return dateObj.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'chest': return 'Mellizom';
      case 'back': return 'Hátizom';
      case 'legs': return 'Lábizom';
      case 'shoulders': return 'Vállizom';
      case 'abs': return 'Hasizom';
      case 'triceps': return 'Tricepsz';
      case 'biceps': return 'Bicepsz';
      case 'cardio': return 'Kardió';
      default: return type;
    }
  }

  onDelete(): void {
    this.delete.emit(this.workout.id);
  }

  onEdit(): void {
    this.edit.emit(this.workout.id);
  }
} 