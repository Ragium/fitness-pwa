import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-new-workout',
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
  templateUrl: './new-workout.component.html',
  styleUrls: ['./new-workout.component.scss']
})
export class NewWorkoutComponent implements OnInit {
  workoutForm: FormGroup;
  isLoading = false;
  isOnline = navigator.onLine;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private notificationService: NotificationService,
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
    this.addExercise();
  }

  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  addExercise(): void {
    const exerciseForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      sets: [0, [Validators.required, Validators.min(1)]],
      reps: [0, [Validators.required, Validators.min(1)]],
      weight: [0, [Validators.required, Validators.min(0)]]
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
            id: crypto.randomUUID()
          };
          
          this.workoutService.create(workout).subscribe({
            next: () => {
              console.log('Edzés sikeresen mentve');
              if (this.isOnline) {
                this.notificationService.workoutSaveSuccess();
              } else {
                this.notificationService.offlineSave();
              }
              this.router.navigate(['/workout-list']);
            },
            error: (error) => {
              console.error('Mentési hiba:', error);
              this.notificationService.workoutSaveError();
              this.isLoading = false;
            }
          });
        } else {
          this.notificationService.error('Nincs bejelentkezett felhasználó!');
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
      
      this.notificationService.formError();
    }
  }

  cancel(): void {
    this.router.navigate(['/workout-list']);
  }
}

