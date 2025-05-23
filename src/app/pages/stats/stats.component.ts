import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkoutService } from '../../shared/services/workout.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { Workout } from '../../shared/models/workout.model';
import { User } from '../../shared/models/user.model';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { Timestamp } from '@angular/fire/firestore';
import { WeightTrackingDirective } from '../../shared/directives/weight-tracking.directive';
import { TotalWeightPipe } from '../../shared/pipes/total-weight.pipe';
import { filter } from 'rxjs';
import { User as FirebaseUser } from 'firebase/auth';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    WeightTrackingDirective,
    TotalWeightPipe
  ],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pieChart') pieChartRef!: ElementRef;
  @ViewChild('lineChart') lineChartRef!: ElementRef;
  @ViewChild('weightChart') weightChartRef!: ElementRef;
  private pieChart: Chart | null = null;
  private lineChart: Chart | null = null;

  recentWorkouts: Workout[] = [];
  displayedColumns: string[] = ['date', 'name', 'type', 'totalWeight'];
  isLoading = false;
  currentUser: User | null = null;
  displayedWorkouts: Workout[] = [];
  workoutsPageSize = 7;
  workoutsPage = 1;
  hasMoreWorkouts = false;

  constructor(
    private workoutService: WorkoutService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Ne hívjuk meg itt a loadData-t
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.loadData();
    });
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  private destroyCharts() {
    if (this.pieChart) {
      this.pieChart.destroy();
      this.pieChart = null;
    }
    if (this.lineChart) {
      this.lineChart.destroy();
      this.lineChart = null;
    }
  }

  loadData() {
    this.isLoading = true;
    this.authService.isUserLoggedIn().pipe(
      filter((user): user is FirebaseUser | null => user !== undefined)
    ).subscribe(user => {
      if (user) {
        console.log('Felhasználó bejelentkezve:', user.uid);
        
        // Felhasználói adatok betöltése
        this.userService.getById(user.uid).subscribe({
          next: (userData) => {
            this.currentUser = userData;
          },
          error: (error) => {
            console.error('Hiba a felhasználói adatok betöltésekor:', error);
          }
        });

        // Edzések betöltése
        this.workoutService.getByUserId(user.uid).subscribe({
          next: (workouts) => {
            console.log('Betöltött edzések:', workouts);
            this.recentWorkouts = workouts
              .map(workout => ({
                ...workout,
                date: this.parseDate(workout.date)
              }))
              .sort((a, b) => b.date.getTime() - a.date.getTime());
            this.workoutsPage = 1;
            this.updateDisplayedWorkouts();
            this.updateCharts(workouts);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Hiba az adatok betöltésekor:', error);
            this.isLoading = false;
          }
        });
      } else {
        console.log('Nincs bejelentkezett felhasználó');
        this.isLoading = false;
      }
    });
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
    return new Date(); // Fallback az aktuális dátumra
  }

  updateCharts(workouts: Workout[]) {
    console.log('updateCharts hívva, edzések száma:', workouts.length);
    this.destroyCharts();

    // Pie chart adatok frissítése - testrészek szerinti eloszlás
    const typeCounts = this.calculateTypeDistribution(workouts);
    console.log('Kiszámolt típus eloszlás:', typeCounts);

    const pieData = {
      labels: Object.keys(typeCounts),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ]
      }]
    };

    console.log('Pie chart adatok:', pieData);

    // Line chart adatok frissítése - napi összesített súly
    const weeklyWeights = this.calculateWeeklyWeights(workouts);
    console.log('Heti súlyok:', weeklyWeights);

    const lineData = {
      labels: ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'],
      datasets: [{
        data: weeklyWeights,
        label: 'Napi összesített súly',
        borderColor: '#1976d2',
        tension: 0.1,
        fill: true,
        backgroundColor: 'rgba(25, 118, 210, 0.1)'
      }]
    };

    console.log('Line chart adatok:', lineData);

    // Várjunk egy kicsit, hogy a DOM frissüljön
    setTimeout(() => {
      if (this.pieChartRef?.nativeElement) {
        console.log('Pie chart canvas megtalálva, létrehozom a grafikont');
        this.pieChart = new Chart(this.pieChartRef.nativeElement, {
          type: 'pie',
          data: pieData,
          options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    }
          }
        });
      } else {
        console.error('Pie chart canvas nem található!');
      }

      if (this.lineChartRef?.nativeElement) {
        console.log('Line chart canvas megtalálva, létrehozom a grafikont');
        this.lineChart = new Chart(this.lineChartRef.nativeElement, {
          type: 'line',
          data: lineData,
          options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Összesített súly (kg)',
          font: {
            size: 12
          }
                }
              }
            }
          }
        });
      } else {
        console.error('Line chart canvas nem található!');
      }
    });
  }

  calculateTypeDistribution(workouts: Workout[]): { [key: string]: number } {
    const typeCounts: { [key: string]: number } = {
      'Mellizom': 0,
      'Hátizom': 0,
      'Lábizom': 0,
      'Vállizom': 0,
      'Karizom': 0,
      'Hasizom': 0,
      'Tricepsz': 0,
      'Bicepsz': 0,
      'Kardió': 0
    };

    // Szűrjük az aktuális heti edzéseket
    const currentWeekWorkouts = this.filterCurrentWeekWorkouts(workouts);

    currentWeekWorkouts.forEach(workout => {
      if (workout.exercises && workout.exercises.length > 0) {
        workout.exercises.forEach(exercise => {
          const type = this.getTypeLabel(exercise.type);
          if (typeCounts.hasOwnProperty(type)) {
            typeCounts[type]++;
          }
        });
      }
    });

    // Töröljük a 0 értékű típusokat
    Object.keys(typeCounts).forEach(key => {
      if (typeCounts[key] === 0) {
        delete typeCounts[key];
      }
    });

    return typeCounts;
  }

  calculateWeeklyWeights(workouts: Workout[]): number[] {
    const weeklyWeights = new Array(7).fill(0);
    const mondayOfThisWeek = this.getMondayOfCurrentWeek();

    workouts.forEach(workout => {
      const workoutDate = this.parseDate(workout.date);
      // Ellenőrizzük, hogy az edzés dátuma az aktuális héten van-e
      if (workoutDate >= mondayOfThisWeek && workoutDate <= new Date()) {
        const dayIndex = workoutDate.getDay(); // 0 = vasárnap, 1 = hétfő, ..., 6 = szombat
        // Átalakítjuk a nap indexét 0-6-ig, ahol 0=hétfő, ..., 6=vasárnap
        const chartDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; 

        if (chartDayIndex >= 0 && chartDayIndex < 7) {
          weeklyWeights[chartDayIndex] += this.calculateTotalWeight(workout);
        }
      }
    });

    return weeklyWeights;
  }

  private filterCurrentWeekWorkouts(workouts: Workout[]): Workout[] {
    const mondayOfThisWeek = this.getMondayOfCurrentWeek();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Mai nap végére állítás

    return workouts.filter(workout => {
      const workoutDate = this.parseDate(workout.date);
      return workoutDate >= mondayOfThisWeek && workoutDate <= today;
    });
  }

  private getMondayOfCurrentWeek(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Amount to subtract to get to Monday (handle Sunday as 6 days back)
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  calculateTotalWeight(workout: Workout): number {
    return workout.exercises.reduce((total, exercise) => {
      return total + ((exercise.weight || 0) * exercise.sets * exercise.reps);
    }, 0);
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'chest': return 'Mellizom';
      case 'back': return 'Hátizom';
      case 'legs': return 'Lábizom';
      case 'shoulders': return 'Vállizom';
      case 'arms': return 'Karizom';
      case 'abs': return 'Hasizom';
      case 'triceps': return 'Tricepsz';
      case 'biceps': return 'Bicepsz';
      case 'cardio': return 'Kardió';
      default: return type;
    }
  }

  updateDisplayedWorkouts() {
    const start = 0;
    const end = this.workoutsPage * this.workoutsPageSize;
    this.displayedWorkouts = this.recentWorkouts.slice(start, end);
    this.hasMoreWorkouts = this.recentWorkouts.length > end;
  }

  loadMoreWorkouts() {
    this.workoutsPage++;
    this.updateDisplayedWorkouts();
  }

  getExerciseTypes(workout: Workout): string {
    return workout.exercises.map(e => e.type).join(', ');
  }
}
