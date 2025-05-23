import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { SwUpdate } from '@angular/service-worker';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { FirebaseError } from '@angular/fire/app';
import { User } from 'firebase/auth';
import { trigger, transition, style, animate, query, animateChild, group } from '@angular/animations';

const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        width: '100%',
        opacity: 0
      })
    ], { optional: true }),
    query(':enter', [
      animate('0.3s ease-in', style({ opacity: 1 }))
    ], { optional: true }),
    query(':leave', [
        animate('0.3s ease-out', style({ opacity: 0 }))
      ], { optional: true }
    )
  ])
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [routeAnimations]
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private swUpdate = inject(SwUpdate);
  loggedInUser?: User | null;

  private subscription: Subscription | undefined;
  private offlineCallback!: ()=> void;
  private onlineCallback!: ()=> void;

  public ngOnInit(): void {
      this.swUpdate.checkForUpdate().then(update => {
        if (update){
          alert('Új verzió elérhető!');
          window.location.reload();
        }
      })

      this.offlineCallback = () => console.log('Offline');
      window.addEventListener('offline', this.offlineCallback);
      this.onlineCallback = () => console.log('Online');
      window.addEventListener('online', this.onlineCallback);

      this.authS.isUserLoggedIn().subscribe(user =>{
        console.log(user);
        this.loggedInUser = user;
        console.log('Email: ', this.loggedInUser?.email);
        localStorage.setItem('user', JSON.stringify(this.loggedInUser));
      }, error =>{
        console.error(error);
        localStorage.setItem('user', JSON.stringify('null'));
      })
}

public ngOnDestroy(): void {
  this.subscription?.unsubscribe();

  window.removeEventListener('offline', this.offlineCallback);
  window.removeEventListener('online', this.onlineCallback);
}

   constructor(private authS: AuthService) {

    };
  
  onToggleSidenav(sidenav: MatDrawer){
    sidenav.toggle();
  }

  onClose(event: any, sidenav: MatDrawer){
    if (event === true){
      sidenav.close();
    }
  }

  logout() {
    this.authS.logout().subscribe({
      next: () => {
        console.log('Sikeres kijelentkezés');
        this.router.navigate(['/login']);
      },
      error: (error: FirebaseError) => {
        console.error('Hiba történt a kijelentkezés során:', error);
      }
    });
  }
}
