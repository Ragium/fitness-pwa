import { Injectable, Optional } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import { ActiveSession, CachedSession } from '../models/session.model';
import { SessionCacheService } from './session-cache.service';
import { OnlineStatusService } from './online-status.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionSubject = new BehaviorSubject<ActiveSession | null>(null);
  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    @Optional() private readonly auth: Auth | null,
    private readonly cache: SessionCacheService,
    private readonly onlineStatus: OnlineStatusService,
    private readonly notifications: NotificationService
  ) {
    void this.restoreCachedSession();
  }

  sessionSnapshot(): ActiveSession | null {
    return this.sessionSubject.value;
  }

  async register(email: string, password: string): Promise<ActiveSession> {
    if (!this.auth || !this.onlineStatus.snapshot()) {
      const error = new Error('Regisztrációhoz aktív internetkapcsolat szükséges.');
      this.notifications.error(error.message);
      throw error;
    }

    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      return this.persistOnlineSession(credential.user.uid, credential.user.email ?? email, password, credential.user.displayName);
    } catch (error) {
      this.notifications.error('A regisztráció nem sikerült.');
      throw error;
    }
  }

  async login(email: string, password: string): Promise<ActiveSession> {
    if (this.onlineStatus.snapshot() && this.auth) {
      return this.loginOnline(email, password);
    }

    return this.resumeOffline(email, password);
  }

  async logout(): Promise<void> {
    if (this.auth && this.onlineStatus.snapshot()) {
      await signOut(this.auth);
    }
    await this.cache.clear();
    this.sessionSubject.next(null);
  }

  private async loginOnline(email: string, password: string): Promise<ActiveSession> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth!, email, password);
      const session = await this.persistOnlineSession(
        credential.user.uid,
        credential.user.email ?? email,
        password,
        credential.user.displayName
      );
      this.notifications.success('Sikeres bejelentkezés');
      return session;
    } catch (error) {
      this.notifications.error('Hibás belépési adatok');
      throw error;
    }
  }

  private async resumeOffline(email: string, password: string): Promise<ActiveSession> {
    const cached = await this.cache.findByEmail(email);
    if (!cached) {
      const error = new Error('Offline módban csak korábban bejelentkezett felhasználók léphetnek be.');
      this.notifications.error(error.message);
      throw error;
    }

    const hashedSecret = await this.hashSecret(password);
    if (cached.hashedSecret !== hashedSecret) {
      const error = new Error('Offline visszatéréshez pontos jelszó szükséges.');
      this.notifications.error(error.message);
      throw error;
    }

    const offlineLoginAt = new Date().toISOString();
    const refreshed = await this.cache.touchLastLogin(cached.email, offlineLoginAt);

    const session: ActiveSession = {
      uid: cached.uid,
      email: cached.email,
      displayName: cached.displayName,
      lastLoginAt: refreshed?.lastLoginAt ?? offlineLoginAt,
      offlineCapable: true,
    };
    this.sessionSubject.next(session);
    this.notifications.info('Offline üzemmódban folytatjuk.');
    return session;
  }

  private async persistOnlineSession(
    uid: string,
    email: string,
    password: string,
    displayName?: string | null
  ): Promise<ActiveSession> {
    const now = new Date().toISOString();
    const session: ActiveSession = {
      uid,
      email,
      displayName: displayName ?? undefined,
      lastLoginAt: now,
      offlineCapable: true,
    };

    const cached: CachedSession = {
      ...session,
      hashedSecret: await this.hashSecret(password),
    };
    await this.cache.saveSession(cached);
    this.sessionSubject.next(session);
    return session;
  }

  private async restoreCachedSession(): Promise<void> {
    const cached = await this.cache.getLatestSession();
    if (cached) {
      this.sessionSubject.next({
        uid: cached.uid,
        email: cached.email,
        displayName: cached.displayName,
        lastLoginAt: cached.lastLoginAt,
        offlineCapable: true,
      });
    }
  }

  private async hashSecret(secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const byteArray = Array.from(new Uint8Array(digest));
    return byteArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
