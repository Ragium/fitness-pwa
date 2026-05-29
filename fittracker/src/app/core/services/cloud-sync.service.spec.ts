import { environment } from '../../../environments/environment';
import { CloudSyncService, FirestoreOps } from './cloud-sync.service';
import { WorkoutEntity } from '../models/workout.model';

describe('CloudSyncService', () => {
  const baseWorkout: WorkoutEntity = {
    id: 10,
    exercise: 'Bench',
    sets: [
      { repetitions: 6, weight: 100 },
      { repetitions: 4, weight: 110, note: 'top' },
    ],
    createdAt: '2024-02-10T10:00:00.000Z',
    queuedAt: '2024-02-10T10:00:00.000Z',
    status: 'waiting',
    operation: 'create',
    syncAttempts: 0,
  };

  const authStub = {
    sessionSnapshot: () => ({ uid: 'user-1' }),
  };

  let originalSyncEnabled: boolean;
  let ops: FirestoreOps;

  beforeEach(() => {
    originalSyncEnabled = environment.syncEnabled;
    ops = {
      addDoc: jasmine.createSpy('addDoc').and.resolveTo({ id: 'fs-generated-id' } as any),
      collection: jasmine.createSpy('collection').and.returnValue({} as any),
      doc: jasmine.createSpy('doc').and.returnValue({} as any),
      updateDoc: jasmine.createSpy('updateDoc').and.resolveTo(undefined),
      deleteDoc: jasmine.createSpy('deleteDoc').and.resolveTo(undefined),
      getDocs: jasmine.createSpy('getDocs').and.resolveTo({ docs: [] } as any),
    };
  });

  afterEach(() => {
    environment.syncEnabled = originalSyncEnabled;
  });

  it('skips remote sync when sync is disabled', async () => {
    environment.syncEnabled = false;
    const service = new CloudSyncService({} as any, authStub as any, ops);

    await expectAsync(service.pushCreate(baseWorkout)).toBeRejectedWithError(/Sync kikapcsolva/);
    expect(ops.addDoc).not.toHaveBeenCalled();
  });

  it('throws when Firestore is unavailable', async () => {
    environment.syncEnabled = true;
    const service = new CloudSyncService(null, authStub as any);

    await expectAsync(service.pushCreate(baseWorkout)).toBeRejectedWithError(/Firestore/);
  });

  it('throws when no user session is available', async () => {
    environment.syncEnabled = true;
    const service = new CloudSyncService({} as any, { sessionSnapshot: () => null } as any, ops);

    await expectAsync(service.pushCreate(baseWorkout)).toBeRejectedWithError(/Nincs bejelentkezett/);
    expect(ops.addDoc).not.toHaveBeenCalled();
  });

  it('pushCreate writes workout, exercise, and sets and returns firestoreId', async () => {
    environment.syncEnabled = true;
    const service = new CloudSyncService({} as any, authStub as any, ops);

    const firestoreId = await service.pushCreate(baseWorkout);

    expect(firestoreId).toBe('fs-generated-id');
    expect(ops.collection).toHaveBeenCalledTimes(3); // workouts, exercises, sets
    expect(ops.addDoc).toHaveBeenCalledTimes(4); // 1 workout + 1 exercise + 2 sets
  });

  it('pushUpdate calls updateDoc with correct fields', async () => {
    environment.syncEnabled = true;
    const workout: WorkoutEntity = {
      ...baseWorkout,
      firestoreId: 'fs-existing-id',
      operation: 'update',
    };
    const service = new CloudSyncService({} as any, authStub as any, ops);

    await service.pushUpdate(workout);

    expect(ops.doc).toHaveBeenCalledWith(jasmine.anything(), 'workouts', 'fs-existing-id');
    expect(ops.updateDoc).toHaveBeenCalledTimes(1);
    const updateArgs = (ops.updateDoc as jasmine.Spy).calls.first().args[1];
    expect(updateArgs.exercise).toBe('Bench');
    expect(updateArgs.totalSets).toBe(2);
  });

  it('pushUpdate throws when no firestoreId', async () => {
    environment.syncEnabled = true;
    const workout: WorkoutEntity = { ...baseWorkout, firestoreId: undefined, operation: 'update' };
    const service = new CloudSyncService({} as any, authStub as any, ops);

    await expectAsync(service.pushUpdate(workout)).toBeRejectedWithError(/Nincs Firestore ID/);
  });

  it('pushDelete calls deleteDoc on the workout document', async () => {
    environment.syncEnabled = true;
    const workout: WorkoutEntity = {
      ...baseWorkout,
      firestoreId: 'fs-to-delete',
      operation: 'delete',
      deleted: true,
    };
    const service = new CloudSyncService({} as any, authStub as any, ops);

    await service.pushDelete(workout);

    expect(ops.doc).toHaveBeenCalledWith(jasmine.anything(), 'workouts', 'fs-to-delete');
    expect(ops.deleteDoc).toHaveBeenCalled();
  });

  it('pushDelete throws when no firestoreId', async () => {
    environment.syncEnabled = true;
    const workout: WorkoutEntity = { ...baseWorkout, firestoreId: undefined, operation: 'delete' };
    const service = new CloudSyncService({} as any, authStub as any, ops);

    await expectAsync(service.pushDelete(workout)).toBeRejectedWithError(/Nincs Firestore ID/);
  });

  it('backward-compatible pushWorkout delegates to pushCreate', async () => {
    environment.syncEnabled = true;
    const service = new CloudSyncService({} as any, authStub as any, ops);

    await service.pushWorkout(baseWorkout);

    expect(ops.addDoc).toHaveBeenCalled();
  });
});
