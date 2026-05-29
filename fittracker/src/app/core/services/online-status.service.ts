import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  private readonly statusSubject = new BehaviorSubject<boolean>(navigator.onLine);
  readonly status$: Observable<boolean> = this.statusSubject.asObservable();

  constructor(private readonly ngZone: NgZone) {
    const updateStatus = () => this.statusSubject.next(navigator.onLine);
    window.addEventListener('online', () => this.ngZone.run(updateStatus));
    window.addEventListener('offline', () => this.ngZone.run(updateStatus));
  }

  snapshot(): boolean {
    return this.statusSubject.value;
  }
}
