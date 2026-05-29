Feature: Szinkron sor visszaállítása
  # Scope: docs/spec/product_spec_v0.2.md (US-04), docs/stories/user_stories.md

  Background:
    Given legalább egy sorozatom „Szinkron várakozik” státusszal szerepel a listában

  Scenario: Automatikus szinkron sikerül a hálózat visszatérésekor
    Given a készülék visszanyeri az internetkapcsolatot
    When a háttér worker újrapróbálja a függő szinkront
    Then a sorozat státusza „Szinkronizálva”-ra vált
    And toast üzenet jelzi, hogy a szinkron befejeződött
    And a függő queue számláló csökken

  Scenario: Manuális újrapróbálás ismétlődő API hibák után
    Given a Firestore API három egymást követő próbálkozásnál hibát adott vissza
    When a „Szinkron újra” gombra kattintok annál a sornál
    Then új szinkronkísérlet indul
    And ha az API sikerrel válaszol, a sorozat „Szinkronizálva” státuszra vált
    And a hibalog rögzíti a korábbi kudarcokat és a manuális retry metaadatait
