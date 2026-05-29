import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-empty-state-card',
  imports: [CommonModule],
  templateUrl: './empty-state-card.component.html',
  styleUrl: './empty-state-card.component.scss',
})
export class EmptyStateCardComponent {
  @Input() isOffline = false;
  @Output() primaryCta = new EventEmitter<void>();

  handleClick(): void {
    this.primaryCta.emit();
  }
}
