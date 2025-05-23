import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, User, onAuthStateChanged, updatePassword, browserLocalPersistence, browserSessionPersistence, setPersistence, sendPasswordResetEmail } from '@angular/fire/auth';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { User as CustomUser } from '../models/user.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private userService: UserService = inject(UserService);
  private userSubject = new BehaviorSubject<User | null | undefined>(undefined);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
    });
  }

  isUserLoggedIn(): Observable<User | null | undefined> {
    return this.userSubject.asObservable();
  }

  signup(email: string, password: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  updateUserProfile(displayName: string) {
    const user = this.auth.currentUser;
    if (user) {
      return from(updateProfile(user, { displayName }));
    }
    return from(Promise.reject('Nincs bejelentkezett felhasználó'));
  }

  login(email: string, password: string, rememberMe: boolean = false) {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    return from(
      setPersistence(this.auth, persistence).then(() => {
        return signInWithEmailAndPassword(this.auth, email, password);
      })
    );
  }

  logout() {
    return from(signOut(this.auth));
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  updateUserPassword(newPassword: string) {
    const user = this.auth.currentUser;
    if (user) {
      return from(updatePassword(user, newPassword));
    }
    return from(Promise.reject('Nincs bejelentkezett felhasználó'));
  }

  sendPasswordResetEmail(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }
}
