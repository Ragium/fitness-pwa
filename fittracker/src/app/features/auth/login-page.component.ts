import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OnlineStatusService } from '../../core/services/online-status.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AsyncPipe],
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly onlineStatus = inject(OnlineStatusService);
  private readonly router = inject(Router);

  readonly online$ = this.onlineStatus.status$;
  readonly session$ = this.authService.session$;

  loading = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const { email, password } = this.form.getRawValue();
      await this.authService.login(email!, password!);
      await this.router.navigate(['/workouts']);
    } finally {
      this.loading = false;
    }
  }

  get emailInvalid(): boolean {
    const ctrl = this.form.controls.email;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  get passwordInvalid(): boolean {
    const ctrl = this.form.controls.password;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }
}
