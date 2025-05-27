import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { User } from '../../shared/models/user.model';
import { UserService } from '../../shared/services/user.service';
import { AuthService } from '../../shared/services/auth.service';
import { Observable, switchMap, of, Subscription, filter } from 'rxjs';
import { User as FirebaseUser } from 'firebase/auth';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../shared/services/notification.service';


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
    MatDividerModule,
    MatIconModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
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
  
  user$: Observable<User | null> | undefined;
  user: User | null = null;
  private userSubscription: Subscription | undefined;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private notificationService: NotificationService
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
    this.user$ = this.authService.isUserLoggedIn().pipe(
      filter((user): user is FirebaseUser | null => user !== undefined),
      switchMap(firebaseUser => {
        if (firebaseUser) {
          return this.userService.getById(firebaseUser.uid);
        } else {
          return of(null);
        }
      })
    );

    this.userSubscription = this.user$.subscribe(userData => {
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
      } else {
        this.profileForm.reset();
      }
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
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
      const updatedUser = { ...this.user };
      const formValues = this.profileForm.value;

      // Frissítjük a felhasználói adatokat
      updatedUser.username = formValues.username;
      updatedUser.email = formValues.email;
      
      // Név frissítése
      const nameParts = formValues.fullName.split(' ');
      updatedUser.name = {
        firstname: nameParts[0] || '',
        lastname: nameParts.slice(1).join(' ') || ''
      };

      // Numerikus értékek frissítése
      updatedUser.age = formValues.age ? Number(formValues.age) : 0;
      updatedUser.height = formValues.height ? Number(formValues.height) : 0;
      
      // Súly frissítése és súlytörténet kezelése
      const newWeight = formValues.weight ? Number(formValues.weight) : 0;
      if (newWeight && newWeight !== this.user.weight) {
        const saveObservable = this.userService.addWeightEntry(updatedUser.id, newWeight);
        saveObservable.subscribe({
          next: () => {
            if (navigator.onLine) {
              this.notificationService.profileUpdateSuccess();
            } else {
              this.notificationService.offlineSave();
            }
            this.isLoading = false;
            
            // Frissítjük a felhasználói adatokat
            this.userService.getById(updatedUser.id).subscribe(user => {
              this.user = user;
              if (user) {
                this.profileForm.patchValue({
                  username: user.username,
                  email: user.email,
                  fullName: `${user.name?.firstname} ${user.name?.lastname}`,
                  age: user.age,
                  height: user.height,
                  weight: user.weight
                });
              }
            });
          },
          error: (error) => {
            console.error('Hiba történt a mentés során:', error);
            this.notificationService.profileUpdateError();
            this.isLoading = false;
          }
        });
      } else {
        // Ha nem változott a súly, csak a profil frissítése
        this.userService.update(updatedUser).subscribe({
          next: () => {
            if (navigator.onLine) {
              this.notificationService.profileUpdateSuccess();
            } else {
              this.notificationService.offlineSave();
            }
            this.isLoading = false;
            
            // Frissítjük a felhasználói adatokat
            this.userService.getById(updatedUser.id).subscribe(user => {
              this.user = user;
              if (user) {
                this.profileForm.patchValue({
                  username: user.username,
                  email: user.email,
                  fullName: `${user.name?.firstname} ${user.name?.lastname}`,
                  age: user.age,
                  height: user.height,
                  weight: user.weight
                });
              }
            });
          },
          error: (error) => {
            console.error('Hiba történt a mentés során:', error);
            this.notificationService.profileUpdateError();
            this.isLoading = false;
          }
        });
      }
    }
  }

  onPasswordChange() {
    if (this.passwordForm.valid) {
      this.isPasswordChanging = true;
      const newPassword = this.passwordForm.get('newPassword')?.value;
      this.authService.updateUserPassword(newPassword).subscribe({
        next: () => {
          this.isPasswordChanging = false;
          this.passwordForm.reset();
          if (navigator.onLine) {
            this.notificationService.passwordChangeSuccess();
          } else {
            this.notificationService.offlineSave();
          }
        },
        error: (error) => {
          this.isPasswordChanging = false;
          this.notificationService.passwordChangeError();
        }
      });
      
      // OPTIMISTA offline kezelés
      if (!navigator.onLine) {
        this.isPasswordChanging = false;
        this.passwordForm.reset();
        this.notificationService.offlineSave();
      }
    }
  }
}
