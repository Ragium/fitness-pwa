import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly defaultDuration = 3000;
  private readonly successConfig: MatSnackBarConfig = {
    duration: this.defaultDuration,
    panelClass: ['success-snackbar'],
    horizontalPosition: 'center',
    verticalPosition: 'bottom'
  };

  private readonly errorConfig: MatSnackBarConfig = {
    duration: this.defaultDuration,
    panelClass: ['error-snackbar'],
    horizontalPosition: 'center',
    verticalPosition: 'bottom'
  };

  private readonly infoConfig: MatSnackBarConfig = {
    duration: this.defaultDuration,
    panelClass: ['info-snackbar'],
    horizontalPosition: 'center',
    verticalPosition: 'bottom'
  };

  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void {
    this.snackBar.open(message, 'Bezárás', this.successConfig);
  }

  error(message: string): void {
    this.snackBar.open(message, 'Bezárás', this.errorConfig);
  }

  info(message: string): void {
    this.snackBar.open(message, 'Bezárás', this.infoConfig);
  }

  // Speciális üzenetek
  offlineSave(): void {
    this.info('Adatok offline mentve! Szinkronizálás online állapotban.');
  }

  onlineSync(): void {
    this.info('Online állapot: Az adatok szinkronizálása folyamatban...');
  }

  offlineMode(): void {
    this.info('Offline állapot: Az adatok lokálisan lesznek tárolva');
  }

  // Validációs üzenetek
  formError(): void {
    this.error('Kérjük, töltse ki az összes kötelező mezőt');
  }

  // Auth üzenetek
  loginSuccess(): void {
    this.success('Sikeres bejelentkezés');
  }

  loginError(error: any): void {
    let message = 'Hiba történt a bejelentkezés során';
    if (error.code === 'auth/user-not-found') {
      message = 'Nem található felhasználó ezzel az email címmel';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Hibás jelszó';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Érvénytelen email cím formátum';
    } else if (error.code === 'auth/invalid-credential'){
        message = 'Hibás email vagy jelszó';
    }
    this.error(message);
  }

  registerSuccess(): void {
    this.success('Sikeres regisztráció');
  }

  registerError(error: any): void {
    let message = 'Hiba történt a regisztráció során';
    if (error.code === 'auth/email-already-in-use') {
      message = 'Ez az email cím már használatban van';
    } else if (error.code === 'auth/weak-password') {
      message = 'A jelszó túl gyenge (minimum 6 karakter)';
    }
    this.error(message);
  }

  passwordResetSent(): void {
    this.success('Ha ez az email cím regisztrálva van, akkor küldtünk egy visszaállítási linket a postaládájába. Kérjük, ellenőrizze a beérkező leveleket és a spam mappát is.');
  }

  passwordResetError(error: any): void {
    let message = 'Hiba történt a jelszó visszaállítás során';
    if (error.code === 'auth/invalid-email') {
      message = 'Érvénytelen email cím formátum';
    } else if (error.code === 'auth/user-not-found') {
      message = 'Nincs regisztrálva ez az email cím';
    }
    this.error(message);
  }

  // Profil üzenetek
  profileUpdateSuccess(): void {
    this.success('Profil sikeresen frissítve');
  }

  profileUpdateError(): void {
    this.error('Hiba történt a profil frissítése során');
  }

  passwordChangeSuccess(): void {
    this.success('Jelszó sikeresen módosítva');
  }

  passwordChangeError(): void {
    this.error('Hiba történt a jelszó módosítása során');
  }

  // Edzés üzenetek
  workoutSaveSuccess(): void {
    this.success('Edzés sikeresen mentve');
  }

  workoutSaveError(): void {
    this.error('Hiba történt az edzés mentése során');
  }

  workoutUpdateSuccess(): void {
    this.success('Edzés sikeresen frissítve');
  }

  workoutUpdateError(): void {
    this.error('Hiba történt az edzés frissítése során');
  }

  workoutDeleteSuccess(): void {
    this.success('Edzés sikeresen törölve');
  }

  workoutDeleteError(): void {
    this.error('Hiba történt az edzés törlése során');
  }

  workoutLoadError(): void {
    this.error('Hiba történt az edzések betöltése során');
  }

  workoutNotFound(): void {
    this.error('Az edzés nem található');
  }
} 