import { DatePipe } from '@angular/common';
import { Pipe } from '@angular/core';

@Pipe({
  name: 'datepipe'
})
export class DatepipePipe {

  private datePipe: DatePipe;

  constructor() {
    this.datePipe = new DatePipe('hu-HU');
  }

  transform(value: any, format?: string, timezone?: string, locale?: string): string | null {
    return this.datePipe.transform(value, format, timezone, locale);
  }
}
