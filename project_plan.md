# Project Plan – FitTracker PWA

## Egy mondatos értékajánlat

Offline-first edzésnapló PWA hobby sportolóknak, amely rossz térerőben (pince, szabadtér) is azonnal naplóz, háttérben szinkronizál Firestore-ba, és soha nem veszít adatot — a nem-triviális rész az IndexedDB-alapú sync queue megbízható működtetése hibás hálózat mellett.

## Kontextus

Az interjúk (5 fő: Mari, Peti, Kati, Jani, Feri) egységesen jelezték: a konditermi wifi gyakran hiányzik, a meglévő appok reklámosak vagy fizetős fallal terheltek, és a kézi naplózás (jegyzet, Google Drive) szétszóródik. A versenytárs-elemzés (12 app) megerősítette, hogy az **offline + ingyenes + cross-platform** kombináció piaci rés — a FitNotes offline de Android-only, a Strong jó UX de fizetős, a Hevy ingyenes de online-függő.

## Képességek

| # | Képesség | Kategória | Komplexitás | Miért nem triviális? |
|---|---|---|---|---|
| 1 | Offline-first workout logging | Value | L | IndexedDB-be ír azonnal, sync queue mutex-szal véd a race condition ellen, partial failure nem blokkolja a többi elemet. Lefedi: US-03 (offline mentés), AC1-AC3 |
| 2 | Cloud sync queue (Firestore) | Productization | L | Hierarchikus document write (workout → exercises → sets subcollection), polling (15s) + online event driven trigger, retry logika, sync_events audit log. Lefedi: US-04 (szinkron), AC1-AC2 |
| 3 | Session cache + offline login | Productization | M | SHA-256 digest alapú offline jelszó-verifikáció IndexedDB-ből, online/offline login path elágazás, session persistence upsert logikával. Lefedi: US-01 (gyors bejelentkezés), AC1-AC3 |
| 4 | PWA Service Worker | Productization | M | Angular ngsw asset caching stratégia (prefetch app shell, lazy assets), offline app shell működés, bundle budget kontroll (700 kB warning / 1.2 MB error) |
| 5 | Workout summary dashboard | Value | M | Streak algoritmus (consecutív edzésnapok detektálása dátum-gap elemzéssel), volume aggregáció (sets x weight), derived state RxJS `pipe(map(...))` mintával. Lefedi: US-05 (szinkron státusz átláthatóság), AC1 |
| 6 | Értesítések és hibaállapot kezelés | Productization | M | Toast rendszer auto-dismiss-szel, sync error → felhasználóbarát üzenet, retry gomb manuális újrapróbálkozáshoz, workout-szintű status tracking (waiting/synced/error). Lefedi: NFR-5 (hibajelzés 5 mp-en belül) |
| 7 | Firestore security rules | Productization | M | Owner-based write protection (`ownerId == request.auth.uid`), collection-szintű rule-ok workout/exercise/set hierarchiára, unauthenticated access blokkolás |
| 8 | IaC (Terraform) + CI pipeline | Productization | M | Firebase Hosting/Firestore/Storage Terraform modulok, `terraform plan` minden PR-ben (ADR-0002), plan.out artefakt review kötelező, state lock GCS backendben |

**Kategória:** `Value` (felhasználó érzékeli) vagy `Productization` (minőséget garantál: auth, hibakezelés, tesztek, deploy)
**Komplexitás:** `S` < 1 nap · `M` 2-5 nap · `L` 1+ hét

**Összesítés:** 8 képesség, 6 Productization, 2 L-es — meghaladja a minimumot (6 képesség, 3 Productization, 2 L-es).

## Nem-funkcionális követelmények (NFR)

| # | NFR | Cél | Mérés módja |
|---|---|---|---|
| NFR-1 | TTFB | ≤ 1.5 s preview szerveren | Lighthouse Performance, 3 futás átlag |
| NFR-2 | Offline működés | Fő flow teljesen használható repülőgép módban | Playwright offline acceptance teszt |
| NFR-3 | Szinkron megbízhatóság | ≥ 98% siker 3 próbálkozáson belül | Unit teszt mesterséges hibainjektálással |
| NFR-4 | Hozzáférhetőség | WCAG 2.1 AA (kontraszt ≥ 4.5:1, fókusz) | axe score ≥ 90 |
| NFR-5 | Hibajelzés átláthatóság | Toast 5 mp-en belül hálózati hiba esetén | Acceptance teszt |

## A legnehezebb rész

**Az offline sync queue megbízható működése.**

A workout mentés és a Firestore sync között egy aszinkron queue áll, ami több szempontból is nehéz:

1. **Race condition**: a 15 másodperces polling és a böngésző `online` eventje egyszerre is triggerelhet sync-et — egy `processing` mutex flag véd a dupla feldolgozás ellen.
2. **Partial failure**: ha 5 workoutból 2 sync elbukik, a maradék 3-nak sikerülnie kell — a queue elemenként dolgoz fel, és egyenként jelöli az állapotot (synced/error).
3. **Hierarchikus Firestore write**: egy workout sync nem egy document write, hanem 3 szint: workout doc → exercises subcollection → sets sub-subcollection. Bármelyik szinten bukhat.
4. **Offline → online átmenet**: az app-nak azonnal reagálnia kell az internetkapcsolat visszatérésére, és a queue-t le kell dolgoznia anélkül, hogy a felhasználó bármit csinálna.

Ez az a rész, ami nem működött elsőre, és iteratív fejlesztést igényelt.

## Tech stack – indoklással

| Réteg | Technológia | Miért ezt és nem mást? |
|---|---|---|
| UI | Angular 18 (standalone components, új control flow) | PWA first-class támogatás (`@angular/service-worker`), RxJS natív integráció az offline reactive state-hez, typed Reactive Forms a dinamikus set-kezeléshez. Alternatíva volt: React (nincs beépített PWA support), Vue (kisebb RxJS ökoszisztéma) |
| Backend / logika | Firebase Firestore + client-side Angular services | Serverless: nincs backend szerver karbantartás, a hierarchikus NoSQL modell természetesen illik az edzés-adatstruktúrához (workout → exercises → sets). Alternatíva volt: saját REST API (több ops overhead) |
| Adattárolás | IndexedDB (ngx-indexed-db) + Firestore | Az offline-first megköveteli a lokális persistence-t; 4 store (workouts, sessions, sync_events, workout_sessions) biztosítja a teljes offline működést. Alternatíva volt: localStorage (méretkorlát, nem strukturált) |
| Auth | Firebase Auth (email/password) | Natív Firestore integráció (security rules `request.auth.uid`), nincs custom auth backend szükség, a client SDK kezeli a token refresh-t |
| Hosting | Firebase Hosting (ADR-0001) | CDN + HTTP/2 alapból, preview channel-ek PR-enként, egyetlen `firebase deploy` parancs. Alternatíva volt: Vercel (multi-provider komplexitás), saját VM (ops overhead) |
| IaC | Terraform (ADR-0002) | Git-ben követhető infra változások, `terraform plan` PR review-ban, state lock GCS-ben. Alternatíva volt: Firebase CLI-only (nincs plan), Pulumi (nincs csapattapasztalat) |

## Ami kimarad (non-goals)

- **Gamifikáció (trófeák, ranglista, digitális jutalmak)**: az interjúkban többen kérték (Mari, Feri, Jani), de a jelenlegi scope az offline-first alapokat fekteti le — a motivációs rendszer a következő fázisban jöhet
- **Multi-user / social funkciók**: nincs megosztás, csoportos edzés, vagy más felhasználók adatainak megtekintése — egyfelhasználós scope
- **Szerepkör-kezelés (admin/user)**: egyféle felhasználói szerep van, nincs admin panel
- **Vizuális statisztikák (grafikonok, trend-elemzés)**: a PRD-ben scope-in, de az első beadásra a summary dashboard aggregált számokat mutat chart library nélkül
- **Edzésterv generálás / AI ajánlások**: az app naplóz, nem tervez
- **Native mobile app / okosóra integráció**: PWA marad, nincs Capacitor/Cordova wrapper — a böngésző install prompt a disztribúciós csatorna
- **PIN/biometrikus offline login megerősítés**: a user stories-ban (US-01 AC3) szerepel, de a Web Authentication API komplexitása miatt későbbre halasztva

## Ami még nem tiszta

- **Conflict resolution stratégia**: ha ugyanaz a workout két eszközről módosul offline, melyik nyer? Jelenleg last-write-wins, de ez adatvesztéshez vezethet — meg kell vizsgálni, kell-e CRDT vagy verzió-alapú merge
- **E2E teszt lefedettség scope-ja**: a kritikus flow-k (login → add workout → sync → verify in Firestore) tesztelése Playwright-tal tervezett, de a pontos lefedettségi cél még nem definiált
- **A11y audit mélysége**: NFR-4 céloz WCAG 2.1 AA-t, de a jelenlegi implementáció nincs auditálva — axe-core integráció és manuális tesztelés szükséges

## Megoldott kérdések

- **Törlés és módosítás szinkronizálása** ✅: soft-delete mintával megvalósítva — a `deleted=true` flaggel jelölt entitások az IndexedDB-ben maradnak a szinkronig, utána `hardDelete` távolítja el őket. Az `operation` mező (`create`/`update`/`delete`) határozza meg a Firestore műveletet. Backward compatible: az `operation=undefined` entitások `create`-ként kezelődnek.

## Hivatkozások

| Dokumentum | Útvonal |
|---|---|
| PRD | `docs/spec/prd.yaml` |
| Spec v0.2 | `docs/spec/product_spec_v0.2.md` |
| User Stories + AC | `docs/stories/user_stories.md` |
| Interjúk | `docs/interviews/*.json` |
| Versenytárs-elemzés | `docs/market/competitors.csv` |
| ADR-0001 Deployment | `docs/adr/0001-deployment-target.md` |
| ADR-0002 IaC | `docs/adr/0002-iac-strategy.md` |
| ADR-0003 PWA Architecture | `docs/adr/0003-pwa-offline-first-architecture.md` |
| DoR/DoD | `docs/process/dor_dod.md` |
| Traceability | `docs/traceability.md` |
| MI-használat | `docs/ai/usage_plan.yaml`, `docs/ai/ai_log.jsonl` |
