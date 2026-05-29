import { of } from 'rxjs';
import { CachedSession } from '../models/session.model';
import { SessionCacheService } from './session-cache.service';

class FakeIndexedDbService {
  private readonly sessions: CachedSession[];
  updateCalls = 0;
  addCalls = 0;
  lastUpdated?: CachedSession;

  constructor(initial: CachedSession[] = []) {
    this.sessions = [...initial];
  }

  getByIndex<T>(_storeName: string, indexName: string, value: string) {
    const record = this.sessions.find((item) => (item as any)[indexName] === value);
    return of(record ? ({ ...record } as unknown as T) : undefined);
  }

  update<T>(_storeName: string, entity: T) {
    this.updateCalls += 1;
    this.lastUpdated = entity as unknown as CachedSession;

    const index = this.sessions.findIndex((item) => item.email === (entity as any).email);
    if (index >= 0) {
      this.sessions[index] = entity as any;
    } else {
      this.sessions.push(entity as any);
    }
    return of(entity);
  }

  add<T>(_storeName: string, entity: T) {
    this.addCalls += 1;
    this.sessions.push(entity as any);
    return of(entity);
  }

  getAll<T>(_storeName: string) {
    return of(this.sessions.map((item) => ({ ...item })) as T);
  }
}

describe('SessionCacheService', () => {
  it('updates lastLoginAt for an existing cached session', async () => {
    const db = new FakeIndexedDbService([
      {
        uid: 'uid-1',
        email: 'user@test.com',
        displayName: 'User',
        hashedSecret: 'hash',
        lastLoginAt: '2024-02-01T00:00:00.000Z',
      },
    ]);
    const service = new SessionCacheService(db as any);

    const result = await service.touchLastLogin('user@test.com', '2024-03-10T10:00:00.000Z');

    expect(result?.lastLoginAt).toBe('2024-03-10T10:00:00.000Z');
    expect(db.lastUpdated?.lastLoginAt).toBe('2024-03-10T10:00:00.000Z');
  });

  it('returns undefined and skips update when the session is missing', async () => {
    const db = new FakeIndexedDbService();
    const service = new SessionCacheService(db as any);

    const result = await service.touchLastLogin('missing@test.com', '2024-03-10T10:00:00.000Z');

    expect(result).toBeUndefined();
    expect(db.updateCalls).toBe(0);
  });

  it('adds a new session when the email is not cached', async () => {
    const db = new FakeIndexedDbService();
    const service = new SessionCacheService(db as any);

    await service.saveSession({
      uid: 'uid-2',
      email: 'new@test.com',
      hashedSecret: 'hash2',
      lastLoginAt: '2024-03-11T10:00:00.000Z',
    });

    expect(db.addCalls).toBe(1);
    expect(db.updateCalls).toBe(0);
  });

  it('picks the latest session by lastLoginAt', async () => {
    const db = new FakeIndexedDbService([
      {
        uid: 'uid-1',
        email: 'old@test.com',
        hashedSecret: 'hash',
        lastLoginAt: '2024-01-01T00:00:00.000Z',
      },
      {
        uid: 'uid-2',
        email: 'new@test.com',
        hashedSecret: 'hash',
        lastLoginAt: '2024-03-01T00:00:00.000Z',
      },
    ]);
    const service = new SessionCacheService(db as any);

    const latest = await service.getLatestSession();

    expect(latest?.email).toBe('new@test.com');
  });

  it('returns undefined when no session has lastLoginAt', async () => {
    const db = new FakeIndexedDbService([
      {
        uid: 'uid-1',
        email: 'no-date@test.com',
        hashedSecret: 'hash',
        lastLoginAt: '',
      },
    ]);
    const service = new SessionCacheService(db as any);

    const latest = await service.getLatestSession();

    expect(latest).toBeUndefined();
  });
});
