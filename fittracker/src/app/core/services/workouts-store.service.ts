import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { SyncEvent, WorkoutDraft, WorkoutEntity, WorkoutSummary, WorkoutStatus, WorkoutOperation, WorkoutSet } from '../models/workout.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WorkoutsStoreService {
  private readonly storeName = 'workouts';
  private readonly syncLogStore = 'sync_events';
  private readonly workoutsSubject = new BehaviorSubject<WorkoutEntity[]>([]);
  readonly workouts$ = this.workoutsSubject.asObservable();
  readonly summary$ = this.workouts$.pipe(map((items) => this.computeSummary(items)));

  constructor(private readonly db: NgxIndexedDBService, private readonly auth: AuthService) {
    void this.refresh();
  }

  async addWorkout(draft: WorkoutDraft): Promise<WorkoutEntity> {
    const now = new Date().toISOString();
    const sets =
      (draft.sets ?? []).length > 0
        ? draft.sets.map((s) => ({
            repetitions: Number(s.repetitions) || 0,
            weight: Number(s.weight) || 0,
            note: s.note ?? undefined,
          }))
        : [{ repetitions: 0, weight: 0 }];
    const entity: WorkoutEntity = {
      ...draft,
      sets,
      ownerId: this.auth.sessionSnapshot()?.uid,
      createdAt: now,
      queuedAt: now,
      status: 'waiting',
      operation: 'create',
      syncAttempts: 0,
    };

    const saved = await firstValueFrom(this.db.add<WorkoutEntity>(this.storeName, entity));
    await this.refresh();
    return saved;
  }

  async markSynced(id: number, firestoreId?: string): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) {
      return;
    }

    const updated: WorkoutEntity = {
      ...entity,
      status: 'synced',
      syncedAt: new Date().toISOString(),
      lastError: undefined,
      ...(firestoreId ? { firestoreId } : {}),
    };
    await this.persist(updated);
    await this.logEvent({ workoutId: id, status: 'synced', createdAt: updated.syncedAt! });
  }

  async markError(id: number, note?: string): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) {
      return;
    }

    const updated: WorkoutEntity = {
      ...entity,
      status: 'error',
      lastError: note,
      syncAttempts: entity.syncAttempts + 1,
    };
    await this.persist(updated);
    await this.logEvent({
      workoutId: id,
      status: 'error',
      createdAt: new Date().toISOString(),
      note,
    });
  }

  async retry(id: number): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) {
      return;
    }

    const updated: WorkoutEntity = {
      ...entity,
      status: 'waiting',
      queuedAt: new Date().toISOString(),
    };
    await this.persist(updated);
  }

  async waitingEntries(): Promise<WorkoutEntity[]> {
    const all = await firstValueFrom(this.db.getAll<WorkoutEntity>(this.storeName));
    return all.filter((item) => item.status === 'waiting');
  }

  async updateWorkout(id: number, draft: WorkoutDraft): Promise<WorkoutEntity> {
    const entity = await this.getById(id);
    if (!entity) {
      throw new Error(`Edzés nem található: ${id}`);
    }

    const sets =
      (draft.sets ?? []).length > 0
        ? draft.sets.map((s) => ({
            repetitions: Number(s.repetitions) || 0,
            weight: Number(s.weight) || 0,
            note: s.note ?? undefined,
          }))
        : [{ repetitions: 0, weight: 0 }];

    // If never synced to Firestore, keep as 'create' (cloud still needs a full create)
    const operation: WorkoutOperation = entity.firestoreId ? 'update' : 'create';

    const updated: WorkoutEntity = {
      ...entity,
      exercise: draft.exercise,
      note: draft.note,
      sets,
      operation,
      status: 'waiting',
      queuedAt: new Date().toISOString(),
      syncedAt: undefined,
    };

    await this.persist(updated);
    return updated;
  }

  async deleteWorkout(id: number): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) {
      return;
    }

    // If never synced to Firestore, just hard-delete locally (nothing to remove in cloud)
    if (!entity.firestoreId && entity.status !== 'synced') {
      await this.hardDelete(id);
      return;
    }

    // Soft-delete: mark for cloud deletion, keep in IndexedDB until sync confirms
    const updated: WorkoutEntity = {
      ...entity,
      deleted: true,
      operation: 'delete',
      status: 'waiting',
      queuedAt: new Date().toISOString(),
    };
    await this.persist(updated);
  }

  async hardDelete(id: number): Promise<void> {
    await firstValueFrom(this.db.delete(this.storeName, id));
    await this.refresh();
  }

  private async persist(entity: WorkoutEntity): Promise<void> {
    await firstValueFrom(this.db.update(this.storeName, entity));
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const all = await firstValueFrom(this.db.getAll<WorkoutEntity>(this.storeName));
    // Filter out soft-deleted items from the visible list
    const items = all.filter((w) => !w.deleted);
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this.workoutsSubject.next(items);
  }

  private async getById(id: number): Promise<WorkoutEntity | undefined> {
    return firstValueFrom(this.db.getByKey<WorkoutEntity>(this.storeName, id));
  }

  private async logEvent(event: SyncEvent): Promise<void> {
    await firstValueFrom(this.db.add<SyncEvent>(this.syncLogStore, event));
  }

  private computeSummary(items: WorkoutEntity[]): WorkoutSummary {
    if (!items.length) {
      return { totalSets: 0, totalVolume: 0, streakDays: 0, lastThreeSessions: [] };
    }

    const totalSets = items.reduce((acc, item) => acc + this.setCount(item.sets), 0);
    const totalVolume = items.reduce((acc, item) => acc + this.volume(item.sets), 0);

    const uniqueDates = [
      ...new Set(items.map((item) => item.createdAt.slice(0, 10)).sort((a, b) => b.localeCompare(a))),
    ];
    const streakDays = this.calculateStreak(uniqueDates);
    const lastThreeSessions = uniqueDates.slice(0, 3);

    return { totalSets, totalVolume, streakDays, lastThreeSessions };
  }

  private calculateStreak(dates: string[]): number {
    if (!dates.length) {
      return 0;
    }

    let streak = 0;
    let previous: Date | undefined;

    for (const date of dates) {
      const current = new Date(date);

      if (!previous) {
        streak = 1;
        previous = current;
        continue;
      }

      const diffInDays = Math.floor((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
      if (diffInDays === 0) {
        continue;
      }

      if (diffInDays === 1) {
        streak += 1;
        previous = current;
        continue;
      }

      break;
    }

    return streak;
  }

  private setCount(sets: WorkoutSet[] | undefined): number {
    if (!sets?.length) {
      return 0;
    }
    return sets.length;
  }

  private volume(sets: WorkoutSet[] | undefined): number {
    if (!sets?.length) {
      return 0;
    }
    return sets.reduce((sum, s) => sum + (s.repetitions ?? 0) * (s.weight ?? 0), 0);
  }
}
