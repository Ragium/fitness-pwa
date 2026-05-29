Feature: Offline sorozat mentés
  # Scope: docs/spec/product_spec_v0.2.md (US-03), docs/stories/user_stories.md

  Background:
    Given hitelesített felhasználóként offline módban használom a FitTrackert
    And az „Új sorozat” űrlapon vagyok minden kötelező mező kitöltésével

  Scenario: Sikeres offline mentés sorba állítja a sorozatot
    When megnyomom a „Mentés offline” gombot
    Then a sorozat megjelenik a napi lista tetején
    And toast üzenet jelzi, hogy a mentés lokálisan sikerült
    And a sorozat „Szinkron várakozik” státusz jelvényt kap
