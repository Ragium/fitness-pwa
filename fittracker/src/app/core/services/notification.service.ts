import { Injectable } from '@angular/core';
import { nanoid } from 'nanoid/non-secure';
import { Observable, Subject } from 'rxjs';

export type ToastLevel = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  level: ToastLevel;
  text: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastSubject = new Subject<ToastMessage>();
  readonly toasts$: Observable<ToastMessage> = this.toastSubject.asObservable();

  push(level: ToastLevel, text: string): void {
    this.toastSubject.next({
      id: nanoid(8),
      level,
      text,
      createdAt: Date.now(),
    });
  }

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }
}
