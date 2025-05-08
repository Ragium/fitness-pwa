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
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  async onSubmit() {
    if(this.loginForm.invalid) return;

    const {email, password} =this.loginForm.value;
    this.isLoading = true;

    this.authService.login(email, password).subscribe({
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
}
