import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkoutDraft, WorkoutSet } from '../../core/models/workout.model';

@Component({
  standalone: true,
  selector: 'app-workout-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workout-form.component.html',
  styleUrl: './workout-form.component.scss',
})
export class WorkoutFormComponent {
  @Output() save = new EventEmitter<WorkoutDraft>();

  @ViewChild('exerciseInput') exerciseInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    exercise: ['', [Validators.required, Validators.minLength(2)]],
    note: [''],
    sets: this.fb.array([this.createSetGroup()]),
  });

  handleSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const sets = this.setsArray.controls.map((ctrl) => {
      const raw = ctrl.getRawValue();
      return {
        repetitions: Number(raw.repetitions) || 0,
        weight: Number(raw.weight) || 0,
        note: raw.note || undefined,
      } as WorkoutSet;
    });

    this.save.emit({
      exercise: this.form.value.exercise ?? '',
      note: this.form.value.note ?? undefined,
      sets,
    });
  }

  resetForm(): void {
    this.form.reset();
    this.setsArray.clear();
    this.addSet();
    this.focusFirstField();
  }

  loadWorkoutData(exercise: string, note?: string, sets?: WorkoutSet[]): void {
    this.form.patchValue({
      exercise,
      note: note ?? '',
    });
    this.setsArray.clear();
    if (sets && sets.length > 0) {
      for (const set of sets) {
        this.setsArray.push(
          this.fb.group({
            repetitions: [set.repetitions, [Validators.required, Validators.min(1)]],
            weight: [set.weight, [Validators.required, Validators.min(1)]],
            note: [set.note ?? ''],
          })
        );
      }
    } else {
      this.addSet();
    }
    this.focusFirstField();
  }

  focusFirstField(): void {
    this.exerciseInput?.nativeElement.focus();
  }

  get disableSave(): boolean {
    return this.form.invalid;
  }

  get setsArray(): FormArray<FormGroup> {
    return this.form.get('sets') as FormArray<FormGroup>;
  }

  addSet(): void {
    this.setsArray.push(this.createSetGroup());
  }

  removeSet(index: number): void {
    if (this.setsArray.length <= 1) {
      return;
    }
    this.setsArray.removeAt(index);
  }

  private createSetGroup(): FormGroup {
    return this.fb.group({
      repetitions: [null as number | null, [Validators.required, Validators.min(1)]],
      weight: [null as number | null, [Validators.required, Validators.min(1)]],
      note: [''],
    });
  }
}
