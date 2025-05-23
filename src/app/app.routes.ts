import { Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
    {path: 'dashboard', loadComponent: ()=> import('./pages/dashboard/dashboard.component').then(d => d.DashboardComponent), canActivate: [AuthGuard], title: 'Főoldal'},
    {path: 'profile', loadComponent: ()=> import('./pages/profile/profile.component').then(p => p.ProfileComponent), canActivate:[AuthGuard], title: 'Profil'},
    {path: 'login', loadComponent: ()=> import('./pages/login/login.component').then(l => l.LoginComponent), title: 'Bejelentkezés'},
    {path: 'register', loadComponent: ()=> import('./pages/register/register.component').then(r => r.RegisterComponent), title: 'Regisztráció'},
    {path: 'forgot-password', loadComponent: ()=> import('./pages/forgot-password/forgot-password.component').then(r => r.ForgotPasswordComponent), title: 'Jelszó visszaállítás'},
    {path: 'stats', loadComponent: ()=> import('./pages/stats/stats.component').then(s => s.StatsComponent), canActivate:[AuthGuard], title: 'Statisztikák'},
    {path: 'workouts', loadComponent: ()=> import('./pages/workout-list/workout-list.component').then(w => w.WorkoutListComponent), canActivate:[AuthGuard], title: 'Edzések'},
    {path: 'new-workout', loadComponent: ()=> import('./pages/new-workout/new-workout.component').then(n => n.NewWorkoutComponent), canActivate:[AuthGuard], title: 'Új edzés'},
    {path: 'edit-workout/:id', loadComponent: () => import('./pages/edit-workout/edit-workout.component').then(m => m.EditWorkoutComponent), canActivate:[AuthGuard], title: 'Edzés szerkesztése'},
    {path: 'unauthorized', loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(u => u.UnauthorizedComponent)},
    {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
    {path: '**', redirectTo: '/dashboard'},
];
