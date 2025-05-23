import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'totalWeight',
  standalone: true,
})
export class TotalWeightPipe implements PipeTransform {

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '0 kg';
    }
    
    // Formázhatunk itt, ha szükséges (pl. tizedesjegyek száma, nagy számok rövidítése)
    // Egyelőre csak hozzáadjuk a mértékegységet
    return `${value} kg`;
  }

} 