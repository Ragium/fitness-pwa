# FitTracker – User Story + AC

Ez a dokumentum a `docs/spec/product_spec_v0.2.md` vertikális szeletét írja le. Minden történet megfelel az INVEST kritériumoknak (Independent, Negotiable, Valuable, Estimable, Small, Testable), és Given/When/Then formában tartalmaz elfogadási feltételeket. Az „Automatizálva” jelölés mutatja, hogy az adott AC-t a `tests/acceptance/*.feature` fájlok lefedik.

---

### US-01: Gyors bejelentkezés
*Mint visszatérő felhasználó, szeretnék néhány másodperc alatt belépni, hogy azonnal folytathassam az edzésnaplózást még instabil hálózat mellett is.*

- **AC1 – Érvényes hitelesítés**  
  Given: regisztrált felhasználó vagyok helyes email–jelszó párossal  
  When: beküldöm a bejelentkezési űrlapot stabil internet mellett  
  Then: 3 másodpercen belül átirányítást kapok a fő edzéslistára, és látom a legutóbbi offline szinkron idejét.
- **AC2 – Hibás hitelesítés**  
  Given: elgépelem a jelszót  
  When: beküldöm az űrlapot  
  Then: piros hibaüzenetet kapok („Hibás belépési adatok”), a mező fókuszt kap, és nem jön létre session.
- **AC3 – Offline visszatérés**  
  Given: korábban már bejelentkeztem és a session cache érvényes  
  When: offline nyitom meg az appot  
  Then: PIN/biometrikus megerősítést kér, majd megjelenik az edzéslista offline jelzéssel.

---

### US-02: Üres állapot eligazít
*Mint új felhasználó, szeretném látni mit tehetek, ha még nincs rögzített edzésem, hogy motivált maradjak internet nélkül is.*

- **AC1 – Üres állapot üzenet**  
  Given: nincs lokálisan tárolt sorozatom  
  When: megnyitom az edzéslistát  
  Then: egy illusztrációval kiegészített „Nincs még edzésed” üzenetet és offline badge-et látok.
- **AC2 – CTA működés** *(Automatizálva: `tests/acceptance/empty_state.feature`)*  
  Given: az üres állapot kártyán állok  
  When: a „Új sorozat hozzáadása” gombra kattintok  
  Then: megnyílik az űrlap, a kötelező mezők jelölve vannak, és a fókusz a „Gyakorlat” mezőre kerül.

---

### US-03: Sorozat rögzítése offline
*Mint aktív felhasználó, szeretnék kapcsolat nélkül adatot rögzíteni, hogy ne vesszen el egyetlen sorozatom sem, és azonnali visszajelzést kapjak a mentésről.*

- **AC1 – Sikeres offline mentés** *(Automatizálva: `tests/acceptance/offline_save.feature`)*  
  Given: offline módban vagyok és minden kötelező mezőt kitöltöttem  
  When: a „Mentés offline” gombra nyomok  
  Then: a sorozat megjelenik a lista tetején, toast jelzi a lokális mentést, és „Szinkron várakozik” státuszt kap.
- **AC2 – Validációs hiba**  
  Given: üresen hagyom a súly mezőt  
  When: menteni próbálok  
  Then: piros keret és mező alatti hibaszöveg jelenik meg, a gomb inaktív marad, és nem keletkezik új bejegyzés.
- **AC3 – Több sorozat sorba állítása**  
  Given: egymás után három sorozatot viszek fel offline  
  When: minden mentést végrehajtok  
  Then: mindhárom sor a listában „Szinkron várakozik” jelölést kap, és a queue számláló 3-ra áll.

---

### US-04: Szinkron visszatérő kapcsolattal
*Mint felhasználó, szeretném hogy amint visszajön az internet, a korábban offline mentett adataim automatikusan felkerüljenek a felhőbe, és tudjam, ha manuális beavatkozás kell.*

- **AC1 – Automatikus szinkron siker** *(Automatizálva: `tests/acceptance/sync_queue.feature`)*  
  Given: legalább egy „Szinkron várakozik” státuszú sorozatom van  
  When: a készülék visszanyeri a hálózatot  
  Then: a háttér worker elküldi az adatot, a sorozat „Szinkronizálva” jelölést kap, és toast erősíti meg.
- **AC2 – Manuális újrapróbálás** *(Automatizálva: `tests/acceptance/sync_queue.feature`)*  
  Given a Firestore API három egymást követő próbálkozásnál hibázott  
  When: a „Szinkron újra” gombra kattintok  
  Then: új kísérlet indul, a hibáról napló készül, siker esetén „Szinkronizálva” státuszra vált.

---

### US-05: Szinkron státusz átláthatóság
*Mint felhasználó, szeretném látni mely sorozataim várnak még szinkronra, és mikor volt az utolsó sikeres felhőfeltöltés, hogy megbízhassak az adataimban.*

- **AC1 – Lista státusz jelvények**  
  Given: vegyesen vannak „Szinkron várakozik” és „Szinkronizálva” sorozataim  
  When: megnyitom a fő listát  
  Then: minden sorban jól látható jelvény jelzi a státuszt szín- és szövegkülönbséggel, tooltip magyarázattal.
- **AC2 – Utolsó szinkron ideje**  
  Given: legalább egy sikeres felhő szinkron történt  
  When: a fejléc státusz ikonra kattintok  
  Then: megjelenik az utolsó sikeres szinkron időbélyege és a függőben lévő elemek száma.
- **AC3 – Queue törlés visszaigazolással**  
  Given: a queue-ban ragadt egy hibás elem  
  When: a „Sikertelen szinkron törlése” akciót választom  
  Then: megerősítő dialógus jelenik meg, jóváhagyás után az elem törlődik és audit log rögzíti az eseményt.
