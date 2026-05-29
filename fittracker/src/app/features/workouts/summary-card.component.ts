import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { WorkoutSummary } from '../../core/models/workout.model';

@Component({
  standalone: true,
  selector: 'app-summary-card',
  imports: [CommonModule, DatePipe],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss',
})
export class SummaryCardComponent {
  @Input() summary?: WorkoutSummary | null;
}
