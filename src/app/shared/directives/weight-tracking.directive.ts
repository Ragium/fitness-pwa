import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { User, WeightEntry } from '../models/user.model';
import { fromEvent, merge } from 'rxjs';

@Directive({
  selector: '[weightTracking]',
  standalone: true
})
export class WeightTrackingDirective implements OnInit, OnDestroy {
  @Input() user: User | null = null;
  private chart: Chart | null = null;
  private isOnline = navigator.onLine;

  constructor(private el: ElementRef) {
    // Online/offline események figyelése
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe(() => {
      this.isOnline = navigator.onLine;
      if (this.user) {
        this.updateChart();
      }
    });
  }

  ngOnInit() {
    
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  ngOnChanges() {
    if (this.user) {
      this.updateChart();
    }
  }

  private createChart() {
    if (!this.user) return;

    const ctx = this.el.nativeElement.getContext('2d');
    
    const weightData = this.user.weightHistory || [];
    const labels = weightData.map((entry: WeightEntry) => this.parseDate(entry.date).toLocaleDateString('hu-HU'));
    const weights = weightData.map((entry: WeightEntry) => entry.weight);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Testúly (kg)',
          data: weights,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => `Testúly: ${context.parsed.y} kg`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Testúly (kg)'
            }
          }
        }
      }
    });
  }

  private updateChart() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.createChart();
  }

  private parseDate(date: any): Date {
    if (date instanceof Date) {
      return date;
    }
    // Ha Timestamp objektum, konvertáljuk Date-vé
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    // Egyéb string vagy szám alapú dátum formátumok
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    console.warn('Érvénytelen dátum formátum a súlytörténetben:', date);
    return new Date(); // Visszatérés az aktuális dátummal vagy nullával hibás esetben
  }
} 