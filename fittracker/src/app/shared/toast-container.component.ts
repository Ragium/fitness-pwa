import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { NotificationService, ToastMessage } from '../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-toast-container',
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription?: Subscription;

  constructor(private readonly notifications: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notifications.toasts$.subscribe((toast) => {
      this.toasts = [...this.toasts, toast];
      timer(4000).subscribe(() => this.dismiss(toast.id));
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }
}
