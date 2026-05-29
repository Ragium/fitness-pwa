[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/VSPuLl7_)
# FitTracker – Offline-First Edzésnapló PWA

Offline-first edzésnapló PWA hobby sportolóknak, amely rossz térerőben is azonnal naplóz, háttérben szinkronizál Firestore-ba, és soha nem veszít adatot.

## Fájlstruktúra
- `course.yaml`: hallgatói metaadatok és track választás (root szinten marad).
- `project_plan.md`: projekt terv a szakdolgozat beadáshoz.
- `docs/spec/prd.yaml`: a Product Requirements Document (PRD).
- `docs/spec/product_spec_v0.2.md`: vertikális szelet specifikáció.
- `docs/interviews/`: legalább **5** felhasználói interjú JSON jegyzőkönyve.
- `docs/market/competitors.csv`: legalább **3** versenytárs elemzése.
- `docs/adr/`: Architecture Decision Records.
- `docs/stories/user_stories.md`: user story-k és acceptance criteria-k.
- `docs/process/dor_dod.md`: Definition of Ready és Definition of Done.
- `docs/traceability.md`: traceability mátrix.
- `docs/ai/usage_plan.yaml`: MI-használati terv.
- `docs/ai/ai_log.jsonl`: MI-használat naplója.
- `scripts/validate.py`: helyi validátor a leadás előtt.
- `fittracker/`: Angular PWA forráskód.

## Leadási folyamat
1. Dolgozz a saját (forkolt) repository-ban, töltsd ki a `course.yaml`-t.
2. Készíts Pull Requestet (`main` ágra). A PR ugyanaz, mint a beadás.
3. A CI automatikusan lefut, és PASS / FAIL eredményt ad a követelményekre.
4. Csak a PASS státuszú PR tekinthető leadottnak.
5. Leadás előtt futtasd helyben: `python scripts/validate.py --sprint 1`.

## Definition of Done
| Tétel | Minimum elvárás | Ellenőrzés |
| --- | --- | --- |
| PRD (`docs/spec/prd.yaml`) | `problem.statement`, `target_audience`, `value_proposition`, `scope.in/out` kitöltve | YAML validáció + kulcsok (CI) |
| Interjúk (`docs/interviews/*.json`) | ≥ **5** fájl, séma szerint | JSON sémaellenőrzés (CI) |
| Versenytársak (`docs/market/competitors.csv`) | ≥ **3** sor a fejlécen túl | Sorok száma, fejléc (CI) |
| ADR (`docs/adr/*.md`) | ≥ **1** Markdown fájl | Fájl léte (CI) |
| MI dokumentáció (`docs/ai/*`) | Usage plan + napló ≥ **N** bejegyzés | Fájl léte + bejegyzésszám (CI) |
| Leadás | PR a `main` ágra, zöld CI | PASS szükséges |

## Használat
```bash
python scripts/validate.py --sprint 1
```

## License
MIT
