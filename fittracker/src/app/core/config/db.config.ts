import { DBConfig } from 'ngx-indexed-db';

export const fitTrackerDbConfig: DBConfig = {
  name: 'fittracker-offline-db',
  // Bump version when schema changes (v7: added operation, firestoreId, deleted fields).
  version: 7,
  objectStoresMeta: [
    {
      store: 'workouts',
      storeConfig: { keyPath: 'id', autoIncrement: true },
      storeSchema: [
        { name: 'exercise', keypath: 'exercise', options: { unique: false } },
        { name: 'status', keypath: 'status', options: { unique: false } },
        { name: 'createdAt', keypath: 'createdAt', options: { unique: false } },
        { name: 'queuedAt', keypath: 'queuedAt', options: { unique: false } },
        { name: 'ownerId', keypath: 'ownerId', options: { unique: false } },
      ],
    },
    {
      store: 'sessions',
      storeConfig: { keyPath: 'id', autoIncrement: true },
      storeSchema: [
        { name: 'email', keypath: 'email', options: { unique: true } },
        { name: 'lastLoginAt', keypath: 'lastLoginAt', options: { unique: false } },
      ],
    },
    {
      store: 'sync_events',
      storeConfig: { keyPath: 'id', autoIncrement: true },
      storeSchema: [
        { name: 'workoutId', keypath: 'workoutId', options: { unique: false } },
        { name: 'status', keypath: 'status', options: { unique: false } },
        { name: 'createdAt', keypath: 'createdAt', options: { unique: false } },
      ],
    },
    {
      store: 'workout_sessions',
      storeConfig: { keyPath: 'id', autoIncrement: false },
      storeSchema: [
        { name: 'startedAt', keypath: 'startedAt', options: { unique: false } },
        { name: 'endedAt', keypath: 'endedAt', options: { unique: false } },
      ],
    },
  ],
};
