import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable, map, take, filter } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.authService.isUserLoggedIn().pipe(
      filter(user => user !== undefined),
      take(1),
      map(user => {
        
        if (user) {
          return true;
        }
        // Próbáljuk meg localStorage-ból is
        const cachedUser = localStorage.getItem('user');
        if (cachedUser && cachedUser !== 'null') {
          try {
            const parsedUser = JSON.parse(cachedUser);
            if (parsedUser && parsedUser.uid) {
              // Beállítjuk az AuthService userSubject-jébe is
              (this.authService as any).userSubject.next(parsedUser);
              
              return true;
            }
          } catch (e) {
            console.error('[GUARD] LocalStorage parse error:', e);
          }
        }
        
        return this.router.createUrlTree(['/unauthorized']);
      })
    );
  }
} 