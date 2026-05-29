import { AsyncPipe, CommonModule, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { WorkoutsStoreService } from '../../core/services/workouts-store.service';
import { OnlineStatusService } from '../../core/services/online-status.service';
import { NotificationService } from '../../core/services/notification.service';
import { SyncQueueService } from '../../core/services/sync-queue.service';
import { WorkoutDraft, WorkoutEntity, WorkoutSet } from '../../core/models/workout.model';
import { WorkoutSessionStoreService } from '../../core/services/workout-session-store.service';
import { WorkoutSession } from '../../core/models/workout-session.model';
import { WorkoutFormComponent } from './workout-form.component';
import { EmptyStateCardComponent } from './empty-state-card.component';
import { WorkoutListComponent } from './workout-list.component';
import { SummaryCardComponent } from './summary-card.component';
import { ProgressCardComponent } from './progress-card.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-workouts-page',
  imports: [
    CommonModule,
    RouterLink,
    AsyncPipe,
    NgIf,
    WorkoutFormComponent,
    EmptyStateCardComponent,
    WorkoutListComponent,
    SummaryCardComponent,
    ProgressCardComponent,
  ],
  templateUrl: './workouts-page.component.html',
  styleUrl: './workouts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutsPageComponent {
  @ViewChild(WorkoutFormComponent) workoutForm?: WorkoutFormComponent;

  private readonly workoutsStore = inject(WorkoutsStoreService);
  private readonly notifications = inject(NotificationService);
  private readonly onlineStatus = inject(OnlineStatusService);
  private readonly syncQueue = inject(SyncQueueService);
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(WorkoutSessionStoreService);

  readonly workouts$ = this.workoutsStore.workouts$;
  readonly summary$ = this.workoutsStore.summary$;
  readonly pendingCount$ = this.workouts$.pipe(map((items) => items.filter((x) => x.status === 'waiting').length));
  readonly online$ = this.onlineStatus.status$;
  readonly session$ = this.authService.session$;

  formPinnedOpen = false;
  lastLoadedSessions: WorkoutSession[] = [];
  editingWorkoutId: number | null = null;

  async handleSave(draft: WorkoutDraft): Promise<void> {
    try {
      if (this.editingWorkoutId !== null) {
        // Szerkesztés
        await this.workoutsStore.updateWorkout(this.editingWorkoutId, draft);
        this.notifications.success('Edzés módosítva, szinkron folyamatban');
        this.editingWorkoutId = null;
      } else {
        // Új edzés
        await this.workoutsStore.addWorkout(draft);
        this.notifications.success('Sorozat mentve offline, szinkron folyamatban');
      }
      this.workoutForm?.resetForm();
      if (this.onlineStatus.snapshot()) {
        this.syncQueue.triggerManualSync();
      }
    } catch (error) {
      this.notifications.error('A mentés nem sikerült. Próbáld újra.');
      throw error;
    }
  }

  async handleRetry(workout: WorkoutEntity): Promise<void> {
    await this.syncQueue.retry(workout);
  }

  async handleEdit(workout: WorkoutEntity): Promise<void> {
    this.editingWorkoutId = workout.id as number;
    // Tölts fel az űrlapot
    if (this.workoutForm) {
      this.workoutForm.loadWorkoutData(workout.exercise, workout.note, workout.sets);
    }
    this.openForm();
  }

  async handleDelete(workout: WorkoutEntity): Promise<void> {
    const confirmed = window.confirm(`Biztosan törlöd a "${workout.exercise}" edzést?`);
    if (!confirmed) {
      return;
    }

    try {
      await this.workoutsStore.deleteWorkout(workout.id as number);
      if (workout.firestoreId) {
        // Cloud copy exists — soft delete queued for sync
        this.notifications.success(
          this.onlineStatus.snapshot()
            ? 'Edzés törölve, szinkron folyamatban'
            : 'Törlés offline mentve, szinkron hamarosan'
        );
        if (this.onlineStatus.snapshot()) {
          this.syncQueue.triggerManualSync();
        }
      } else {
        // Never synced — immediate local removal
        this.notifications.success('Edzés törölve');
      }
      this.editingWorkoutId = null;
    } catch (error) {
      this.notifications.error('Törlés nem sikerült');
      console.error(error);
    }
  }

  openForm(): void {
    this.formPinnedOpen = true;
    setTimeout(() => this.workoutForm?.focusFirstField(), 50);
  }

  manualSync(): void {
    this.syncQueue.triggerManualSync();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  async saveSampleSession(): Promise<void> {
    try {
      const session = this.buildSessionFromForm();
      if (!session) {
        this.notifications.error('Töltsd ki az űrlapot (gyakorlat, szett, ismétlés, súly), majd próbáld újra.');
        return;
      }
      await this.sessionStore.save(session);

      // Ugyanebből a formból mentsünk egy workoutot is a fő listába / szinkron queue-ba
      const firstExercise = session.exercises[0];
      if (firstExercise) {
        await this.workoutsStore.addWorkout({
          exercise: firstExercise.name,
          note: session.notes,
          sets: firstExercise.sets.map((s) => ({
            repetitions: s.repetitions,
            weight: s.weight,
            note: s.note,
          })),
        });
      }

      if (this.onlineStatus.snapshot()) {
        this.syncQueue.triggerManualSync();
      }

      this.notifications.success('POC edzés mentve offline (IndexedDB) és felvéve a queue-ba');
    } catch (error) {
      this.notifications.error('POC mentés nem sikerült (IndexedDB)');
      console.error(error);
    }
  }

  async loadSampleSessions(): Promise<void> {
    try {
      const sessions = await this.sessionStore.getAll();
      if (!sessions.length) {
        this.notifications.error('Nincs elérhető offline edzés a POC-hoz');
        this.lastLoadedSessions = [];
        return;
      }

      this.lastLoadedSessions = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      this.notifications.success('POC edzések betöltve offline tárból');
    } catch (error) {
      this.notifications.error('POC betöltés nem sikerült (IndexedDB)');
      console.error(error);
    }
  }

  private buildSessionFromForm(): WorkoutSession | null {
    const raw = this.workoutForm?.form.getRawValue();
    if (!raw || !this.workoutForm?.form.valid) {
      return null;
    }

    const note = raw.note ? String(raw.note) : undefined;
    const createdSets = this.mapSets(raw.sets).map((s) => ({
      ...s,
      id: this.generateId(),
    }));

    const exercise = {
      id: this.generateId(),
      name: raw.exercise ?? 'Gyakorlat',
      sets: createdSets,
      note,
    };

    return {
      id: this.generateId(),
      startedAt: new Date().toISOString(),
      exercises: [exercise],
      notes: note,
    };
  }

  private generateId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  }

  private mapSets(rawSets: any[] | undefined): WorkoutSet[] {
    if (!rawSets?.length) {
      return [];
    }
    return rawSets.map((s) => ({
      repetitions: Number(s.repetitions) || 0,
      weight: Number(s.weight) || 0,
      note: s.note ? String(s.note) : undefined,
    }));
  }
}
