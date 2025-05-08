import { Component, OnInit, AfterViewInit } from '@angular/core';
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
import { DatepipePipe } from '../../shared/pipes/datepipe.pipe';
import { AuthService } from '../../shared/services/auth.service';
import { WorkoutService } from '../../shared/services/workout.service';
import { Workout } from '../../shared/models/workout.model';
import { User } from 'firebase/auth';
import { Timestamp } from '@angular/fire/firestore';

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
  loggedInUser?: User | null;
  currentDate: string = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  totalWorkouts: number = 0;
  totalWorkoutTime: number = 0;
  workoutStreak: number = 0;
  recentWorkouts: Workout[] = [];
  upcomingWorkouts: Workout[] = [];
  isLoading = false;

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
    private workoutService: WorkoutService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    this.updateChart();
  }

  loadData() {
    this.isLoading = true;
    this.auth.isUserLoggedIn().subscribe(user => {
      if (user) {
        this.loggedInUser = user;
        this.workoutService.getByUserId(user.uid).subscribe({
          next: (workouts) => {
            this.processWorkouts(workouts);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Hiba az adatok betöltésekor:', error);
            this.isLoading = false;
          }
        });
      }
    });
  }

  processWorkouts(workouts: Workout[]) {
    // Összes edzés számának kiszámítása
    this.totalWorkouts = workouts.length;

    // Legutóbbi edzések (utolsó 5)
    this.recentWorkouts = workouts
      .map(workout => ({
        ...workout,
        date: this.parseDate(workout.date)
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    // Heti statisztika kiszámítása
    const weeklyStats = this.calculateWeeklyStats(workouts);
    this.barChartData.datasets[0].data = weeklyStats;

    // Edzés streak kiszámítása
    this.workoutStreak = this.calculateWorkoutStreak(workouts);

    // Összesített edzésidő kiszámítása
    this.totalWorkoutTime = this.calculateTotalWorkoutTime(workouts);

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
    return new Date(); // Fallback az aktuális dátumra
  }

  calculateWeeklyStats(workouts: Workout[]): number[] {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Hétfő

    const weeklyStats = new Array(7).fill(0);

    workouts.forEach(workout => {
      const workoutDate = this.parseDate(workout.date);
      if (workoutDate >= weekStart && workoutDate <= today) {
        const dayIndex = workoutDate.getDay() - 1;
        if (dayIndex >= 0 && dayIndex < 7) {
          weeklyStats[dayIndex]++;
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

  calculateTotalWorkoutTime(workouts: Workout[]): number {
    return workouts.reduce((total, workout) => {
      return total + (workout.exercises.reduce((workoutTotal, exercise) => {
        return workoutTotal + (exercise.sets * exercise.reps);
      }, 0));
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

  tesztWorkoutHozzaadasa() {
    if (!this.loggedInUser) {
      alert('Nincs bejelentkezett felhasználó!');
      return;
    }
    const tesztWorkout: Workout = {
      id: '',
      name: 'Teszt edzés',
      date: new Date(),
      notes: 'Automatikusan hozzáadva',
      uid: this.loggedInUser.uid,
      totalWeight: 3*10*80 + 3*12*20 + 4*15*0,
      exercises: [
        { id: '1', name: 'Fekvenyomás', sets: 3, reps: 10, weight: 80, type: 'chest' },
        { id: '2', name: 'Bicepsz hajlítás', sets: 3, reps: 12, weight: 20, type: 'biceps' },
        { id: '3', name: 'Hasprés', sets: 4, reps: 15, weight: 0, type: 'abs' }
      ]
    };
    this.workoutService.create(tesztWorkout).subscribe({
      next: () => {
        alert('Teszt edzés hozzáadva!');
        this.loadData();
      },
      error: (err) => alert('Hiba: ' + err)
    });
  }
}
