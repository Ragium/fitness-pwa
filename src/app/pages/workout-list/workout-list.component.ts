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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { WorkoutService } from '../../shared/services/workout.service';
import { Workout } from '../../shared/models/workout.model';
import { AuthService } from '../../shared/services/auth.service';
import { WorkoutCardComponent } from '../../shared/components/workout-card/workout-card.component';
import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { filter } from 'rxjs';

const listAnimation = trigger('listAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('0.4s ease-in', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('0.4s ease-out', style({ opacity: 0 }))
  ])
]);

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
    WorkoutCardComponent,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './workout-list.component.html',
  styleUrls: ['./workout-list.component.scss'],
  animations: [listAnimation]
})
export class WorkoutListComponent implements OnInit, OnDestroy {
  workouts: Workout[] = [];
  filteredWorkouts: Workout[] = [];
  selectedType: string = 'all';
  startDate: Date | null = null;
  endDate: Date | null = null;
  isLoading = false;
  currentDate = new Date();
  isOnline = navigator.onLine;
  private onlineCallback: () => void;
  private offlineCallback: () => void;
  loggedInUser$?: FirebaseUser | null;
  pageSize = 10;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  hasMore = true;

  constructor(
    private snackBar: MatSnackBar, 
    private workoutService: WorkoutService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
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
    this.workouts = [];
    this.filteredWorkouts = [];
    this.lastDoc = null;
    this.hasMore = true;
    this.loadPaginated();
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.onlineCallback);
    window.removeEventListener('offline', this.offlineCallback);
  }

  loadPaginated() {
    this.isLoading = true;
    this.authService.isUserLoggedIn().pipe(
      filter((user): user is FirebaseUser | null => user !== undefined)
    ).subscribe(user => {
      this.loggedInUser$ = user;
      if (user) {
        this.workoutService.getWorkoutsPaginated(user.uid, this.pageSize, this.lastDoc || undefined).then(snapshot => {
          const newWorkouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: this.parseDate(doc.data()['date'])
          } as Workout));
          if (this.lastDoc) {
            this.workouts = [...this.workouts, ...newWorkouts];
          } else {
            this.workouts = newWorkouts;
          }
          this.filteredWorkouts = [...this.workouts];
          this.lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : this.lastDoc;
          this.hasMore = snapshot.docs.length === this.pageSize;
          this.isLoading = false;
        }).catch(error => {
          console.error('Hiba az edzések betöltésekor:', error);
          this.snackBar.open('Hiba történt az edzések betöltésekor', 'Bezárás', {
            duration: 3000
          });
          this.isLoading = false;
        });
      } else {
        this.isLoading = false;
        this.workouts = [];
        this.filteredWorkouts = [];
        this.hasMore = false;
      }
    });
  }

  loadMore() {
    this.loadPaginated();
  }

  loadData() {
    this.isLoading = true;
    this.authService.isUserLoggedIn().subscribe(user => {
      this.loggedInUser$ = user;
      if (user) {
        this.workoutService.getByUserId(user.uid).subscribe({
          next: (workouts) => {
            this.processWorkouts(workouts);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Hiba az edzések betöltésekor:', error);
            this.snackBar.open('Hiba történt az edzések betöltésekor', 'Bezárás', {
              duration: 3000
            });
            this.isLoading = false;
          }
        });
      } else {
        this.isLoading = false;
        this.workouts = [];
        this.filteredWorkouts = [];
      }
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
    let filtered = [...this.workouts];

    // Típus szerinti szűrés
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(workout =>
        workout.exercises.some(exercise => exercise.type === this.selectedType)
      );
    }

    // Dátum szerinti szűrés
    if (this.startDate) {
      filtered = filtered.filter(workout => 
        workout.date >= this.startDate!
      );
    }

    if (this.endDate) {
      filtered = filtered.filter(workout => 
        workout.date <= this.endDate!
      );
    }

    this.filteredWorkouts = filtered;
  }

  onTypeChange() {
    this.filterWorkouts();
  }

  onDateChange() {
    this.filterWorkouts();
  }

  clearDateFilters() {
    this.startDate = null;
    this.endDate = null;
    this.filterWorkouts();
  }

  onDeleteWorkout(id: string) {
    if (!this.isOnline) {
      this.snackBar.open('Offline állapotban nem lehet törölni az edzést', 'Bezárás', {
        duration: 3000
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Edzés törlése',
        message: 'Biztosan törölni szeretnéd ezt az edzést?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.loggedInUser$) {
        this.workoutService.delete(id, this.loggedInUser$?.uid).subscribe({
          next: () => {
            this.snackBar.open('Edzés sikeresen törölve', 'Bezárás', {
              duration: 3000
            });
            this.loadData();
          },
          error: (error) => {
            console.error('Hiba a törlés során:', error);
            this.snackBar.open('Hiba történt a törlés során', 'Bezárás', {
              duration: 3000
            });
          }
        });
      }
    });
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
