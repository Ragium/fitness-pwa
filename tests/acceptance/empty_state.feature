Feature: Üres állapot eligazít
  # Scope: docs/spec/product_spec_v0.2.md (US-02), docs/stories/user_stories.md

  Background:
    Given nincs elmentett edzésem a készüléken
    And internetkapcsolat nélkül indítom a FitTrackert

  Scenario: CTA megnyitja az offline űrlapot
    When a „Új sorozat hozzáadása” gombra kattintok az üres állapot kártyán
    Then megjelenik az űrlap minden kötelező mező jelölésével
    And a fókusz a „Gyakorlat” mezőre kerül
