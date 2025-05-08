import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, User as FirebaseUser } from '@angular/fire/auth';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { IndexedDBService } from './indexeddb.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<FirebaseUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  private auth: Auth = inject(Auth);
  private indexedDBService: IndexedDBService = inject(IndexedDBService);

  constructor() {
    this.auth.onAuthStateChanged(user => {
      this.currentUserSubject.next(user);
    });
  }

  signup(email: string, password: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      tap(userCredential => {
        const user = userCredential.user;
        const userData: User = {
          id: user.uid,
          email: user.email || '',
          name: {
            firstname: user.displayName?.split(' ')[0] || '',
            lastname: user.displayName?.split(' ')[1] || ''
          },
          username: user.displayName || '',
          age: 0,
          height: 0,
          weight: 0
        };
        this.indexedDBService.saveUser(userData);
      })
    );
  }

  logout() {
    return from(signOut(this.auth));
  }

  isUserLoggedIn(): Observable<FirebaseUser | null> {
    return new Observable(subscriber => {
      this.auth.onAuthStateChanged(user => {
        if (user) {
          const userData: User = {
            id: user.uid,
            email: user.email || '',
            name: {
              firstname: user.displayName?.split(' ')[0] || '',
              lastname: user.displayName?.split(' ')[1] || ''
            },
            username: user.displayName || '',
            age: 0,
            height: 0,
            weight: 0
          };
          this.indexedDBService.saveUser(userData);
        }
        subscriber.next(user);
      });
    });
  }

  updateUserProfile(displayName: string) {
    if (!this.auth.currentUser) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }
    return from(updateProfile(this.auth.currentUser, { displayName }));
  }
}
