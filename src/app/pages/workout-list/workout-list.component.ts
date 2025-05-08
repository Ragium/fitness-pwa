import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkoutService } from '../../shared/services/workout.service';
import { Workout } from '../../shared/models/workout.model';
import { AuthService } from '../../shared/services/auth.service';
import { WorkoutCardComponent } from '../../shared/components/workout-card/workout-card.component';
import { IndexedDBService } from '../../shared/services/indexeddb.service';
import { User } from 'firebase/auth';
import { Timestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatListModule,
    MatProgressSpinnerModule,
    WorkoutCardComponent
  ],
  templateUrl: './workout-list.component.html',
  styleUrls: ['./workout-list.component.scss']
})
export class WorkoutListComponent implements OnInit, OnDestroy {
  workouts: Workout[] = [];
  filteredWorkouts: Workout[] = [];
  selectedType: string = 'all';
  isLoading = false;
  currentDate = new Date();
  isOnline = navigator.onLine;
  useOnlineFilter = false;
  private onlineCallback: () => void;
  private offlineCallback: () => void;

  constructor(
    private snackBar: MatSnackBar, 
    private workoutService: WorkoutService,
    private authService: AuthService,
    private indexedDBService: IndexedDBService,
    private router: Router
  ) {
    this.onlineCallback = () => {
      this.isOnline = true;
      this.loadData();
      this.snackBar.open('Online állapot: Az adatok szinkronizálása folyamatban...', 'Bezárás', {
        duration: 3000
      });
    };

    this.offlineCallback = () => {
      this.isOnline = false;
      this.snackBar.open('Offline állapot: Az adatok lokálisan lesznek tárolva', 'Bezárás', {
        duration: 3000
      });
    };

    window.addEventListener('online', this.onlineCallback);
    window.addEventListener('offline', this.offlineCallback);
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.onlineCallback);
    window.removeEventListener('offline', this.offlineCallback);
  }

  loadData() {
    this.isLoading = true;
    this.authService.isUserLoggedIn().subscribe(user => {
      if (user) {
        if (this.isOnline) {
          this.workoutService.getByUserId(user.uid).subscribe({
            next: (workouts) => {
              this.processWorkouts(workouts);
              this.isLoading = false;
            },
            error: (error) => {
              console.error('Hiba az edzések betöltésekor:', error);
              this.loadFromIndexedDB(user.uid);
            }
          });
        } else {
          this.loadFromIndexedDB(user.uid);
        }
      } else {
        this.isLoading = false;
      }
    });
  }

  private loadFromIndexedDB(userId: string) {
    this.indexedDBService.getWorkouts()
      .then(workouts => {
        this.processWorkouts(workouts.filter(w => w.uid === userId));
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Hiba az IndexedDB-ből való betöltéskor:', error);
        this.snackBar.open('Hiba történt az edzések betöltésekor', 'Bezárás', {
          duration: 3000
        });
        this.isLoading = false;
      });
  }

  private processWorkouts(workouts: Workout[]) {
    this.workouts = workouts
      .map(workout => ({
        ...workout,
        date: this.parseDate(workout.date)
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    this.filterWorkouts();
  }

  private parseDate(date: any): Date {
    if (date instanceof Date) {
      return date;
    }
    if (date instanceof Timestamp) {
      return date.toDate();
    }
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    if (date && typeof date.seconds === 'number') {
      return new Date(date.seconds * 1000);
    }
    if (date && date.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    }
    console.warn('Érvénytelen dátum formátum:', date);
    return new Date();
  }

  filterWorkouts() {
    if (this.selectedType === 'all') {
      this.filteredWorkouts = [...this.workouts];
    } else {
      this.filteredWorkouts = this.workouts.filter(workout => {
        return workout.exercises.some(exercise => {
          if (exercise.type) {
            console.log('Checking exercise:', {
              name: exercise.name,
              type: exercise.type,
              selected: this.selectedType,
              matches: exercise.type === this.selectedType
            });
            return exercise.type === this.selectedType;
          }
          return false;
        });
      });
    }
    console.log('Filtered workouts:', this.filteredWorkouts.map(w => ({
      name: w.name,
      exercises: w.exercises.map(e => ({ name: e.name, type: e.type }))
    })));
  }

  onTypeChange() {
    this.filterWorkouts();
  }

  onDeleteWorkout(id: string) {
    if (this.isOnline) {
      this.workoutService.delete(id).subscribe({
        next: () => {
          this.indexedDBService.deleteWorkout(id);
          this.snackBar.open('Edzés sikeresen törölve!', 'Bezárás', { duration: 3000 });
          this.loadData();
        },
        error: (error) => {
          console.error('Hiba az edzés törlésekor:', error);
          this.snackBar.open('Hiba az edzés törlésekor', 'Bezárás', { duration: 3000 });
        }
      });
    } else {
      this.indexedDBService.deleteWorkout(id);
      this.snackBar.open('Edzés sikeresen törölve!', 'Bezárás', { duration: 3000 });
      this.loadData();
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'cardio': return 'Kardió';
      case 'biceps': return 'Bicepsz';
      case 'triceps': return 'Tricepsz';
      case 'chest': return 'Mellizom';
      case 'legs': return 'Lábak';
      case 'abs': return 'Hasizom';
      case 'shoulders': return 'Vállak';
      default: return type;
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'cardio': return 'directions_run';
      case 'strength': return 'fitness_center';
      case 'flexibility': return 'self_improvement';
      case 'balance': return 'balance';
      default: return 'fitness_center';
    }
  }

  formatDate(date: Date | string): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Érvénytelen dátum:', date);
      return 'Érvénytelen dátum';
    }
    return dateObj.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  calculateTotalWeight(workout: Workout): number {
    return workout.exercises.reduce((total, exercise) => {
      return total + ((exercise.weight || 0) * exercise.sets * exercise.reps);
    }, 0);
  }

  loadWorkouts() {
    this.loadData();
  }

  editWorkout(id: string): void {
    this.router.navigate(['/edit-workout', id]);
  }
}
