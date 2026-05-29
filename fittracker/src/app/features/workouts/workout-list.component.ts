import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkoutEntity } from '../../core/models/workout.model';
import { VolumePipe } from './volume.pipe';

@Component({
  standalone: true,
  selector: 'app-workout-list',
  imports: [CommonModule, DatePipe, NgClass, VolumePipe],
  templateUrl: './workout-list.component.html',
  styleUrl: './workout-list.component.scss',
})
export class WorkoutListComponent {
  @Input({ required: true }) workouts: WorkoutEntity[] = [];
  @Output() retry = new EventEmitter<WorkoutEntity>();
  @Output() edit = new EventEmitter<WorkoutEntity>();
  @Output() delete = new EventEmitter<WorkoutEntity>();

  statusCopy(status: WorkoutEntity['status']): string {
    switch (status) {
      case 'synced':
        return 'Szinkronizálva';
      case 'error':
        return 'Hiba – szinkron vár';
      default:
        return 'Szinkron várakozik';
    }
  }

  statusClass(status: WorkoutEntity['status']): string {
    return {
      synced: 'synced',
      waiting: 'waiting',
      error: 'error',
    }[status];
  }
}
