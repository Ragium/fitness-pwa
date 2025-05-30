import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, collectionData, deleteDoc, onSnapshot, getDocs, query, where } from '@angular/fire/firestore';
import { User, WeightEntry } from '../../shared/models/user.model';
import { Observable, from, map, switchMap, of, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore: Firestore = inject(Firestore);
  private collectionName = "users";
  private userCache = new BehaviorSubject<Map<string, User>>(new Map());

  constructor() {}

  getById(id: string): Observable<User | null> {
    const userRef = doc(this.firestore, this.collectionName, id);
    return from(getDoc(userRef)).pipe(
      map(doc => {
        if (doc.exists()) {
          const user = { id: doc.id, ...doc.data() } as User;
          // Frissítjük a cache-t
          const currentCache = this.userCache.value;
          currentCache.set(id, user);
          this.userCache.next(currentCache);
          return user;
        }
        return null;
      })
    );
  }

  getAll(): Observable<User[]> {
    const usersRef = collection(this.firestore, this.collectionName);
    return new Observable<User[]>(observer => {
      const unsubscribe = onSnapshot(usersRef, 
        { includeMetadataChanges: true },
        (snapshot) => {
          const source = snapshot.metadata.fromCache ? "local cache" : "server";
          
          const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as User));
          
          observer.next(users);
        },
        (error) => {
          console.error('Hiba a felhasználók lekérdezése során:', error);
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  createUserProfile(user: User) {
    const userRef = doc(this.firestore, this.collectionName, user.id);
    return from(setDoc(userRef, user));
  }

  update(user: User) {
    const userRef = doc(this.firestore, this.collectionName, user.id);
    // Frissítjük a cache-t
    const currentCache = this.userCache.value;
    currentCache.set(user.id, user);
    this.userCache.next(currentCache);
    return from(setDoc(userRef, user));
  }

  delete(id: string) {
    const userRef = doc(this.firestore, this.collectionName, id);
    // Töröljük a cache-ből
    const currentCache = this.userCache.value;
    currentCache.delete(id);
    this.userCache.next(currentCache);
    return from(deleteDoc(userRef));
  }

  addWeightEntry(userId: string, weight: number) {
    return this.getById(userId).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('Felhasználó nem található');
        }

        const weightEntry: WeightEntry = {
          date: new Date(),
          weight: weight
        };

        if (!user.weightHistory) {
          user.weightHistory = [];
        }

        user.weightHistory.push(weightEntry);
        user.weight = weight;

        return this.update(user);
      })
    );
  }
}
