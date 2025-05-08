import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: 'dashboard', loadComponent: ()=> import('./pages/dashboard/dashboard.component').then(d => d.DashboardComponent)},
    {path: 'profile', loadComponent: ()=> import('./pages/profile/profile.component').then(p => p.ProfileComponent)},
    {path: 'login', loadComponent: ()=> import('./pages/login/login.component').then(l => l.LoginComponent)},
    {path: 'register', loadComponent: ()=> import('./pages/register/register.component').then(r => r.RegisterComponent)},
    {path: 'stats', loadComponent: ()=> import('./pages/stats/stats.component').then(s => s.StatsComponent)},
    {path: 'workouts', loadComponent: ()=> import('./pages/workout-list/workout-list.component').then(w => w.WorkoutListComponent)},
    {path: 'new-workout', loadComponent: ()=> import('./pages/new-workout/new-workout.component').then(n => n.NewWorkoutComponent)},
    {path: 'edit-workout/:id', loadComponent: () => import('./pages/edit-workout/edit-workout.component').then(m => m.EditWorkoutComponent)},
    {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
    {path: '**', redirectTo: '/dashboard'},
];
