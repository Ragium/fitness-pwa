import { Injectable, Inject, InjectionToken, Optional } from '@angular/core';
import { Firestore, addDoc, collection, doc, updateDoc, deleteDoc, getDocs } from '@angular/fire/firestore';
import { environment } from '../../../environments/environment';
import { WorkoutEntity } from '../models/workout.model';
import { AuthService } from './auth.service';

export interface FirestoreOps {
  addDoc: typeof addDoc;
  collection: typeof collection;
  doc: typeof doc;
  updateDoc: typeof updateDoc;
  deleteDoc: typeof deleteDoc;
  getDocs: typeof getDocs;
}

export const FIRESTORE_OPS = new InjectionToken<FirestoreOps>('FIRESTORE_OPS');

@Injectable({ providedIn: 'root' })
export class CloudSyncService {
  private readonly ops: FirestoreOps;

  constructor(
    @Optional() private readonly firestore: Firestore | null,
    private readonly auth: AuthService,
    @Optional() @Inject(FIRESTORE_OPS) ops?: FirestoreOps
  ) {
    this.ops = ops ?? { addDoc, collection, doc, updateDoc, deleteDoc, getDocs };
  }

  /**
   * Creates a new workout document in Firestore with subcollections.
   * Returns the Firestore document ID for local→cloud mapping.
   */
  async pushCreate(workout: WorkoutEntity): Promise<string> {
    this.assertReady();

    const session = this.auth.sessionSnapshot();
    if (!session?.uid) {
      throw new Error('Nincs bejelentkezett felhasználó, nem szinkronizálható a workout');
    }

    const sets = this.sanitizeSets(workout);
    const totalVolume = sets.reduce((sum, s) => sum + (s.repetitions ?? 0) * (s.weight ?? 0), 0);

    const workoutsCollection = this.ops.collection(this.firestore!, 'workouts');
    const workoutDocRef = await this.ops.addDoc(workoutsCollection, {
      ownerId: session.uid,
      exercise: workout.exercise,
      totalSets: sets.length,
      totalVolume,
      sets,
      createdAt: workout.createdAt,
      localId: workout.id,
      note: workout.note ?? null,
    });

    // Subcollection: exercises
    const exercisesCollection = this.ops.collection(workoutDocRef as any, 'exercises');
    const exerciseRef = await this.ops.addDoc(exercisesCollection, {
      ownerId: session.uid,
      name: workout.exercise,
      note: workout.note ?? null,
    });

    // Sub-subcollection: sets
    const setsCollection = this.ops.collection(exerciseRef as any, 'sets');
    for (const set of sets) {
      await this.ops.addDoc(setsCollection, {
        ownerId: session.uid,
        weight: set.weight,
        repetitions: set.repetitions,
        note: set.note ?? null,
        createdAt: workout.createdAt,
        localId: workout.id,
      });
    }

    return (workoutDocRef as any).id;
  }

  /**
   * Updates an existing workout document in Firestore.
   * Replaces subcollection documents (delete + recreate strategy).
   */
  async pushUpdate(workout: WorkoutEntity): Promise<void> {
    this.assertReady();

    const session = this.auth.sessionSnapshot();
    if (!session?.uid) {
      throw new Error('Nincs bejelentkezett felhasználó, nem szinkronizálható a workout');
    }

    if (!workout.firestoreId) {
      throw new Error('Nincs Firestore ID — update nem lehetséges');
    }

    const sets = this.sanitizeSets(workout);
    const totalVolume = sets.reduce((sum, s) => sum + (s.repetitions ?? 0) * (s.weight ?? 0), 0);

    // Update the main workout document
    const workoutDocRef = this.ops.doc(this.firestore!, 'workouts', workout.firestoreId);
    await this.ops.updateDoc(workoutDocRef, {
      exercise: workout.exercise,
      totalSets: sets.length,
      totalVolume,
      sets,
      note: workout.note ?? null,
      updatedAt: new Date().toISOString(),
    });

    // Recreate subcollections: delete existing exercises (and their sets), then recreate
    await this.deleteSubcollections(workout.firestoreId);

    const exercisesCollection = this.ops.collection(workoutDocRef as any, 'exercises');
    const exerciseRef = await this.ops.addDoc(exercisesCollection, {
      ownerId: session.uid,
      name: workout.exercise,
      note: workout.note ?? null,
    });

    const setsCollection = this.ops.collection(exerciseRef as any, 'sets');
    for (const set of sets) {
      await this.ops.addDoc(setsCollection, {
        ownerId: session.uid,
        weight: set.weight,
        repetitions: set.repetitions,
        note: set.note ?? null,
        createdAt: workout.createdAt,
        localId: workout.id,
      });
    }
  }

  /**
   * Deletes a workout document and its subcollections from Firestore.
   */
  async pushDelete(workout: WorkoutEntity): Promise<void> {
    this.assertReady();

    if (!workout.firestoreId) {
      throw new Error('Nincs Firestore ID — delete nem lehetséges');
    }

    // Delete subcollections first (Firestore doesn't cascade)
    await this.deleteSubcollections(workout.firestoreId);

    // Delete the main document
    const workoutDocRef = this.ops.doc(this.firestore!, 'workouts', workout.firestoreId);
    await this.ops.deleteDoc(workoutDocRef);
  }

  /**
   * Backward-compatible wrapper — delegates to pushCreate, ignores returned ID.
   * @deprecated Use pushCreate directly for new code.
   */
  async pushWorkout(workout: WorkoutEntity): Promise<void> {
    await this.pushCreate(workout);
  }

  private async deleteSubcollections(workoutFirestoreId: string): Promise<void> {
    const workoutDocRef = this.ops.doc(this.firestore!, 'workouts', workoutFirestoreId);
    const exercisesCollection = this.ops.collection(workoutDocRef as any, 'exercises');
    const exercisesSnapshot = await this.ops.getDocs(exercisesCollection);

    for (const exerciseDoc of exercisesSnapshot.docs) {
      // Delete sets sub-subcollection
      const setsCollection = this.ops.collection(exerciseDoc.ref as any, 'sets');
      const setsSnapshot = await this.ops.getDocs(setsCollection);
      for (const setDoc of setsSnapshot.docs) {
        await this.ops.deleteDoc(setDoc.ref);
      }
      // Delete the exercise document
      await this.ops.deleteDoc(exerciseDoc.ref);
    }
  }

  private assertReady(): void {
    if (!environment.syncEnabled) {
      throw new Error('Sync kikapcsolva (dev mód)');
    }
    if (!this.canUseFirestore()) {
      throw new Error('Firestore nem elérhető vagy a kulcs blokkolva van / nincs létrehozva');
    }
  }

  private canUseFirestore(): boolean {
    return Boolean(this.firestore) && environment.firebase.apiKey !== 'demo-api-key';
  }

  private sanitizeSets(workout: WorkoutEntity) {
    return (workout.sets ?? []).map((s) => ({
      weight: Number(s.weight) || 0,
      repetitions: Number(s.repetitions) || 0,
      note: s.note ?? null,
    }));
  }
}
