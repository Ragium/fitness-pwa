import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { FirebaseError } from '@angular/fire/app';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const email = this.forgotPasswordForm.get('email')?.value;

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
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Érvénytelen email cím formátum.';
        }
        this.snackBar.open(errorMessage, 'Bezárás', { duration: 5000 });
        this.isLoading = false;
      },
    });
  }
} 