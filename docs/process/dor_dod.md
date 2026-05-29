# Definition of Ready (DoR) és Definition of Done (DoD)

## Definition of Ready (DoR)
- Story megfelel az INVEST elvnek; AC-k egyértelműen leírták a normál/üres/hiba állapotokat.
- Traceability frissítve a Story/AC → teszt → kód → CI összerendeléssel.
- Mockok/dummy adatok elérhetők offline teszteléshez (pl. üres lista, függő sync queue).
- Érintett feature-flag/konfiguráció dokumentálva (pl. offline mód, preview channel).

## Definition of Done (DoD)
- Unit és AC tesztek zöldek; lefedettség ≥ 60% az érintett modulokra.
- Smoke szcenáriók zöldek; offline/queue regressziók ellenőrizve.
- ADR-ek és traceability tábla frissítve az érintett Story/AC szerint.
- CI logokban terraform validate/plan futott, plan.out artefakt elmentve.
- PR leírás tartalmaz screenshot/GIF-et vagy hivatkozást a releváns wireframe-re.
- Dokumentáció frissítve: érintett README, Spec hivatkozások, DoR/DoD checklist kipipálva.
