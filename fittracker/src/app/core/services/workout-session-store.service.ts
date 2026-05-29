import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom } from 'rxjs';
import { nanoid } from 'nanoid';

import { WorkoutExercise, WorkoutSession, WorkoutSet } from '../models/workout-session.model';

@Injectable({ providedIn: 'root' })
export class WorkoutSessionStoreService {
  private readonly storeName = 'workout_sessions';

  constructor(private readonly db: NgxIndexedDBService) {}

  async save(session: WorkoutSession): Promise<WorkoutSession> {
    await firstValueFrom(this.db.add(this.storeName, session));
    return session;
  }

  async upsert(session: WorkoutSession): Promise<WorkoutSession> {
    await firstValueFrom(this.db.update(this.storeName, session));
    return session;
  }

  async getAll(): Promise<WorkoutSession[]> {
    return firstValueFrom(this.db.getAll(this.storeName));
  }

  async clearAll(): Promise<void> {
    await firstValueFrom(this.db.clear(this.storeName));
  }

  buildSampleSession(): WorkoutSession {
    const startedAt = new Date().toISOString();
    const exercises: WorkoutExercise[] = [
      {
        id: nanoid(8),
        name: 'Fekvenyomás',
        muscleGroup: 'Mell',
        note: 'Bemelegítő + working set',
        sets: [
          this.createSet({ weight: 40, repetitions: 10, note: 'Bemelegítés' }),
          this.createSet({ weight: 60, repetitions: 8 }),
          this.createSet({ weight: 70, repetitions: 6, rpe: 8 }),
        ],
      },
      {
        id: nanoid(8),
        name: 'Guggolás',
        muscleGroup: 'Láb',
        sets: [
          this.createSet({ weight: 60, repetitions: 8 }),
          this.createSet({ weight: 80, repetitions: 5, rpe: 9 }),
        ],
      },
    ];

    return {
      id: nanoid(12),
      startedAt,
      notes: 'Offline POC mentés',
      exercises,
    };
  }

  private createSet(data: Omit<WorkoutSet, 'id'>): WorkoutSet {
    return { id: nanoid(10), ...data };
  }
}
