# ADR 0002 - IaC és telepítési stratégia

## Dátum
2025-11-13

## Kontextus
A FitTracker stackje Firebase szolgáltatásokra épül (Auth, Firestore, Hosting). A sprint 2-3 célja, hogy a preview és main környezetek létrehozása ellenőrizhető, ismételhető legyen. Követelmény, hogy minden PR-ben fusson `terraform plan`, így előre látjuk, milyen infra változások történnének. Elérhető opciók: Firebase CLI-only deploy, manuális konzol használat, illetve Infra as Code megoldás (Terraform, Pulumi).

## Döntés
HashiCorp Terraformot választunk alapértelmezett IaC eszköznek. Az `infra/terraform` mappában tartjuk karban a Firebase Hosting, Firestore és Storage beállításokat. A GitHub Actions pipeline minden PR-ben futtatja a `terraform fmt`, `terraform validate`, majd `terraform plan -out=plan.out` parancsokat, és az eredmény fájlt artefaktként csatolja. Csak merge után, manuális approvallal futtatjuk a `terraform apply`-t.

## Alternatívák
- **Firebase CLI-only**  
  - *Előnyök:* egyszerű parancsok, kevés tanulási igény.  
  - *Hátrányok:* nincs változáslista (plan), nem reprodukálható több környezet, nem versionált.  
  - *Miért nem?* Nem teljesíti a sprint DoD követelményét (terraform plan), és a traceability is gyenge.
- **Pulumi (TypeScript)**  
  - *Előnyök:* TypeScript nyelvi egységesség, jobban integrálható alkalmazáskóddal.  
  - *Hátrányok:* kevesebb Firebase példa, extra runtime dependency, csapatnak nincs Pulumi tapasztalata.  
  - *Miért nem?* Rövid sprint időkeret, Terraformhoz sok kész modul és best practice elérhető.
- **Manuális konzol beállítás**  
  - *Előnyök:* gyors első setup, nincs tooling overhead.  
  - *Hátrányok:* nem auditálható, hibalehetőségekkel teli, nincs rollback.  
  - *Miért nem?* A követelmények tiltják a click-ops megközelítést.

## Következmények
### Pozitív
- Minden infra változás Git diffben követhető, könnyebb a review és a traceability.
- A plan artefakt segítségével a konzulens előre látja a módosításokat, így hamarabb derül ki egy hibás konfiguráció.
- A Terraform state GCS bucketben tárolható, így csapaton belül konzisztens nézet alakul ki.

### Negatív / Kockázatok
- Néhány Firebase erőforráshoz hiányos a Terraform provider, custom modulokra lehet szükség.
- A state kezelés hibája ütközést okozhat, ha többen futtatják az apply-t egyszerre.
- Tanulási görbe: a csapatnak meg kell ismernie a HCL szintaxist és a plan/apply workflow-t.

### Mitigációk
- GCS backend + state lock használata (`backend "gcs"`), így megelőzhető a párhuzamos apply konfliktus.
- A plan fájl review-ja kötelező, apply-t csak kijelölt maintainer futtathat.
- Az `infra/terraform/README.md` leírja a futtatási lépéseket, és `npm run tf:plan`/`npm run tf:apply` script segíti az egységes végrehajtást.
