import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { WorkoutEntity } from '../../core/models/workout.model';

interface DayVolume {
  date: string;
  label: string;
  volume: number;
}

interface PersonalRecord {
  exercise: string;
  maxWeight: number;
  date: string;
}

@Component({
  standalone: true,
  selector: 'app-progress-card',
  imports: [CommonModule, DatePipe],
  templateUrl: './progress-card.component.html',
  styleUrl: './progress-card.component.scss',
})
export class ProgressCardComponent implements OnChanges {
  @Input() workouts: WorkoutEntity[] = [];

  weeklyVolume: DayVolume[] = [];
  personalRecords: PersonalRecord[] = [];
  lastSyncedAt: string | null = null;
  maxVolume = 0;

  // Magyar rövidítések: 0=Vasárnap
  private readonly dayNames = ['Va', 'H', 'K', 'Sz', 'Cs', 'P', 'Szo'];

  ngOnChanges(): void {
    this.weeklyVolume = this.computeWeeklyVolume();
    this.maxVolume = Math.max(...this.weeklyVolume.map((d) => d.volume), 1);
    this.personalRecords = this.computePersonalRecords();
    this.lastSyncedAt = this.computeLastSyncedAt();
  }

  /** SVG bar magasság 0–80 px skálán */
  barHeight(volume: number): number {
    return Math.round((volume / this.maxVolume) * 80);
  }

  /** SVG bar y pozíció (top-aligned chart) */
  barY(volume: number): number {
    return 88 - this.barHeight(volume);
  }

  private computeWeeklyVolume(): DayVolume[] {
    const days: DayVolume[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const label = this.dayNames[d.getDay()];

      const volume = this.workouts
        .filter((w) => w.createdAt.slice(0, 10) === date)
        .reduce((sum, w) => sum + this.calcVolume(w), 0);

      days.push({ date, label, volume });
    }

    return days;
  }

  private computePersonalRecords(): PersonalRecord[] {
    const map = new Map<string, { maxWeight: number; date: string }>();

    for (const workout of this.workouts) {
      const maxWeight = Math.max(...workout.sets.map((s) => s.weight ?? 0));
      if (maxWeight === 0) continue;

      const existing = map.get(workout.exercise);
      if (!existing || maxWeight > existing.maxWeight) {
        map.set(workout.exercise, {
          maxWeight,
          date: workout.createdAt.slice(0, 10),
        });
      }
    }

    return Array.from(map.entries())
      .map(([exercise, { maxWeight, date }]) => ({ exercise, maxWeight, date }))
      .sort((a, b) => b.maxWeight - a.maxWeight)
      .slice(0, 5);
  }

  private computeLastSyncedAt(): string | null {
    const dates = this.workouts
      .filter((w) => w.syncedAt)
      .map((w) => w.syncedAt!);
    if (!dates.length) return null;
    return dates.sort((a, b) => b.localeCompare(a))[0];
  }

  private calcVolume(workout: WorkoutEntity): number {
    return (workout.sets ?? []).reduce(
      (sum, s) => sum + (s.repetitions ?? 0) * (s.weight ?? 0),
      0
    );
  }
}
