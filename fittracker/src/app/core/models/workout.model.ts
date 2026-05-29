export type WorkoutStatus = 'waiting' | 'synced' | 'error';
export type WorkoutOperation = 'create' | 'update' | 'delete';

export interface WorkoutSet {
  weight: number;
  repetitions: number;
  rpe?: number;
  note?: string;
}

export interface WorkoutDraft {
  exercise: string;
  sets: WorkoutSet[];
  note?: string;
}

export interface WorkoutEntity extends WorkoutDraft {
  ownerId?: string;
  id?: number;
  createdAt: string;
  status: WorkoutStatus;
  operation?: WorkoutOperation;
  firestoreId?: string;
  deleted?: boolean;
  queuedAt: string;
  syncedAt?: string;
  syncAttempts: number;
  lastError?: string;
}

export interface SyncEvent {
  id?: number;
  workoutId: number;
  status: WorkoutStatus;
  createdAt: string;
  note?: string;
}

export interface WorkoutSummary {
  totalSets: number;
  totalVolume: number;
  streakDays: number;
  lastThreeSessions: string[];
}
