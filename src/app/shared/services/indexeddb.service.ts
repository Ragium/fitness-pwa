import { Injectable } from '@angular/core';
import { Workout } from '../models/workout.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private db!: IDBDatabase;
  private readonly DB_NAME = 'fitnessPWA';
  private readonly STORE_NAME = 'workouts';
  private readonly USERS_STORE = 'users';
  private readonly SYNC_STORE = 'syncQueue';
  private readonly DELETED_WORKOUTS_STORE = 'deletedWorkouts';
  public workouts: Workout[] = [];

  constructor() {
    this.initIndexedDB();
  }

  private initIndexedDB() {
    const request = indexedDB.open(this.DB_NAME, 8);

    request.onerror = (event: any) => {
      console.error('IndexedDB hiba:', event.target.error);
    };

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;

      // Töröljük a régi store-okat, ha léteznek
      if (db.objectStoreNames.contains(this.STORE_NAME)) {
        db.deleteObjectStore(this.STORE_NAME);
      }
      if (db.objectStoreNames.contains(this.SYNC_STORE)) {
        db.deleteObjectStore(this.SYNC_STORE);
      }
      if (db.objectStoreNames.contains(this.USERS_STORE)) {
        db.deleteObjectStore(this.USERS_STORE);
      }
      if (db.objectStoreNames.contains(this.DELETED_WORKOUTS_STORE)) {
        db.deleteObjectStore(this.DELETED_WORKOUTS_STORE);
      }

      // Létrehozzuk az új store-okat
      const workoutStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
      const syncStore = db.createObjectStore(this.SYNC_STORE, { keyPath: 'id' });
      const userStore = db.createObjectStore(this.USERS_STORE, { keyPath: 'id' });
      const deletedWorkoutsStore = db.createObjectStore(this.DELETED_WORKOUTS_STORE, { keyPath: 'id' });

      // Indexek létrehozása
      workoutStore.createIndex('id', 'id', { unique: false });
      syncStore.createIndex('id', 'id', { unique: false });
      userStore.createIndex('emailIndex', 'email', { unique: false });
      deletedWorkoutsStore.createIndex('id', 'id', { unique: false });
    };

    request.onsuccess = (event: any) => {
      this.db = event.target.result;
      this.loadWorkouts();
      console.log('IndexedDB sikeresen inicializálva');
    };
  }

  saveWorkout(workout: Workout, isOnline: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME, this.SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const syncStore = transaction.objectStore(this.SYNC_STORE);

      const request = store.put(workout);

      request.onsuccess = () => {
        console.log('Workout sikeresen mentve az IndexedDB-be');
        if (!isOnline) {
          const syncRequest = syncStore.put(workout);
          syncRequest.onsuccess = () => {
            console.log('Workout sikeresen mentve a szinkronizációs sorba');
            resolve();
          };
          syncRequest.onerror = (event: any) => {
            console.error('Szinkronizációs sor mentési hiba:', event.target.error);
            reject(event.target.error);
          };
        } else {
          resolve();
        }
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB mentési hiba:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  getWorkouts(): Promise<Workout[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB lekérési hiba:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  getSyncQueue(): Promise<Workout[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.SYNC_STORE, 'readonly');
      const store = transaction.objectStore(this.SYNC_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB szinkronizációs sor lekérési hiba:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  removeFromSyncQueue(workoutId: string): void {
    const transaction = this.db.transaction(this.SYNC_STORE, 'readwrite');
    const store = transaction.objectStore(this.SYNC_STORE);
    const request = store.delete(workoutId);

    request.onsuccess = () => {
      console.log('Workout sikeresen törölve a szinkronizációs sorból');
    };

    request.onerror = (event: any) => {
      console.error('IndexedDB törlési hiba:', event.target.error);
    };
  }

  deleteWorkout(workoutId: string): void {
    const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.delete(workoutId);

    request.onsuccess = () => {
      console.log('Workout sikeresen törölve az IndexedDB-ből');
    };

    request.onerror = (event: any) => {
      console.error('IndexedDB törlési hiba:', event.target.error);
    };
  }

  loadWorkouts(): void {
    const objectStore = this.db.transaction(this.STORE_NAME).objectStore(this.STORE_NAME);
    objectStore.openCursor().onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        this.workouts.push(cursor.value);
        cursor.continue();
      }
    };
  }

  async saveUser(user: User): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    await store.put(user);
  }

  async getUser(id: string): Promise<User | null> {
    const db = await this.getDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    await store.delete(id);
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 8);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const workoutStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          workoutStore.createIndex('id', 'id', { unique: false });
        }
        if (!db.objectStoreNames.contains(this.USERS_STORE)) {
          const userStore = db.createObjectStore(this.USERS_STORE, { keyPath: 'id' });
          userStore.createIndex('emailIndex', 'email', { unique: false });
        }
        if (!db.objectStoreNames.contains(this.SYNC_STORE)) {
          const syncStore = db.createObjectStore(this.SYNC_STORE, { keyPath: 'id' });
          syncStore.createIndex('id', 'id', { unique: false });
        }
      };
    });
  }

  async addToDeletedWorkouts(workoutId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Törlendő edzés hozzáadása:', workoutId);
        const transaction = this.db.transaction(this.DELETED_WORKOUTS_STORE, 'readwrite');
        const store = transaction.objectStore(this.DELETED_WORKOUTS_STORE);
        
        const request = store.put({ id: workoutId, timestamp: new Date().getTime() });
        
        request.onsuccess = () => {
          console.log('Edzés sikeresen hozzáadva a törlendők listájához:', workoutId);
          resolve();
        };
        
        request.onerror = (event: any) => {
          console.error('Hiba a törlendő edzés mentésekor:', event.target.error);
          reject(event.target.error);
        };

        transaction.oncomplete = () => {
          console.log('Tranzakció sikeresen befejeződött');
        };

        transaction.onerror = (event: any) => {
          console.error('Tranzakció hiba:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Hiba a tranzakció létrehozásakor:', error);
        reject(error);
      }
    });
  }

  async getDeletedWorkouts(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.DELETED_WORKOUTS_STORE, 'readonly');
      const store = transaction.objectStore(this.DELETED_WORKOUTS_STORE);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const deletedWorkouts = request.result.map(item => item.id);
        console.log('Törölt edzések lekérdezve:', deletedWorkouts);
        
        // Töröljük a törölt edzéseket a store-ból
        const deleteTx = this.db.transaction(this.DELETED_WORKOUTS_STORE, 'readwrite');
        const deleteStore = deleteTx.objectStore(this.DELETED_WORKOUTS_STORE);
        
        deletedWorkouts.forEach(id => {
          const deleteRequest = deleteStore.delete(id);
          deleteRequest.onsuccess = () => {
            console.log('Edzés törölve a deletedWorkouts store-ból:', id);
          };
          deleteRequest.onerror = (event: any) => {
            console.error('Hiba az edzés törlése során a store-ból:', id, event.target.error);
          };
        });
        
        resolve(deletedWorkouts);
      };
      
      request.onerror = (event: any) => {
        console.error('Hiba a törölt edzések lekérdezése során:', event.target.error);
        reject(event.target.error);
      };
    });
  }
} 