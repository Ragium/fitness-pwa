# ADR-0001: PWA Offline-First Architecture Choice
## Status
-- Elfogadva

## Context
Fejlesztjük a FitTracker edzésnapló alkalmazást hobbisportolók számára. A piackutatás során azonosítottuk, hogy a jelenlegi edzésnapló alkalmazások főbb problémái:

-- **Internetfüggőség**: A legtöbb app nem működik megfelelően gyenge vagy hiányzó internetkapcsolat mellett
-- **Platform fragmentáció**: Külön natív appok fejlesztése iOS-re és Androidra drága és időigényes
-- **Telepítési akadályok**: A felhasználóknak le kell tölteniük és telepíteniük kell az alkalmazást
-- **Adatvesztés**: Gyenge kapcsolat esetén az edzésadatok elveszhetnek

Célcsoportunk gyakran olyan környezetben edz (konditerem pincehelyiségei, szabadtér), ahol az internetkapcsolat akadozik.

### Megfontolandó opciók
1. **Natív mobilalkalmazás (iOS/Android)**

2. **Hagyományos webes alkalmazás**

3. **Progressive Web App (PWA) offline-first architektúrával**

4. **Hibrid alkalmazás (React Native/Flutter)**

## Decision
-- Angular + -- @angular/pwa (Service Worker) + -- IndexedDB (ngx-indexed-db) + -- Firebase Firestore
PWA offline-first architektúra mellett döntünk, ezekkel a technológiákkal.

## Technikai implementáció
-- Angular: szervezett, fenntartható fejlesztés, PWA out-of-the-box.
-- @angular/pwa: Service Worker, automata offline cache, telepíthetőség, gyors frissítés.
-- IndexedDB: ngx-indexed-db wrapper-rel, minden edzés/adat először offline tárolásra kerül, gyors helyi keresés, vizuális statisztikák.
-- Firebase Firestore: felhőmentés és szinkronizáció, háttérben, multi-device, csak engedéllyel.

## Előnyök
-- Platformfüggetlen, agilis fejlesztés
-- Minden böngészőben, minden eszközön
-- Offline működés minden kulcsfunkcióval
-- Adatvesztés elleni védelem (sync)
-- Gyors piacra jutás, alacsony fenntartási költség
-- Felhasználói élmény: reklámmentesség, letisztult UI

Negatív hatások és kockázatok
-- Komplex architektúra (de Angularban jól dokumentált)
-- Régi böngészők compatibilitási problémái
-- Felhasználói edukáció (PWA telepítés)
-- Cloud sync privacy és GDPR
-- Első betöltési idő lehet nagy

## Technikai kockázatok kezelése
Fallback hagyományos webapp régi böngészőkben
Progresszív fejlesztés: core feature elsőre, haladó később
Felhasználói útmutatók a PWA telepítésről
Teljesítmény optimalizálás kritikus útvonalon

## Alternatívák elvetése
-- Natív app: túl költséges, lassabb fejlesztés, app store függő
-- Web app: csak online, gyengébb UX
-- Hibrid app: store dependency, nincs igazi offline előny

Angular service worker

ngx-indexed-db

Firebase Firestore

Date
2025-10-17

Author
Rostás Bence

Review Date
