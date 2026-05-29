import { of } from 'rxjs';
import { WorkoutSessionStoreService } from './workout-session-store.service';
import { WorkoutSession } from '../models/workout-session.model';

class FakeIndexedDbService {
  private sessions: WorkoutSession[] = [];
  addCalls = 0;
  updateCalls = 0;
  clearCalls = 0;

  add<T>(_storeName: string, entity: T) {
    this.addCalls += 1;
    this.sessions.push(entity as any);
    return of(entity);
  }

  update<T>(_storeName: string, entity: T) {
    this.updateCalls += 1;
    const index = this.sessions.findIndex((item) => item.id === (entity as any).id);
    if (index >= 0) {
      this.sessions[index] = entity as any;
    } else {
      this.sessions.push(entity as any);
    }
    return of(entity);
  }

  getAll<T>(_storeName: string) {
    return of(this.sessions.map((item) => ({ ...item } as any)) as T);
  }

  clear(_storeName: string) {
    this.clearCalls += 1;
    this.sessions = [];
    return of(undefined);
  }
}

describe('WorkoutSessionStoreService', () => {
  it('saves and loads sessions from storage', async () => {
    const db = new FakeIndexedDbService();
    const service = new WorkoutSessionStoreService(db as any);
    const session: WorkoutSession = {
      id: 's1',
      startedAt: '2024-02-10T10:00:00.000Z',
      exercises: [],
    };

    await service.save(session);
    const loaded = await service.getAll();

    expect(loaded.length).toBe(1);
    expect(db.addCalls).toBe(1);
  });

  it('upserts sessions and clears storage', async () => {
    const db = new FakeIndexedDbService();
    const service = new WorkoutSessionStoreService(db as any);
    const session: WorkoutSession = {
      id: 's2',
      startedAt: '2024-02-10T10:00:00.000Z',
      exercises: [],
    };

    await service.upsert(session);
    await service.clearAll();
    const loaded = await service.getAll();

    expect(db.updateCalls).toBe(1);
    expect(db.clearCalls).toBe(1);
    expect(loaded.length).toBe(0);
  });

  it('builds a sample session with exercises and sets', () => {
    const db = new FakeIndexedDbService();
    const service = new WorkoutSessionStoreService(db as any);

    const sample = service.buildSampleSession();

    expect(sample.exercises.length).toBe(2);
    expect(sample.exercises[0].sets.length).toBeGreaterThan(0);
  });
});
