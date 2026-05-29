import { BehaviorSubject } from 'rxjs';
import { SyncQueueService } from './sync-queue.service';
import { WorkoutEntity } from '../models/workout.model';

class FakeNotifications {
  messages: Array<{ level: string; text: string }> = [];
  success(text: string) {
    this.messages.push({ level: 'success', text });
  }
  error(text: string) {
    this.messages.push({ level: 'error', text });
  }
  info(text: string) {
    this.messages.push({ level: 'info', text });
  }
}

class FakeOnlineStatusService {
  private readonly subject: BehaviorSubject<boolean>;
  readonly status$;

  constructor(initial: boolean) {
    this.subject = new BehaviorSubject<boolean>(initial);
    this.status$ = this.subject.asObservable();
  }

  snapshot(): boolean {
    return this.subject.value;
  }

  setOnline(value: boolean): void {
    this.subject.next(value);
  }
}

class FakeWorkoutsStore {
  readonly workouts$ = new BehaviorSubject<WorkoutEntity[]>([]);
  waitingEntries = jasmine.createSpy('waitingEntries').and.resolveTo([]);
  markSynced = jasmine.createSpy('markSynced').and.resolveTo(undefined);
  markError = jasmine.createSpy('markError').and.resolveTo(undefined);
  retry = jasmine.createSpy('retry').and.resolveTo(undefined);
  hardDelete = jasmine.createSpy('hardDelete').and.resolveTo(undefined);
}

class FakeCloudSyncService {
  pushCreate = jasmine.createSpy('pushCreate').and.resolveTo('fs-new-id');
  pushUpdate = jasmine.createSpy('pushUpdate').and.resolveTo(undefined);
  pushDelete = jasmine.createSpy('pushDelete').and.resolveTo(undefined);
  pushWorkout = jasmine.createSpy('pushWorkout').and.resolveTo(undefined);
}

describe('SyncQueueService', () => {
  it('shows an error when manual sync is requested offline', () => {
    const notifications = new FakeNotifications();
    const store = new FakeWorkoutsStore();
    const onlineStatus = new FakeOnlineStatusService(false);
    const cloudSync = new FakeCloudSyncService();

    const service = new SyncQueueService(
      notifications as any,
      store as any,
      onlineStatus as any,
      cloudSync as any
    );

    service.triggerManualSync();

    expect(notifications.messages[0]).toEqual({
      level: 'error',
      text: 'Szinkronhoz internetkapcsolat szükséges.',
    });
    expect(store.waitingEntries).not.toHaveBeenCalled();
  });

  it('dispatches create operation and stores firestoreId', async () => {
    const notifications = new FakeNotifications();
    const store = new FakeWorkoutsStore();
    const onlineStatus = new FakeOnlineStatusService(false);
    const cloudSync = new FakeCloudSyncService();

    const waiting: WorkoutEntity[] = [
      {
        id: 1,
        exercise: 'Bench',
        sets: [{ repetitions: 5, weight: 100 }],
        createdAt: '2024-02-10T10:00:00.000Z',
        queuedAt: '2024-02-10T10:00:00.000Z',
        status: 'waiting',
        operation: 'create',
        syncAttempts: 0,
      },
    ];

    store.waitingEntries.and.resolveTo(waiting);

    const service = new SyncQueueService(
      notifications as any,
      store as any,
      onlineStatus as any,
      cloudSync as any
    );

    onlineStatus.setOnline(true);
    service.triggerManualSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cloudSync.pushCreate).toHaveBeenCalledWith(waiting[0]);
    expect(store.markSynced).toHaveBeenCalledWith(1, 'fs-new-id');
    expect(notifications.messages.some((m) => m.text === 'Sorozat szinkronizálva')).toBe(true);
  });

  it('dispatches update operation', async () => {
    const notifications = new FakeNotifications();
    const store = new FakeWorkoutsStore();
    const onlineStatus = new FakeOnlineStatusService(false);
    const cloudSync = new FakeCloudSyncService();

    const waiting: WorkoutEntity[] = [
      {
        id: 2,
        exercise: 'Squat',
        sets: [{ repetitions: 8, weight: 120 }],
        createdAt: '2024-02-10T10:00:00.000Z',
        queuedAt: '2024-02-10T11:00:00.000Z',
        status: 'waiting',
        operation: 'update',
        firestoreId: 'fs-existing',
        syncAttempts: 0,
      },
    ];

    store.waitingEntries.and.resolveTo(waiting);

    const service = new SyncQueueService(
      notifications as any,
      store as any,
      onlineStatus as any,
      cloudSync as any
    );

    onlineStatus.setOnline(true);
    service.triggerManualSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cloudSync.pushUpdate).toHaveBeenCalledWith(waiting[0]);
    expect(store.markSynced).toHaveBeenCalledWith(2);
    expect(notifications.messages.some((m) => m.text === 'Sorozat frissítve')).toBe(true);
  });

  it('dispatches delete operation and hard-deletes locally', async () => {
    const notifications = new FakeNotifications();
    const store = new FakeWorkoutsStore();
    const onlineStatus = new FakeOnlineStatusService(false);
    const cloudSync = new FakeCloudSyncService();

    const waiting: WorkoutEntity[] = [
      {
        id: 3,
        exercise: 'Deadlift',
        sets: [{ repetitions: 3, weight: 180 }],
        createdAt: '2024-02-10T10:00:00.000Z',
        queuedAt: '2024-02-10T12:00:00.000Z',
        status: 'waiting',
        operation: 'delete',
        firestoreId: 'fs-to-delete',
        deleted: true,
        syncAttempts: 0,
      },
    ];

    store.waitingEntries.and.resolveTo(waiting);

    const service = new SyncQueueService(
      notifications as any,
      store as any,
      onlineStatus as any,
      cloudSync as any
    );

    onlineStatus.setOnline(true);
    service.triggerManualSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cloudSync.pushDelete).toHaveBeenCalledWith(waiting[0]);
    expect(store.hardDelete).toHaveBeenCalledWith(3);
    expect(notifications.messages.some((m) => m.text === 'Sorozat törölve')).toBe(true);
  });

  it('treats undefined operation as create (backward compat)', async () => {
    const notifications = new FakeNotifications();
    const store = new FakeWorkoutsStore();
    const onlineStatus = new FakeOnlineStatusService(false);
    const cloudSync = new FakeCloudSyncService();

    const waiting: WorkoutEntity[] = [
      {
        id: 4,
        exercise: 'OHP',
        sets: [{ repetitions: 10, weight: 40 }],
        createdAt: '2024-02-10T10:00:00.000Z',
        queuedAt: '2024-02-10T10:00:00.000Z',
        status: 'waiting',
        // operation is undefined — old entry
        syncAttempts: 0,
      },
    ];

    store.waitingEntries.and.resolveTo(waiting);

    const service = new SyncQueueService(
      notifications as any,
      store as any,
      onlineStatus as any,
      cloudSync as any
    );

    onlineStatus.setOnline(true);
    service.triggerManualSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cloudSync.pushCreate).toHaveBeenCalledWith(waiting[0]);
    expect(store.markSynced).toHaveBeenCalledWith(4, 'fs-new-id');
  });

  it('marks error on sync failure and notifies', async () => {
    const notifications = new FakeNotifications();
    const store = new FakeWorkoutsStore();
    const onlineStatus = new FakeOnlineStatusService(false);
    const cloudSync = new FakeCloudSyncService();

    cloudSync.pushCreate.and.rejectWith(new Error('Network timeout'));

    const waiting: WorkoutEntity[] = [
      {
        id: 5,
        exercise: 'Curl',
        sets: [{ repetitions: 12, weight: 20 }],
        createdAt: '2024-02-10T10:00:00.000Z',
        queuedAt: '2024-02-10T10:00:00.000Z',
        status: 'waiting',
        operation: 'create',
        syncAttempts: 0,
      },
    ];

    store.waitingEntries.and.resolveTo(waiting);

    const service = new SyncQueueService(
      notifications as any,
      store as any,
      onlineStatus as any,
      cloudSync as any
    );

    onlineStatus.setOnline(true);
    service.triggerManualSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.markError).toHaveBeenCalledWith(5, 'Network timeout');
    expect(notifications.messages.some((m) => m.level === 'error')).toBe(true);
  });
});
