import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, collectionData, deleteDoc, query, where, orderBy, DocumentData, Timestamp, updateDoc } from '@angular/fire/firestore';
import { Workout } from '../models/workout.model';
import { Observable, from, map, switchMap, of } from 'rxjs';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexeddb.service';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private collectionName = "workouts";
  private isOnline = navigator.onLine;

  constructor(private indexedDBService: IndexedDBService) {
    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOnlineStatus.bind(this));
  }

  private handleOnlineStatus() {
    this.isOnline = navigator.onLine;
    if (this.isOnline) {
      this.loadWorkoutsFromFirestore();
      this.syncWorkouts();
    }
  }

  private loadWorkoutsFromFirestore() {
    this.authService.isUserLoggedIn().subscribe(user => {
      if (user) {
        const workoutsRef = collection(this.firestore, this.collectionName);
        const q = query(workoutsRef, where('uid', '==', user.uid));
        
        collectionData(q, { idField: 'id' }).subscribe(workouts => {
          workouts.forEach(workout => {
            const workoutData = {
              ...workout,
              date: this.convertTimestampToDate(workout['date'])
            } as Workout;
            this.indexedDBService.saveWorkout(workoutData, true);
          });
          console.log('Edzések sikeresen betöltve az adatbázisból');
        });
      }
    });
  }

  private async syncWorkouts() {
    try {
      // Szinkronizáljuk az edzéseket
      const workouts = await this.indexedDBService.getWorkouts();
      for (const workout of workouts) {
        const workoutRef = doc(this.firestore, this.collectionName, workout.id);
        await setDoc(workoutRef, workout);
      }

      // Szinkronizáljuk a törléseket
      const deletedWorkouts = await this.indexedDBService.getDeletedWorkouts();
      console.log('Törlendő edzések:', deletedWorkouts);
      
      for (const workoutId of deletedWorkouts) {
        try {
          const workoutRef = doc(this.firestore, this.collectionName, workoutId);
          await deleteDoc(workoutRef);
          console.log('Edzés sikeresen törölve a Firestore-ból:', workoutId);
        } catch (error) {
          console.error('Hiba az edzés törlése során:', workoutId, error);
        }
      }
      
      console.log('Edzések és törlések sikeresen szinkronizálva');
    } catch (error) {
      console.error('Hiba a szinkronizáció során:', error);
    }
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

  create(workout: Workout): Observable<void> {
    const workoutRef = doc(this.firestore, this.collectionName, workout.id);
    this.indexedDBService.saveWorkout(workout, this.isOnline);
    return from(setDoc(workoutRef, workout));
  }

  getAll(): Observable<Workout[]> {
    const workoutsRef = collection(this.firestore, this.collectionName);
    return collectionData(workoutsRef, { idField: 'id' }) as Observable<Workout[]>;
  }

  getById(id: string): Observable<Workout | null> {
    if (this.isOnline) {
      const workoutRef = doc(this.firestore, this.collectionName, id);
      return from(getDoc(workoutRef)).pipe(
        map(doc => {
          if (!doc.exists()) return null;
          const data = doc.data();
          const workout = { 
            id: doc.id, 
            ...data,
            date: this.convertTimestampToDate(data['date'])
          } as Workout;
          this.indexedDBService.saveWorkout(workout, this.isOnline);
          return workout;
        })
      );
    } else {
      return from(this.indexedDBService.getWorkouts()).pipe(
        map(workouts => {
          const workout = workouts.find(w => w.id === id);
          if (workout) {
            return {
              ...workout,
              date: this.convertTimestampToDate(workout.date)
            };
          }
          return null;
        })
      );
    }
  }

  getByUserId(userId: string): Observable<Workout[]> {
    if (this.isOnline) {
      const workoutsRef = collection(this.firestore, this.collectionName);
      const q = query(workoutsRef, where('uid', '==', userId));
      return collectionData(q, { idField: 'id' }).pipe(
        map(workouts => workouts.map(workout => ({
          ...workout,
          date: this.convertTimestampToDate(workout['date'])
        } as Workout)))
      );
    } else {
      return from(this.indexedDBService.getWorkouts()).pipe(
        map(workouts => workouts.filter(workout => workout.uid === userId))
      );
    }
  }

  getByUserIdWithTypeFilter(userId: string, type: string = 'all'): Observable<Workout[]> {
    return this.authService.isUserLoggedIn().pipe(
      switchMap(user => {
        if (!user || user.uid !== userId) return of([]);
        
        if (this.isOnline) {
          const workoutsRef = collection(this.firestore, this.collectionName);
          const q = query(workoutsRef, 
            where('uid', '==', userId),
            orderBy('date', 'desc')
          );
          return collectionData(q, { idField: 'id' }).pipe(
            map(docs => docs.map(doc => {
              const data = doc as unknown as Workout;
              const workout = {
                ...data,
                id: data.id,
                date: this.convertTimestampToDate(data['date'])
              } as Workout;
              // Minden edzést mentünk az IndexedDB-be
              this.indexedDBService.saveWorkout(workout, true).then(() => {
                console.log('Edzés sikeresen mentve az IndexedDB-be:', workout.id);
              }).catch(error => {
                console.error('Hiba az edzés mentése során:', workout.id, error);
              });
              return workout;
            })),
            map(workouts => {
              if (type === 'all') return workouts;
              return workouts.filter(workout =>
                workout.exercises.some(exercise => exercise.type === type)
              );
            })
          );
        } else {
          return from(this.indexedDBService.getWorkouts()).pipe(
            map(workouts => {
              const filteredWorkouts = workouts.filter(workout => workout.uid === userId);
              if (type === 'all') return filteredWorkouts;
              return filteredWorkouts.filter(workout =>
                workout.exercises.some(exercise => exercise.type === type)
              );
            })
          );
        }
      })
    );
  }

  update(workout: Workout): Observable<void> {
    return new Observable<void>(observer => {
      if (navigator.onLine) {
        // Online módban: frissítjük a Firestore-t és az IndexedDB-t
        const workoutRef = doc(this.firestore, 'workouts', workout.id);
        updateDoc(workoutRef, {
          name: workout.name,
          date: workout.date,
          notes: workout.notes,
          exercises: workout.exercises,
          totalWeight: workout.totalWeight
        }).then(() => {
          // Sikeres Firestore frissítés után frissítjük az IndexedDB-t
          this.indexedDBService.saveWorkout(workout, true).then(() => {
            console.log('Edzés sikeresen frissítve mindkét adatbázisban');
            observer.next();
            observer.complete();
          }).catch(error => {
            console.error('Hiba az IndexedDB frissítésekor:', error);
            observer.error(error);
          });
        }).catch(error => {
          console.error('Hiba a Firestore frissítésekor:', error);
          observer.error(error);
        });
      } else {
        // Offline módban: csak az IndexedDB-t frissítjük
        this.indexedDBService.saveWorkout(workout, false).then(() => {
          console.log('Edzés sikeresen frissítve az IndexedDB-ben (offline mód)');
          observer.next();
          observer.complete();
        }).catch(error => {
          console.error('Hiba az IndexedDB frissítésekor (offline mód):', error);
          observer.error(error);
        });
      }
    });
  }

  delete(id: string): Observable<void> {
    // Először töröljük az IndexedDB-ből
    this.indexedDBService.deleteWorkout(id);

    if (this.isOnline) {
      // Ha online vagyunk, töröljük a Firestore-ból is
      const workoutRef = doc(this.firestore, this.collectionName, id);
      return from(deleteDoc(workoutRef));
    } else {
      // Ha offline vagyunk, mentjük a törlendő edzés azonosítóját
      console.log('Offline törlés, edzés azonosító:', id);
      this.indexedDBService.addToDeletedWorkouts(id).then(() => {
        console.log('Edzés sikeresen hozzáadva a törlendők listájához:', id);
      }).catch(error => {
        console.error('Hiba a törlendő edzés mentésekor:', error);
      });
      return of(void 0);
    }
  }
}
