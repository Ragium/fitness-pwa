import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { User } from '../../shared/models/user.model';
import { UserService } from '../../shared/services/user.service';
import { AuthService } from '../../shared/services/auth.service';


interface WorkoutStats {
  totalWorkouts: number;
  totalTime: number;
  averageTime: number;
  workoutDays: number;
}

@Component({
  selector: 'app-profile',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatDividerModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isLoading = false;
  isPasswordChanging = false;
  stats: WorkoutStats = {
    totalWorkouts: 0,
    totalTime: 0,
    averageTime: 0,
    workoutDays: 0
  };
  
  user: User | null = null;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private userService: UserService,
    private authService: AuthService
  ) {
    this.profileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      fullName: [''],
      age: ['', [Validators.min(0), Validators.max(100)]],
      height: ['', [Validators.min(100), Validators.max(250)]],
      weight: ['', [Validators.min(30), Validators.max(300)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null
      : { passwordMismatch: true };
  }

  ngOnInit() {
    this.authService.isUserLoggedIn().subscribe(user => {
      if (user) {
        this.userService.getById(user.uid).subscribe(userData => {
          this.user = userData;
          if (userData) {
            this.profileForm.patchValue({
              username: userData.username,
              email: userData.email,
              fullName: `${userData.name?.firstname} ${userData.name?.lastname}`,
              age: userData.age,
              height: userData.height,
              weight: userData.weight
            });
          }
        });
      }
    });
  }

  loadMockData() {

    this.stats = {
      totalWorkouts: 25,
      totalTime: 45,
      averageTime: 30,
      workoutDays: 15
    };
  }

  onSubmit() {
    if (this.profileForm.valid && this.user) {
      this.isLoading = true;
      const formData = this.profileForm.value;
      const [firstname, lastname] = formData.fullName.split(' ');
      
      const updatedUser: User = {
        ...this.user,
        username: formData.username,
        email: formData.email,
        name: {
          firstname: firstname || '',
          lastname: lastname || ''
        },
        age: formData.age,
        height: formData.height,
        weight: formData.weight
      };

      this.userService.update(updatedUser).subscribe({
        next: () => {
          this.snackBar.open('Profil sikeresen frissítve', 'Bezárás', {
            duration: 3000
          });
          this.isLoading = false;
          
          // Frissítjük a felhasználói adatokat
          this.authService.isUserLoggedIn().subscribe(user => {
            if (user) {
              this.userService.getById(user.uid).subscribe(userData => {
                this.user = userData;
                if (userData) {
                  this.profileForm.patchValue({
                    username: userData.username,
                    email: userData.email,
                    fullName: `${userData.name?.firstname} ${userData.name?.lastname}`,
                    age: userData.age,
                    height: userData.height,
                    weight: userData.weight
                  });
                }
              });
            }
          });
        },
        error: (error) => {
          console.error('Hiba történt:', error);
          this.snackBar.open('Hiba történt a profil frissítése során', 'Bezárás', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
    }
  }

  onPasswordChange() {
    if (this.passwordForm.valid) {
      this.isPasswordChanging = true;
      // TODO: Implement password change logic
      console.log(this.passwordForm.value);
      
      setTimeout(() => {
        this.isPasswordChanging = false;
        this.passwordForm.reset();
        this.snackBar.open('Jelszó sikeresen módosítva', 'Bezárás', {
          duration: 3000
        });
      }, 1000);
    }
  }
}
