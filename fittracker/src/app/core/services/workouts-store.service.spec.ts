import { firstValueFrom, of } from 'rxjs';
import { filter } from 'rxjs/operators';
import { WorkoutsStoreService } from './workouts-store.service';
import { SyncEvent, WorkoutDraft, WorkoutEntity } from '../models/workout.model';

class InMemoryIndexedDbService {
  private readonly stores = new Map<string, any[]>();
  private readonly idCounters = new Map<string, number>();

  constructor(initial?: Record<string, any[]>) {
    if (!initial) {
      return;
    }
    Object.entries(initial).forEach(([store, items]) => {
      this.stores.set(
        store,
        items.map((item) => ({ ...item }))
      );
      this.idCounters.set(store, this.maxId(items));
    });
  }

  add<T>(storeName: string, entity: T) {
    const record = { ...(entity as any) };
    if (record.id == null) {
      record.id = this.nextId(storeName);
    }
    this.ensureStore(storeName).push(record);
    return of(record);
  }

  update<T>(storeName: string, entity: T) {
    const cloned = { ...(entity as any) };
    const store = this.ensureStore(storeName);
    const index = store.findIndex((item) => item.id === cloned.id);
    if (index >= 0) {
      store[index] = cloned;
    } else {
      store.push(cloned);
    }
    return of(cloned);
  }

  getAll<T>(storeName: string) {
    const snapshot = this.ensureStore(storeName).map((item) => ({ ...item }));
    return of(snapshot);
  }

  getByKey<T>(storeName: string, key: number) {
    const store = this.ensureStore(storeName);
    const record = store.find((item) => item.id === key);
    return of(record ? { ...record } : undefined);
  }

  delete(storeName: string, key: number) {
    const store = this.ensureStore(storeName);
    const index = store.findIndex((item) => item.id === key);
    if (index >= 0) {
      store.splice(index, 1);
    }
    return of(true);
  }

  getStoreSnapshot<T>(storeName: string): T[] {
    return this.ensureStore(storeName).map((item) => ({ ...item }));
  }

  private ensureStore(storeName: string): any[] {
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, []);
      this.idCounters.set(storeName, 0);
    }
    return this.stores.get(storeName)!;
  }

  private nextId(storeName: string): number {
    const current = this.idCounters.get(storeName) ?? 0;
    const next = current + 1;
    this.idCounters.set(storeName, next);
    return next;
  }

  private maxId(items: any[]): number {
    return items.reduce((max, item) => (typeof item.id === 'number' && item.id > max ? item.id : max), 0);
  }
}

describe('WorkoutsStoreService', () => {
  const authStub = { sessionSnapshot: () => ({ uid: 'user-1' }) };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2024-02-10T10:00:00.000Z'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('computes an empty summary when there are no workouts', () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);
    const summary = (service as any).computeSummary([]);

    expect(summary).toEqual({
      totalSets: 0,
      totalVolume: 0,
      streakDays: 0,
      lastThreeSessions: [],
    });
  });

  it('aggregates totals, streak and last sessions from workout history', () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);
    const workouts: WorkoutEntity[] = [
      buildEntity({
        id: 1,
        createdAt: '2024-02-10T05:00:00.000Z',
        sets: [
          { repetitions: 5, weight: 80 },
          { repetitions: 3, weight: 90 },
        ],
      }),
      buildEntity({
        id: 2,
        createdAt: '2024-02-10T07:00:00.000Z',
        sets: [{ repetitions: 4, weight: 70 }],
      }),
      buildEntity({
        id: 3,
        createdAt: '2024-02-09T06:00:00.000Z',
        sets: [
          { repetitions: 8, weight: 50 },
          { repetitions: 6, weight: 60 },
          { repetitions: 4, weight: 70 },
        ],
      }),
      buildEntity({
        id: 4,
        createdAt: '2024-02-05T06:00:00.000Z',
        sets: [{ repetitions: 10, weight: 40 }],
      }),
    ];

    const summary = (service as any).computeSummary(workouts);

    expect(summary).toEqual({
      totalSets: 7,
      totalVolume: 5 * 80 + 3 * 90 + 4 * 70 + 8 * 50 + 6 * 60 + 4 * 70 + 10 * 40,
      streakDays: 2,
      lastThreeSessions: ['2024-02-10', '2024-02-09', '2024-02-05'],
    });
  });

  it('skips duplicate dates when calculating streaks', () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);

    const streak = (service as any).calculateStreak(['2024-02-10', '2024-02-10', '2024-02-09']);

    expect(streak).toBe(2);
  });

  it('adds a workout draft with waiting status and timestamps', async () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);

    const draft: WorkoutDraft = {
      exercise: 'Guggolás',
      sets: [
        { repetitions: 5, weight: 110 },
        { repetitions: 5, weight: 100 },
      ],
      note: 'próba',
    };

    const saved = await service.addWorkout(draft);

    expect(saved).toEqual(
      jasmine.objectContaining({
        exercise: 'Guggolás',
        status: 'waiting',
        syncAttempts: 0,
        createdAt: '2024-02-10T10:00:00.000Z',
        queuedAt: '2024-02-10T10:00:00.000Z',
      })
    );

    const emission = await firstValueFrom(service.workouts$.pipe(filter((items) => items.length === 1)));
    expect(emission.length).toBe(1);
  });

  it('adds a default set when the draft has no sets', async () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);

    const saved = await service.addWorkout({ exercise: 'Tolódzkodás', sets: [] });

    expect(saved.sets.length).toBe(1);
    expect(saved.sets[0]).toEqual(jasmine.objectContaining({ repetitions: 0, weight: 0 }));
  });

  it('marks a workout as error and logs the failure note', async () => {
    const initial = buildEntity({ id: 7, syncAttempts: 1, status: 'waiting' });
    const db = new InMemoryIndexedDbService({ workouts: [initial], sync_events: [] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.markError(7, 'Timeout');

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts[0]).toEqual(
      jasmine.objectContaining({
        status: 'error',
        lastError: 'Timeout',
        syncAttempts: 2,
      })
    );

    const events = db.getStoreSnapshot<SyncEvent>('sync_events');
    expect(events[0]).toEqual(
      jasmine.objectContaining({
        workoutId: 7,
        status: 'error',
        note: 'Timeout',
      })
    );
  });

  it('retries a failed workout by re-queueing it', async () => {
    const initial = buildEntity({ id: 3, status: 'error', queuedAt: '2024-02-01T00:00:00.000Z' });
    const db = new InMemoryIndexedDbService({ workouts: [initial] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.retry(3);

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts[0].status).toBe('waiting');
    expect(workouts[0].queuedAt).toBe('2024-02-10T10:00:00.000Z');
  });

  it('marks a workout as synced and logs the event', async () => {
    const initial = buildEntity({ id: 5, status: 'waiting', lastError: 'boom' });
    const db = new InMemoryIndexedDbService({ workouts: [initial], sync_events: [] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.markSynced(5);

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts[0]).toEqual(
      jasmine.objectContaining({
        status: 'synced',
        lastError: undefined,
        syncedAt: '2024-02-10T10:00:00.000Z',
      })
    );

    const events = db.getStoreSnapshot<SyncEvent>('sync_events');
    expect(events[0]).toEqual(
      jasmine.objectContaining({
        workoutId: 5,
        status: 'synced',
        createdAt: '2024-02-10T10:00:00.000Z',
      })
    );
  });

  it('returns gracefully when markSynced or markError targets a missing workout', async () => {
    const db = new InMemoryIndexedDbService({ workouts: [], sync_events: [] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.markSynced(999);
    await service.markError(888, 'oops');
    await service.retry(777);

    expect(db.getStoreSnapshot<WorkoutEntity>('workouts').length).toBe(0);
    expect(db.getStoreSnapshot<SyncEvent>('sync_events').length).toBe(0);
  });

  it('filters waiting entries only', async () => {
    const db = new InMemoryIndexedDbService({
      workouts: [
        buildEntity({ id: 1, status: 'waiting' }),
        buildEntity({ id: 2, status: 'error' }),
        buildEntity({ id: 3, status: 'synced' }),
      ],
    });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    const waiting = await service.waitingEntries();

    expect(waiting.map((w) => w.id)).toEqual([1]);
  });

  it('stops streak calculation when a gap larger than one day appears', () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);

    const streak = (service as any).calculateStreak(['2024-02-10', '2024-02-08', '2024-02-07']);

    expect(streak).toBe(1);
  });

  it('throws when updating a missing workout', async () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await expectAsync(service.updateWorkout(123, { exercise: 'X', sets: [] })).toBeRejectedWithError(
      /Edzés nem található/
    );
  });

  // --- Delete + Update Sync Tests ---

  it('soft-deletes a synced workout (has firestoreId)', async () => {
    const initial = buildEntity({ id: 1, status: 'synced', firestoreId: 'fs-abc123' });
    const db = new InMemoryIndexedDbService({ workouts: [initial], sync_events: [] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.deleteWorkout(1);

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts.length).toBe(1); // still in DB (soft delete)
    expect(workouts[0]).toEqual(
      jasmine.objectContaining({
        deleted: true,
        operation: 'delete',
        status: 'waiting',
      })
    );
  });

  it('hard-deletes a never-synced workout immediately', async () => {
    const initial = buildEntity({ id: 2, status: 'waiting', firestoreId: undefined });
    const db = new InMemoryIndexedDbService({ workouts: [initial] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.deleteWorkout(2);

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts.length).toBe(0); // fully removed
  });

  it('filters soft-deleted items from workouts$ observable', async () => {
    const items = [
      buildEntity({ id: 1, status: 'synced', deleted: true, operation: 'delete' }),
      buildEntity({ id: 2, status: 'synced' }),
    ];
    const db = new InMemoryIndexedDbService({ workouts: items });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    const visible = await firstValueFrom(service.workouts$.pipe(filter((w) => w.length > 0)));
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe(2);
  });

  it('sets operation=update when updating a synced workout with firestoreId', async () => {
    const initial = buildEntity({ id: 3, status: 'synced', firestoreId: 'fs-xyz' });
    const db = new InMemoryIndexedDbService({ workouts: [initial] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.updateWorkout(3, { exercise: 'Húzódzkodás', sets: [{ repetitions: 8, weight: 0 }] });

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts[0]).toEqual(
      jasmine.objectContaining({
        operation: 'update',
        status: 'waiting',
        exercise: 'Húzódzkodás',
        firestoreId: 'fs-xyz',
      })
    );
  });

  it('keeps operation=create when updating a never-synced workout', async () => {
    const initial = buildEntity({ id: 4, status: 'waiting', firestoreId: undefined });
    const db = new InMemoryIndexedDbService({ workouts: [initial] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.updateWorkout(4, { exercise: 'Evezés', sets: [{ repetitions: 12, weight: 30 }] });

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts[0].operation).toBe('create');
  });

  it('markSynced stores firestoreId when provided', async () => {
    const initial = buildEntity({ id: 5, status: 'waiting' });
    const db = new InMemoryIndexedDbService({ workouts: [initial], sync_events: [] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.markSynced(5, 'fs-new-id');

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts[0].firestoreId).toBe('fs-new-id');
    expect(workouts[0].status).toBe('synced');
  });

  it('hardDelete removes the entity from IndexedDB', async () => {
    const initial = buildEntity({ id: 6, status: 'waiting', deleted: true, operation: 'delete' });
    const db = new InMemoryIndexedDbService({ workouts: [initial] });
    const service = new WorkoutsStoreService(db as any, authStub as any);

    await service.hardDelete(6);

    const workouts = db.getStoreSnapshot<WorkoutEntity>('workouts');
    expect(workouts.length).toBe(0);
  });

  it('addWorkout sets operation to create', async () => {
    const db = new InMemoryIndexedDbService();
    const service = new WorkoutsStoreService(db as any, authStub as any);

    const saved = await service.addWorkout({ exercise: 'Deadlift', sets: [{ repetitions: 5, weight: 140 }] });

    expect(saved.operation).toBe('create');
  });
});

function buildEntity(overrides: Partial<WorkoutEntity> = {}): WorkoutEntity {
  return {
    id: 1,
    exercise: 'Fekvenyomás',
    sets: [{ repetitions: 5, weight: 100 }],
    note: 'edzés',
    createdAt: '2024-02-08T06:00:00.000Z',
    queuedAt: '2024-02-08T06:00:00.000Z',
    status: 'waiting',
    syncAttempts: 0,
    ...overrides,
  };
}
