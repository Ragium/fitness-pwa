import { Pipe, PipeTransform } from '@angular/core';
import { WorkoutSet } from '../../core/models/workout.model';

@Pipe({
  name: 'volume',
  standalone: true,
})
export class VolumePipe implements PipeTransform {
  transform(sets: WorkoutSet[] | undefined): number {
    if (!sets?.length) {
      return 0;
    }
    return sets.reduce((sum, s) => sum + (s.repetitions ?? 0) * (s.weight ?? 0), 0);
  }
}
