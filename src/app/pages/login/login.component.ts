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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../shared/services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { UserService } from '../../shared/services/user.service';
import { FirebaseError } from 'firebase/app';
import { NotificationService } from '../../shared/services/notification.service';

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
    private notificationService: NotificationService,
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
        this.notificationService.loginSuccess();
        this.router.navigate(['/dashboard']);
      },
      error: (error: FirebaseError) => {
        console.error(error);
        this.notificationService.loginError(error);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async onForgotPassword() {
    if (this.email.invalid) {
      this.email.markAsTouched();
      this.notificationService.formError();
      return;
    }

    this.isLoading = true;
    const email = this.email.value as string;

    this.authService.sendPasswordResetEmail(email).subscribe({
      next: () => {
        this.notificationService.passwordResetSent();
        this.isLoading = false;
      },
      error: (error: FirebaseError) => {
        console.error(error);
        this.notificationService.passwordResetError(error);
        this.isLoading = false;
      }
    });
  }
}
