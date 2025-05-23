import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../shared/services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { UserService } from '../../shared/services/user.service';
import { FirebaseError } from 'firebase/app';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  email = new FormControl('');
  password = new FormControl('');
  rememberMe = new FormControl(false);
  isLoading = false;

  loadingObservation?: Observable<boolean>;
  emailString = this.email.value as string;
  passString = this.password.value as string;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.loginForm = this.fb.group({
      email: this.email,
      password: this.password,
      rememberMe: this.rememberMe
    });
  }

  async onSubmit() {
    if(this.loginForm.invalid) return;

    const {email, password, rememberMe} = this.loginForm.value;
    this.isLoading = true;

    this.authService.login(email, password, rememberMe).subscribe({
      next: () => {
        this.snackBar.open('Sikeres bejelentkezés', 'Bezárás', {duration: 3000});
        this.router.navigate(['/dashboard']);
      },
      error: (error: FirebaseError) => {
        console.error(error);
        this.snackBar.open('Hiba a bejelentkezés során: ' + error.message, 'Bezárás', {duration: 3000});
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async onForgotPassword() {
    if (this.email.invalid) {
      this.email.markAsTouched();
      this.snackBar.open('Kérjük, adja meg az email címet a jelszó visszaállításhoz!', 'Bezárás', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const email = this.email.value as string;

    this.authService.sendPasswordResetEmail(email).subscribe({
      next: () => {
        this.snackBar.open('Jelszó visszaállító email elküldve. Kérjük, ellenőrizze postaládáját.', 'Bezárás', { duration: 5000 });
        this.isLoading = false;
      },
      error: (error: FirebaseError) => {
        console.error(error);
        let errorMessage = 'Hiba történt a jelszó visszaállítás során.';
        if (error.code === 'auth/user-not-found') {
          errorMessage = 'Nincs felhasználó ezzel az email címmel.';
        }
        this.snackBar.open(errorMessage, 'Bezárás', { duration: 5000 });
        this.isLoading = false;
      }
    });
  }
}
