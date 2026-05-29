# FitTracker - Spec v0.2

## Cél
A vertikális szelet célja, hogy a FitTracker első felhasználói gyorsan, stabilan be tudjanak jelentkezni, majd offline-first módon rögzíthessenek egy súlyzós edzés sorozatot. A mentett adatok a kapcsolat visszatérésekor automatikusan szinkronizálódnak a felhőbe, így a konditermi környezetben tapasztalt motivációs és adatvesztési problémák csökkennek.

## Scope

### In
- Felhasználói bejelentkezés a PWA-ban (email+jelszó flow, offline fallback cache).
- Súlyzós edzés sorozat rögzítése és listázása offline-first módon.
- Gyors visszajelzéskártya: napi összvolumen, aktuális streak és utolsó három edzés dátuma.

### Out
- Admin vagy backoffice felület.

## User Story térkép
- **US-00 - Gyors bejelentkezés:** visszatérő felhasználó néhány másodpercen belül hozzáfér az edzéseihez (interjú: Feri).
- **US-01 - Üres állapot eligazít:** új felhasználó offline is érti, hogyan induljon el (interjú: Mari, Kati).
- **US-02 - Gyors sorozat rögzítés:** felhasználó 10 mp-en belül elment egy súlyzós sorozatot (interjú: Feri, Peti).
- **US-03 - Offline adatőrzés és szinkron:** mentés internet nélkül, automatikus feltöltés később (pain point: konditerem wifi hiány).

## NFR (mérhető)
- **NFR-1 - TTFB:** A PWA főoldal TTFB-je <= 1.5 s a `npm run preview` kiszolgálón, Lighthouse Performance átlag három futás alapján.
- **NFR-2 - Offline működés:** Fő flow (lista+űrlap) teljesen használható repülőgép módban; mérés: Playwright offline acceptance teszt (`tests/acceptance/offline_add_workout.spec.ts`) 100% sikerrel.
- **NFR-3 - Szinkron megbízhatóság:** A szinkron sor 3 próbálkozáson belül >= 98%-ban sikeresen ír Firestore-ba; mérés: Jest unit teszt mesterséges hibainjektálással (`tests/unit/sync-queue.spec.ts`).
- **NFR-4 - Hozzáférhetőség:** Fő flow komponensei megfelelnek WCAG 2.1 AA szintnek (kontraszt >= 4.5:1, fókusz), mérés: `npm run test:a11y` axe score >= 90.
- **NFR-5 - Hibakezelés átláthatóság:** Hálózati hiba esetén a toast 5 mp-en belül látható „Mentve offline, szinkron folyamatban” üzenettel; mérés: Cypress állapot teszt (`tests/acceptance/sync_status_toast.spec.ts`).

## Fő AC-k (Given-When-Then)

### AC1 - Üres állapot offline
- **Given** nincs mentett edzés a készüléken és a felhasználó offline módban nyitja meg a FitTrackert  
- **When** betölt a PWA főképernyő  
- **Then** egy üres állapot kártyát lát „Nincs még edzésed” üzenettel, offline badge-del és egy „Új sorozat hozzáadása” CTA gombbal.

### AC2 - Sorozat rögzítése és azonnali visszajelzés
- **Given** a felhasználó az „Új sorozat” űrlapon minden kötelező mezőt kitölt (gyakorlat, ismétlés, súly)  
- **When** rákattint a „Mentés offline” gombra  
- **Then** a sorozat azonnal megjelenik a napi listában, és siker toast jelzi, hogy a mentés lokálisan megtörtént.

### AC3 - Szinkron státusz frissülése
- **Given** a felhasználó korábban offline mentett legalább egy sorozatot és a készülék visszanyeri az internetkapcsolatot  
- **When** a háttérszinkron fut és 200-as választ kap a Firestore API-tól  
- **Then** a sorozat „Szinkronizálva” jelölést kap, eltűnik a kézi „Szinkron újra” gomb, és a sync log friss bejegyzést rögzít az eseményről.

### AC4 - Validáció és hibaüzenet
- **Given** a felhasználó üresen hagyja bármely kötelező mezőt az „Új sorozat” űrlapon  
- **When** megpróbálja elküldeni az űrlapot  
- **Then** piros keret és mező alatti hibaüzenet jelenik meg, a „Mentés offline” gomb inaktív marad, és nem jön létre új sorozat bejegyzés.

## Hivatkozások
- PRD: `docs/spec/prd.yaml`
- Interjúk: `docs/interviews/`
- ADR: `docs/adr/0003-pwa-offline-first-architecture.md`
- AI usage plan: `docs/ai/usage_plan.yaml`
