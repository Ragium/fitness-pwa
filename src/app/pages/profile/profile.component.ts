import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Observable, switchMap, of, Subscription, filter } from 'rxjs';
import { User as FirebaseUser } from 'firebase/auth';


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

      const updatedUser: User = { ...this.user as User };

      const formData = this.profileForm.value;

      let weightChanged = false;
      if (formData.weight !== undefined && formData.weight !== null && formData.weight !== this.user?.weight) {
        weightChanged = true;
      }

      if (formData.username !== undefined && formData.username !== null) {
        updatedUser.username = formData.username;
      }
      if (formData.email !== undefined && formData.email !== null) {
        updatedUser.email = formData.email;
      }
      
      if (formData.fullName !== undefined && formData.fullName !== null) {
        const [firstName, lastName] = formData.fullName.split(' ');
        updatedUser.name = {
          firstname: firstName || '',
          lastname: lastName || ''
        };
      } else if (updatedUser.name === undefined || updatedUser.name === null) {
        updatedUser.name = { firstname: '', lastname: ''};
      }

      if (formData.age !== undefined && formData.age !== null) {
        updatedUser.age = formData.age;
      }
      if (formData.height !== undefined && formData.height !== null) {
        updatedUser.height = formData.height;
      }
      
      console.log('Offline profil mentése, hívás a UserService.update-re...');

      let saveObservable: Observable<any>;

      if (weightChanged) {
        saveObservable = this.userService.addWeightEntry(updatedUser.id, formData.weight);
      } else {
        saveObservable = this.userService.update(updatedUser);
      }

      saveObservable.subscribe({
        next: () => {
          console.log('Felhasználói profil sikeresen frissítve');
          const message = navigator.onLine 
            ? 'Profil sikeresen frissítve' 
            : 'Profil offline mentve, szinkronizálás online állapotban';
          this.snackBar.open(message, 'Bezárás', {
            duration: 3000
          });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Hiba történt a mentés során:', error);
          this.snackBar.open('Hiba történt a profil mentése során', 'Bezárás', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });

      // OPTIMISTA offline kezelés: ha offline vagyunk, azonnal visszajelzünk és leállítjuk a spinnert
      if (!navigator.onLine) {
        this.isLoading = false;
        this.snackBar.open('Profil offline mentve! Szinkronizálás online állapotban.', 'Bezárás', {
          duration: 3000
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
          const message = navigator.onLine
            ? 'Jelszó sikeresen módosítva'
            : 'Jelszó offline módosítva! Szinkronizálás online állapotban.';
          this.snackBar.open(message, 'Bezárás', {
            duration: 3000
          });
        },
        error: (error) => {
          this.isPasswordChanging = false;
          this.snackBar.open('Hiba történt a jelszó módosítása során!', 'Bezárás', {
            duration: 3000
          });
        }
      });
      // OPTIMISTA offline kezelés: ha offline vagyunk, azonnal visszajelzünk
      if (!navigator.onLine) {
        this.isPasswordChanging = false;
        this.passwordForm.reset();
        this.snackBar.open('Jelszó offline módosítva! Szinkronizálás online állapotban.', 'Bezárás', {
          duration: 3000
        });
      }
    }
  }
}
