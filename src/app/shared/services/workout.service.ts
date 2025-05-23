import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, collectionData, deleteDoc, query, where, orderBy, DocumentData, Timestamp, onSnapshot, limit, startAfter, getDocs, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { Workout } from '../models/workout.model';
import { Observable, from, map, switchMap, of, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private collectionName = "workouts";
  private workoutCache = new BehaviorSubject<Map<string, Workout[]>>(new Map());

  constructor() {}

  create(workout: Workout): Observable<void> {
    const workoutRef = doc(this.firestore, this.collectionName, workout.id);
    return from(setDoc(workoutRef, workout));
  }

  getAll(): Observable<Workout[]> {
    const workoutsRef = collection(this.firestore, this.collectionName);
    return collectionData(workoutsRef, { idField: 'id' }) as Observable<Workout[]>;
  }

  getById(id: string): Observable<Workout | null> {
    const workoutRef = doc(this.firestore, this.collectionName, id);
    return from(getDoc(workoutRef)).pipe(
      map(doc => {
        if (!doc.exists()) return null;
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          date: this.convertTimestampToDate(data['date'])
        } as Workout;
      })
    );
  }

  getByUserId(userId: string): Observable<Workout[]> {
    // Először ellenőrizzük a cache-t
    const cachedWorkouts = this.workoutCache.value.get(userId);
    if (cachedWorkouts) {
      return new Observable<Workout[]>(observer => {
        observer.next(cachedWorkouts);
      });
    }

    const workoutsRef = collection(this.firestore, this.collectionName);
    const q = query(workoutsRef, where('uid', '==', userId));
    
    return new Observable<Workout[]>(observer => {
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const source = snapshot.metadata.fromCache ? "local cache" : "server";
          console.log("Edzések adatai innen érkeztek: " + source);
          
          const workouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: this.convertTimestampToDate(doc.data()['date'])
          } as Workout));
          
          // Frissítjük a cache-t
          const currentCache = this.workoutCache.value;
          currentCache.set(userId, workouts);
          this.workoutCache.next(currentCache);
          
          observer.next(workouts);
        },
        (error) => {
          console.error('Hiba az edzések lekérdezése során:', error);
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  getByUserIdWithTypeFilter(userId: string, type: string = 'all'): Observable<Workout[]> {
    return this.authService.isUserLoggedIn().pipe(
      switchMap(user => {
        if (!user || user.uid !== userId) return of([]);
        
        const workoutsRef = collection(this.firestore, this.collectionName);
        const q = query(workoutsRef, 
          where('uid', '==', userId),
          orderBy('date', 'desc')
        );
        
        return new Observable<Workout[]>(observer => {
          const unsubscribe = onSnapshot(q, 
            (snapshot) => {
              const source = snapshot.metadata.fromCache ? "local cache" : "server";
              console.log("Szűrt edzések adatai innen érkeztek: " + source);
              
              const workouts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: this.convertTimestampToDate(doc.data()['date'])
              } as Workout));
              
              const filteredWorkouts = type === 'all' 
                ? workouts 
                : workouts.filter(workout =>
                    workout.exercises.some(exercise => exercise.type === type)
                  );
              
              observer.next(filteredWorkouts);
            },
            (error) => {
              console.error('Hiba az edzések lekérdezése során:', error);
              observer.error(error);
            }
          );

          return () => unsubscribe();
        });
      })
    );
  }

  update(workout: Workout): Observable<void> {
    const workoutRef = doc(this.firestore, this.collectionName, workout.id);
    
    // Frissítjük a cache-t
    const currentCache = this.workoutCache.value;
    const userWorkouts = currentCache.get(workout.uid) || [];
    const index = userWorkouts.findIndex(w => w.id === workout.id);
      if (index !== -1) {
      userWorkouts[index] = workout;
      currentCache.set(workout.uid, userWorkouts);
      this.workoutCache.next(currentCache);
    }
    
    return from(setDoc(workoutRef, workout));
  }

  delete(id: string, userId: string): Observable<void> {
    const workoutRef = doc(this.firestore, this.collectionName, id);
    
    // Töröljük a cache-ből
    const currentCache = this.workoutCache.value;
    const userWorkouts = currentCache.get(userId) || [];
    const updatedWorkouts = userWorkouts.filter(w => w.id !== id);
    currentCache.set(userId, updatedWorkouts);
    this.workoutCache.next(currentCache);
    
    return from(deleteDoc(workoutRef));
  }

  getWorkoutsPaginated(userId: string, pageSize: number, lastDoc?: QueryDocumentSnapshot<DocumentData>) {
    const workoutsRef = collection(this.firestore, this.collectionName);
    let q = query(
      workoutsRef,
      where('uid', '==', userId),
      orderBy('date', 'desc'),
      limit(pageSize)
    );
    if (lastDoc) {
      q = query(
        workoutsRef,
        where('uid', '==', userId),
        orderBy('date', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }
    return getDocs(q);
  }

  private convertTimestampToDate(timestamp: any): Date {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    console.warn('Érvénytelen dátum formátum:', timestamp);
    return new Date();
  }
}
