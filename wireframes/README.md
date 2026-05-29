# Wireframes – fő flow

## 01-main-flow.png
**Cél:** Lista áttekintés + új edzés indítása, loader átmenet jelzése.
**Interakciók:** kereső, lapozás (max 10 elem/oldal), "Új edzés" CTA, kártya megnyitása/szerkesztése.
**Állapotok:** normál lista; loader overlay frissítéskor.
**Hivatkozások:** US-01/AC1, US-03/AC1; Spec v0.2 – Fő AC-k/1; tests: `tests/acceptance/workouts.feature`.
**Tesztötletek:** keresés releváns találatot ad; új edzés gomb az űrlapra navigál.

## 02-empty-state.png
**Cél:** Első belépéskor útmutatás az első edzés rögzítéséhez.
**Interakciók:** "+ Első edzés rögzítése" CTA, súgó link.
**Állapotok:** üres lista; információs üzenet.
**Hivatkozások:** US-01/AC1; Spec v0.2 – Fő AC-k/1; tests: `tests/acceptance/empty_state.feature`.
**Tesztötletek:** üres állapot CTA az űrlapra visz; súgó link megnyílik.

## 03-error-state.png
**Cél:** Szinkron hiba esetén gyors visszaút és retry.
**Interakciók:** "Próbáld újra" gomb, "Offline megtekintés" másodlagos akció, súgó link.
**Állapotok:** hibaüzenet; offline fallback jelzés.
**Hivatkozások:** US-01/AC2; Spec v0.2 – Fő AC-k/1; tests: `tests/acceptance/offline_save.feature`.
**Tesztötletek:** hibaüzenet látszik, retry újraküldi a sync-et; offline módra váltáskor helyi adatok megmaradnak.

## 04-form-validation.png
**Cél:** Új edzés rögzítése, valid és invalid példákkal.
**Interakciók:** mezőkitöltés (Cím, Dátum, Gyakorlatok), Mentés CTA, disabled állapot hiba esetén.
**Állapotok:** valid beküldés; invalid mezőszintű hibák; disabled gomb.
**Hivatkozások:** US-02/AC1–AC2; Spec v0.2 – Fő AC-k/2; tests: `tests/acceptance/form_validation.feature`.
**Tesztötletek:** kötelező mező üresen hibát ad; sikeres mentés toastot mutat és visszanavigál a listára.

## 05-login.png
**Cél:** Biztonságos belépés email/jelszóval és SSO-val; hibaüzenet megjelenítése.
**Interakciók:** email/jelszó mezők, "Belépés" gomb, "Google belépés" gomb, jelszó reset link.
**Állapotok:** normál; invalid (hibás jelszó) piros hibaüzenettel; mobil stack megjegyzés.
**Hivatkozások:** US-00/AC1; Spec v0.2 – Auth; tests: `tests/authentication-smoke` (terv szerinti smoke check).
**Tesztötletek:** hibás jelszó hibát dob; sikeres login után átirányít a workout listára; Google gomb SSO flow-t indít.
