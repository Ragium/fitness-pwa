# Terraform IaC

This module tracks the minimum deployable unit for the FitTracker frontend: a Firebase
Hosting site with a preview channel that mirrors the Sprint smoke environment.

## Layout

- `providers.tf` – locks Terraform `>=1.5` and the `hashicorp/local` provider.
- `variables.tf` – parameters for Firebase project, Hosting site id, preview channel,
  smoke base URL and the build/deploy commands that CI executes.
- `main.tf` – materialises the metadata into `generated/hosting-preview.json` so the
  CI artifacts describe exactly what has to be deployed.
- `generated/.gitkeep` – keeps the working folder in git while letting Terraform
  drop the manifest + `plan.out` without dirtying the repo.

## Usage

```bash
cd infra/terraform
terraform init
terraform validate
terraform plan -out=plan.out \
  -var="project_id=<firebase-project>" \
  -var="hosting_site_id=<hosting-site>" \
  -var="preview_channel=preview"
```

The pipeline uploads `plan.out` as an artifact – only after reviewer approval do we
run `terraform apply plan.out` locally or from a secured environment. Never commit
state files, credentials or the generated manifest; all of those paths are ignored
via the repo-level `.gitignore`.
