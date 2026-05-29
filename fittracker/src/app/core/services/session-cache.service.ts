import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom } from 'rxjs';
import { CachedSession } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionCacheService {
  private readonly storeName = 'sessions';

  constructor(private readonly db: NgxIndexedDBService) {}

  async saveSession(session: CachedSession): Promise<void> {
    const existing = await this.findByEmail(session.email);
    if (existing) {
      await firstValueFrom(
        this.db.update(this.storeName, {
          ...existing,
          ...session,
        })
      );
      return;
    }

    await firstValueFrom(this.db.add(this.storeName, session));
  }

  async getLatestSession(): Promise<CachedSession | undefined> {
    const sessions = await firstValueFrom(this.db.getAll<CachedSession>(this.storeName));
    if (!sessions.length) {
      return undefined;
    }

    return sessions
      .filter((item) => Boolean(item.lastLoginAt))
      .sort((a, b) => b.lastLoginAt.localeCompare(a.lastLoginAt))[0];
  }

  async findByEmail(email: string): Promise<CachedSession | undefined> {
    try {
      return await firstValueFrom(this.db.getByIndex<CachedSession>(this.storeName, 'email', email));
    } catch {
      return undefined;
    }
  }

  async touchLastLogin(email: string, lastLoginAt: string): Promise<CachedSession | undefined> {
    const existing = await this.findByEmail(email);
    if (!existing) {
      return undefined;
    }

    const updated: CachedSession = {
      ...existing,
      lastLoginAt,
    };

    await firstValueFrom(this.db.update(this.storeName, updated));
    return updated;
  }

  async clear(): Promise<void> {
    await firstValueFrom(this.db.clear(this.storeName));
  }
}
