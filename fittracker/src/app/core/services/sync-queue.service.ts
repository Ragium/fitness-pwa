import { Injectable } from '@angular/core';
import { filter } from 'rxjs';
import { NotificationService } from './notification.service';
import { WorkoutsStoreService } from './workouts-store.service';
import { OnlineStatusService } from './online-status.service';
import { CloudSyncService } from './cloud-sync.service';
import { WorkoutEntity } from '../models/workout.model';

@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private processing = false;

  constructor(
    private readonly notifications: NotificationService,
    private readonly store: WorkoutsStoreService,
    private readonly onlineStatus: OnlineStatusService,
    private readonly cloudSync: CloudSyncService
  ) {
    // próbáljuk meg induláskor is feldolgozni a sort (ha van kapcsolat)
    void this.processQueue();
    // Időzített újrapróbálás: ha visszajött a net, de event nem jött, 15 mp-enként ránézünk
    setInterval(() => {
      if (this.onlineStatus.snapshot()) {
        void this.processQueue();
      }
    }, 15000);

    this.onlineStatus.status$
      .pipe(filter((online) => online))
      .subscribe(() => {
        void this.processQueue();
      });

    this.store.workouts$
      .pipe(filter(() => this.onlineStatus.snapshot()))
      .subscribe(() => {
        void this.processQueue();
      });
  }

  triggerManualSync(): void {
    if (!this.onlineStatus.snapshot()) {
      this.notifications.error('Szinkronhoz internetkapcsolat szükséges.');
      return;
    }

    void this.processQueue();
  }

  async retry(workout: WorkoutEntity): Promise<void> {
    await this.store.retry(workout.id!);
    this.notifications.info('Újrapróbáljuk a szinkront.');
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (!this.onlineStatus.snapshot()) {
      return;
    }

    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      const waiting = await this.store.waitingEntries();
      for (const workout of waiting) {
        await this.syncWorkout(workout);
      }
    } finally {
      this.processing = false;
    }
  }

  private async syncWorkout(workout: WorkoutEntity): Promise<void> {
    if (!workout.id) {
      await this.store.markError(workout.id ?? -1, 'Hiányzó azonosító, nem szinkronizálható');
      return;
    }

    const operation = workout.operation ?? 'create'; // backward compat

    try {
      switch (operation) {
        case 'create': {
          const firestoreId = await this.cloudSync.pushCreate(workout);
          await this.store.markSynced(workout.id, firestoreId);
          this.notifications.success('Sorozat szinkronizálva');
          break;
        }
        case 'update': {
          await this.cloudSync.pushUpdate(workout);
          await this.store.markSynced(workout.id);
          this.notifications.success('Sorozat frissítve');
          break;
        }
        case 'delete': {
          await this.cloudSync.pushDelete(workout);
          await this.store.hardDelete(workout.id);
          this.notifications.success('Sorozat törölve');
          break;
        }
      }
    } catch (error) {
      const message = (error as Error)?.message ?? 'Ismeretlen hiba';
      await this.store.markError(workout.id, message);
      this.notifications.error(`Szinkron hiba: ${message}`);
    }
  }
}
