export interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    type: 'triceps' | 'biceps' | 'chest' | 'back' | 'shoulders' | 'legs' | 'abs' | 'cardio';
}

export interface Workout {
    id: string;
    name: string;
    exercises: Array<Exercise>;
    date: Date;
    notes?: string;
    uid: string;
    totalWeight: number;
}
