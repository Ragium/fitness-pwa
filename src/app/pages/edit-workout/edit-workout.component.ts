import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkoutService } from '../../shared/services/workout.service';
import { Workout } from '../../shared/models/workout.model';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-edit-workout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './edit-workout.component.html',
  styleUrls: ['./edit-workout.component.scss']
})
export class EditWorkoutComponent implements OnInit {
  workoutForm: FormGroup;
  isLoading = false;
  isOnline = navigator.onLine;
  workoutId: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private workoutService: WorkoutService,
    private authService: AuthService
  ) {
    this.workoutForm = this.fb.group({
      name: ['', Validators.required],
      totalWeight: [0],
      date: [new Date(), Validators.required],
      notes: [''],
      exercises: this.fb.array([])
    });

    this.exercises.valueChanges.subscribe(() => {
      this.updateTotalWeight();
    });

    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOnlineStatus.bind(this));
  }

  private handleOnlineStatus() {
    this.isOnline = navigator.onLine;
  }

  ngOnInit(): void {
    this.workoutId = this.route.snapshot.params['id'];
    this.loadWorkout();
  }

  private loadWorkout() {
    this.isLoading = true;
    this.workoutService.getById(this.workoutId).subscribe({
      next: (workout) => {
        if (workout) {
          const date = workout.date instanceof Date ? workout.date : new Date(workout.date);
          this.workoutForm.patchValue({
            name: workout.name,
            date: date,
            notes: workout.notes,
            totalWeight: workout.totalWeight
          });

          // Töröljük a meglévő gyakorlatokat
          while (this.exercises.length) {
            this.exercises.removeAt(0);
          }

          // Hozzáadjuk a betöltött gyakorlatokat
          workout.exercises.forEach(exercise => {
            this.addExercise(exercise);
          });
        } else {
          this.snackBar.open('Az edzés nem található!', 'Bezár', { duration: 3000 });
          this.router.navigate(['/workout-list']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Hiba az edzés betöltésekor:', error);
        this.snackBar.open('Hiba az edzés betöltésekor!', 'Bezár', { duration: 3000 });
        this.isLoading = false;
        this.router.navigate(['/workout-list']);
      }
    });
  }

  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  addExercise(exercise?: any): void {
    const exerciseForm = this.fb.group({
      name: [exercise?.name || '', Validators.required],
      type: [exercise?.type || '', Validators.required],
      sets: [exercise?.sets || 0, [Validators.required, Validators.min(1)]],
      reps: [exercise?.reps || 0, [Validators.required, Validators.min(1)]],
      weight: [exercise?.weight || 0, [Validators.required, Validators.min(0)]]
    });

    this.exercises.push(exerciseForm);
  }

  removeExercise(index: number): void {
    if (this.exercises.length > 1) {
      this.exercises.removeAt(index);
      this.updateTotalWeight();
    }
  }

  private updateTotalWeight(): void {
    const totalWeight = this.exercises.controls.reduce((sum, control) => {
      const weight = control.get('weight')?.value || 0;
      const sets = control.get('sets')?.value || 0;
      const reps = control.get('reps')?.value || 0;
      return sum + (weight * sets * reps);
    }, 0);
    this.workoutForm.patchValue({ totalWeight });
  }

  async onSubmit(): Promise<void> {
    if (this.workoutForm.valid) {
      this.isLoading = true;
      this.authService.isUserLoggedIn().subscribe(user => {
        if (user) {
          const workout: Workout = {
            ...this.workoutForm.value,
            uid: user.uid,
            date: this.workoutForm.get('date')?.value,
            id: this.workoutId
          };
          
          this.workoutService.update(workout).subscribe({
            next: () => {
              
              this.snackBar.open(
                this.isOnline ? 'Edzés sikeresen frissítve!' : 'Edzés offline frissítve! Szinkronizálás online állapotban.',
                'Bezár',
                { duration: 3000 }
              );
              this.router.navigate(['/workout-list']);
            },
            error: (error) => {
              console.error('Frissítési hiba:', error);
              this.snackBar.open('Hiba történt a frissítés során!', 'Bezár', { duration: 3000 });
              this.isLoading = false;
            }
          });
        } else {
          this.snackBar.open('Nincs bejelentkezett felhasználó!', 'Bezár', { duration: 3000 });
          this.isLoading = false;
        }
      });
    } else {
      Object.keys(this.workoutForm.controls).forEach(key => {
        const control = this.workoutForm.get(key);
        if (control && control.invalid) {
          control.markAsTouched();
        }
      });
      
      if (this.exercises.length > 0) {
        this.exercises.controls.forEach(control => {
          if (control.invalid) {
            control.markAsTouched();
          }
        });
      }
      
      this.snackBar.open('Kérjük, töltse ki az összes kötelező mezőt', 'Bezárás', {
        duration: 3000
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/workout-list']);
  }

  editWorkout(workout: Workout): void {
    this.router.navigate(['/edit-workout', workout.id]);
  }
}
