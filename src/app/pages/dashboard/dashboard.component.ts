import { Component, OnInit, AfterViewInit, Signal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { registerables } from 'chart.js';
import { Chart } from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { AuthService } from '../../shared/services/auth.service';
import { WorkoutService } from '../../shared/services/workout.service';
import { UserService } from '../../shared/services/user.service';
import { Workout } from '../../shared/models/workout.model';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../../shared/models/user.model';
import { Timestamp } from '@angular/fire/firestore';
import { Observable, filter } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  loggedInUser$: Observable<FirebaseUser | null> | undefined;
  loggedInUser?: FirebaseUser | null;
  currentDate: string = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  totalWorkouts: number = 0;
  weeklyTotalWeight: number = 0;
  workoutStreak: number = 0;
  recentWorkouts: WritableSignal<Workout[]> = signal([]);
  upcomingWorkouts: Workout[] = [];
  isLoading = false;

  public currentUser: User | null = null;

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
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
          text: 'Edzések száma',
          font: {
            size: 12
          }
        }
      }
    }
  };

  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, 0],
      label: 'Heti edzések száma',
      backgroundColor: '#ffabf3',
      borderColor: '#388E3C',
      borderWidth: 1
    }]
  };

  constructor(
    private auth: AuthService,
    private workoutService: WorkoutService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    this.updateChart();
  }

  loadData() {
    this.isLoading = true;
    this.loggedInUser$ = this.auth.isUserLoggedIn().pipe(
      filter((user): user is FirebaseUser | null => user !== undefined)
    );

    this.loggedInUser$.subscribe(user => {
      this.loggedInUser = user;
      if (user) {
        this.userService.getById(user.uid).subscribe({
          next: (userData: User | null) => {
            this.currentUser = userData;
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Hiba a felhasználói adatok betöltésekor:', error);
            this.isLoading = false;
          }
        });
      } else {
        this.isLoading = false;
        this.recentWorkouts.set([]);
        this.barChartData.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
        this.updateChart();
        this.currentUser = null;
      }
    });

    this.auth.isUserLoggedIn().subscribe(user => {
      if (user) {
        this.workoutService.getByUserId(user.uid).subscribe({
          next: (workouts: Workout[]) => {
            this.processWorkouts(workouts);
          },
          error: (error: any) => {
            console.error('Hiba az edzések betöltésekor:', error);
            this.isLoading = false;
          }
        });
      }
    });
  }

  processWorkouts(workouts: Workout[]) {
    this.totalWorkouts = workouts.length;

    const sortedAndSlicedWorkouts = workouts
      .map(workout => ({
        ...workout,
        date: this.parseDate(workout.date)
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    this.recentWorkouts.set(sortedAndSlicedWorkouts);

    const weeklyStats = this.calculateWeeklyStats(workouts);
    this.barChartData.datasets[0].data = weeklyStats;

    this.workoutStreak = this.calculateWorkoutStreak(workouts);

    this.weeklyTotalWeight = this.calculateWeeklyTotalWeight(workouts);

    this.updateChart();
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

  calculateWeeklyStats(workouts: Workout[]): number[] {
    const weeklyStats = new Array(7).fill(0);
    const mondayOfThisWeek = this.getMondayOfCurrentWeek();

    workouts.forEach(workout => {
      const workoutDate = this.parseDate(workout.date);
      if (workoutDate >= mondayOfThisWeek && workoutDate <= new Date()) {
        const dayIndex = workoutDate.getDay();
        const chartDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; 

        if (chartDayIndex >= 0 && chartDayIndex < 7) {
          weeklyStats[chartDayIndex]++;
        }
      }
    });

    return weeklyStats;
  }

  calculateWorkoutStreak(workouts: Workout[]): number {
    if (workouts.length === 0) return 0;

    const sortedWorkouts = workouts
      .map(workout => ({
        ...workout,
        date: this.parseDate(workout.date)
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    let streak = 1;
    let currentDate = new Date(sortedWorkouts[0].date);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sortedWorkouts.length; i++) {
      const workoutDate = new Date(sortedWorkouts[i].date);
      workoutDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
        currentDate = workoutDate;
      } else {
        break;
      }
    }

    return streak;
  }

  calculateWeeklyTotalWeight(workouts: Workout[]): number {
    const mondayOfThisWeek = this.getMondayOfCurrentWeek();
    const today = new Date();
    return workouts
      .filter(workout => {
        const workoutDate = this.parseDate(workout.date);
        return workoutDate >= mondayOfThisWeek && workoutDate <= today;
      })
      .reduce((total, workout) => {
        return total + (workout.exercises.reduce((sum, ex) => sum + (ex.weight || 0) * ex.sets * ex.reps, 0));
      }, 0);
  }

  updateChart() {
    if (this.barChartData.datasets[0].data) {
      this.barChartData = {
        ...this.barChartData,
        datasets: [{
          ...this.barChartData.datasets[0],
          data: this.barChartData.datasets[0].data
        }]
      };
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

  private getMondayOfCurrentWeek(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
