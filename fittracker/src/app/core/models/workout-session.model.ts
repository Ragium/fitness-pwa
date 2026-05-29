export interface WorkoutSet {
  id: string;
  weight: number;
  repetitions: number;
  rpe?: number;
  note?: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  sets: WorkoutSet[];
  note?: string;
}

export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  perceivedEffort?: number;
  location?: string;
  notes?: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutSessionSummary {
  id: string;
  startedAt: string;
  endedAt?: string;
  totalVolume: number;
  totalSets: number;
  exerciseCount: number;
}
