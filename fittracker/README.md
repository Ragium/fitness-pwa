# FitTracker – Sprint 1 vertikális szelet

Az első implementált szelet fókusza a PWA offline-first élményen van: gyors bejelentkezés, sorozat rögzítés internet nélkül, üres állapot eligazító kártya és automatikus szinkron sor, mindezt az ADR-0001-ben rögzített Angular + Service Worker + IndexedDB + Firebase stackkel.

## Fő feature-ök

- **Gyors belépés** – email/jelszó űrlap Firebase Auth-ra bekötve, session cache-sel offline visszatéréshez.
- **Üres állapot** – offline badge + CTA, ami azonnal az űrlapra fókuszál (AC2: `tests/acceptance/empty_state.feature`).
- **Sorozat űrlap** – kötelező mezők validációval, `Mentés offline` CTA, toast visszajelzés.
- **Offline queue** – `ngx-indexed-db` tárolja a sorozatokat, `SyncQueueService` próbálkozik Firestore felé, manuális „Szinkron újra” gombbal.
- **Gyors visszajelzés kártya** – összvolumen, streak, utolsó 3 edzés helyben számolva.

## Fejlesztői környezet

```bash
cd fittracker
npm install
npm run start   # ng serve --open
```

A `Service Worker` csak `npm run build && npm run preview` alatt aktív, de az IndexedDB-s mentés fejlesztői módban is működik. A build artefaktokat a `dist/fittracker` könyvtárban találod (`npm run build`).

## Firebase beállítás

Az `src/environments/` mappában sablon kulcsok szerepelnek:

- `environment.development.ts` – helyi futtatáshoz (`production: false`).
- `environment.ts` – build alatt `production: true`.

Állítsd be a saját Firebase projekted értékeit (apiKey, authDomain, stb.), vagy injektáld GitHub Actions-ből file replacementtel. Amíg demo kulcs van, a `CloudSyncService` lokálisan szimulált szinkront futtat.

## Architektúra & modulok

- `core/services` – Auth, session cache, online státusz, IndexedDB adatbolt és szinkron sor.
- `features/auth` – `LoginPageComponent`.
- `features/workouts` – üres állapot, űrlap, lista és összegzés komponensek.
- `shared/toast-container` – globális toast értesítések.

Az IndexedDB sémája (`core/config/db.config.ts`) három store-t definiál: `workouts`, `sessions`, `sync_events`. A szinkronizálás `SyncQueueService`-ben központosítottan történik, figyelve az `OnlineStatusService` és a lokális sor módosításait.

## Következő lépések

- Integráció valós Firebase projekttel és Terraformmal (ADR-0002).
- Unit/acceptance tesztek (`tests/acceptance/*.feature`) bekötése pl. Playwright/Cypress-szel.
- A11y audit (`npm run test:a11y`) és perf budget finomhangolás a Lighthouse célokhoz.
