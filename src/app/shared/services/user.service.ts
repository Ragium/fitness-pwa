import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, collectionData, deleteDoc } from '@angular/fire/firestore';
import { User } from '../../shared/models/user.model';
import { Observable, from, map, switchMap, of } from 'rxjs';
import { IndexedDBService } from './indexeddb.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore: Firestore = inject(Firestore);
  private indexedDBService: IndexedDBService = inject(IndexedDBService);
  collectionName = "users";

  createUserProfile(user: User) {
    const userRef = doc(this.firestore, this.collectionName, user.id);
    this.indexedDBService.saveUser(user);
    return from(setDoc(userRef, user));
  }

  getAll(): Observable<User[]> {
    const usersRef = collection(this.firestore, this.collectionName);
    return collectionData(usersRef, { idField: 'id' }) as Observable<User[]>;
  }

  getById(id: string): Observable<User | null> {
    const userRef = doc(this.firestore, this.collectionName, id);
    return from(getDoc(userRef)).pipe(
      switchMap(doc => {
        if (!doc.exists()) {
          return from(this.indexedDBService.getUser(id));
        }
        const data = doc.data();
        const user = { id: doc.id, ...data } as User;
        this.indexedDBService.saveUser(user);
        return of(user);
      })
    );
  }

  update(user: User) {
    const userRef = doc(this.firestore, this.collectionName, user.id);
    this.indexedDBService.saveUser(user);
    return from(setDoc(userRef, user));
  }

  delete(id: string) {
    const userRef = doc(this.firestore, this.collectionName, id);
    this.indexedDBService.deleteUser(id);
    return from(deleteDoc(userRef));
  }
}
