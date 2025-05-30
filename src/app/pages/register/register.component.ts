import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { Location } from '@angular/common';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../../shared/models/user.model';
import { FirebaseError } from '@angular/fire/app';
import { UserCredential } from 'firebase/auth';

@Component({
  selector: 'app-register',
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
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private auth: AuthService,
    private location: Location,
    private us: UserService
  ) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      name: new FormGroup({
        firstname: new FormControl('', [Validators.required]),
        lastname: new FormControl('', [Validators.required])
      }),
      age: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      height: ['', [Validators.required, Validators.min(100), Validators.max(250)]],
      weight: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const email = this.registerForm.get('email')?.value as string;
      const password = this.registerForm.get('password')?.value as string;
      const username = this.registerForm.get('username')?.value as string;

      this.auth.signup(email, password).subscribe({
        next: (cred: UserCredential) => {
          if (!cred.user?.uid) {
            throw new Error('Nem sikerült létrehozni a felhasználót');
          }

          this.auth.updateUserProfile(username).subscribe({
            next: () => {
              const user: User = {
                id: cred.user?.uid as string,
                email: email,
                username: username,
                name: {
                  firstname: this.registerForm.get('name.firstname')?.value as string,
                  lastname: this.registerForm.get('name.lastname')?.value as string
                },
                age: this.registerForm.get('age')?.value as number,
                height: this.registerForm.get('height')?.value as number,
                weight: this.registerForm.get('weight')?.value as number
              };
              
              
              this.us.createUserProfile(user).subscribe({
                next: () => {
              
                  this.snackBar.open('Sikeres regisztráció', 'Bezárás', {
                    duration: 3000
                  });
                  this.router.navigate(['/login']);
                },
                error: (error: FirebaseError) => {
                  console.error('Hiba történt:', error);
                  let errorMessage = 'Hiba történt a regisztráció során';
                  if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'Ez az email cím már használatban van';
                  } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'A jelszó túl gyenge';
                  }
                  this.snackBar.open(errorMessage, 'Bezárás', {
                    duration: 3000
                  });
                  this.isLoading = false;
                }
              });
            },
            error: (error: FirebaseError) => {
              console.error('Hiba történt:', error);
              this.snackBar.open('Hiba történt a profil frissítése során', 'Bezárás', {
                duration: 3000
              });
              this.isLoading = false;
            }
          });
        },
        error: (error: FirebaseError) => {
          console.error('Hiba történt:', error);
          let errorMessage = 'Hiba történt a regisztráció során';
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Ez az email cím már használatban van';
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'A jelszó túl gyenge';
          }
          this.snackBar.open(errorMessage, 'Bezárás', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
