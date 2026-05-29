# Traceability

| Story | AC | Teszt(ek) | Kód (fő) | CI lépés |
|------:|:---:|-------------------------------------------|-------------------------------------------------------------|------------------------------|
| US-02 | AC1 | tests/acceptance/empty_state.feature *(tervezett)* | fittracker/src/app/features/workouts/workouts-page.component.ts; fittracker/src/app/features/workouts/empty-state-card.component.ts | unit (npm test) |
| US-03 | AC1 | tests/acceptance/offline_save.feature *(tervezett)*; WorkoutsStoreService spec (48 unit teszt) | fittracker/src/app/core/services/workouts-store.service.ts; fittracker/src/app/core/services/sync-queue.service.ts | unit (npm test) |
| US-04 | AC1–AC2 | tests/acceptance/sync_queue.feature *(tervezett)*; SyncQueueService spec | fittracker/src/app/core/services/sync-queue.service.ts; fittracker/src/app/core/services/cloud-sync.service.ts | unit (npm test) |
| US-03 | AC1–AC3 | workouts-store.service.spec.ts: soft-delete, hardDelete, operation dispatch | fittracker/src/app/core/services/workouts-store.service.ts (deleteWorkout, hardDelete, updateWorkout) | unit (npm test) |
| US-04 | AC1–AC2 | sync-queue.service.spec.ts: create/update/delete dispatch, firestoreId tárolás | fittracker/src/app/core/services/sync-queue.service.ts; fittracker/src/app/core/services/cloud-sync.service.ts | unit (npm test) |
| — | IaC | .github/workflows/ci.yml: terraform fmt + validate + plan | infra/terraform/main.tf; infra/terraform/variables.tf | CI: terraform job (plan.out artifact) |
| — | CI/CD | .github/workflows/ci.yml: unit test + build + terraform | fittracker/src/; infra/terraform/ | CI: test + build + terraform job |

Megjegyzés: Story/AC hivatkozások a `docs/spec/product_spec_v0.2.md` és `docs/stories/user_stories.md` fájlban definiált követelményekre mutatnak. Az *(tervezett)* jelölésű acceptance tesztek Playwright E2E tesztként kerülnek implementálásra a következő lépésben. A CI pipeline (`.github/workflows/ci.yml`) minden PR-en futtatja a terraform fmt/validate/plan lépéseket és a plan.out fájlt artefaktként csatolja — ez teljesíti az ADR-0002 és DoD követelményét.
