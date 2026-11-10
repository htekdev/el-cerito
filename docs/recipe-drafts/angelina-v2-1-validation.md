# Angelina 2.1 — validation evidence

## Local results, November9 2026 CT

Node24 (matching Vercel runtime):
- `node --run build`: PASS, including both new localized recipe routes.
- `node --run test:coverage`:71/71 PASS.
- Native coverage scope **only `src/lib/nutrition.ts`**:100% lines,
  branches,functions; enforced80% lines/75% branches/80% functions.
  LCOV: `coverage/lcov.info`. Not whole-project statement coverage.
- `node --run test:e2e`:8/8 PASS;4desktop and4mobile, Spanish/English.
  Video ALWAYS on; screenshots on; relevant change-proof spec exercises actual
  shipped handlers, unknown-time details/cards/JSON-LD,72→71→72,1and72
  boundaries, ingredient/grocery/nutrient restoration and existing numeric recipe.
  Reports/videos/screenshots: `playwright-report/`, `test-results/`.
  CI uploads these with coverage as `recipe-test-evidence`, retention7days.

## Public-content checks

- Seven complete source stages retained verbatim in intake; bilingual published
  steps match flat instructions exactly and reference every input.
- Original quantities/counts, aunt/Frankie attribution, versions and rounding
  preserved. Raw chicken and cooked filling separate; no extra cooked chicken
  shopping line. No invented measured oil/tortilla/aromatic/cilantro weights.
- Proven90-minute covered method distinguished from unvalidated24–25g,
  sauce15%-reduction/1:2:1, and uncovered5–10-minute experiments.
- Preparation and full cooking/elapsed durations genuinely unknown. No0min,
  guessed total or manufactured JSON-LD duration.
- Source nutritional measurements absent; published numbers explicitly PARTIAL
  estimates, with official label/generic USDA proxies, exclusions and allocation
  limitations prominent in descriptions, notes and bilingual story.
- Macros reconcile algebraically to included ingredient contributions/72.
  Only750g cooked chicken counted; reserved368g sauce excluded under disclosed
  proportional assumption. No claimed sodium, complete tracking or trial.
- All9 distinct public source URLs returned HTTP200 after fixing USDA stale
  deep links to official ID-search routes. Nutrients were fetched via USDA API,
  not inferred from the search page. FoodSafety.gov confirms165°F/74°C for
  poultry/casseroles; no timing-only safety guarantee.
- Approved generated cover1200×900 JPEG,170590bytes, copied unchanged in build;
  explicitly an illustration, not user-supplied photo or cooking evidence.
- Family version2/2.1 labels are real provenance, not generic placeholder text.
  No new “healthier” sibling, unrelated content, automation or runtime change.

## Integration limitation — not falsely represented as release proof

AWS CLI is present. `head-bucket` returned404 for BOTH configured/documented
`htekdev-e2e-results` and `rocha-e2e-videos` using the active account. Two bounded
attempts only; no bucket, credentials, policy, scheduled job or infrastructure
was created/changed. Local recordings are real and CI preserves them as artifacts,
but **no public S3 video URL is available** from those integrations.

PR/preview/required exact-HEAD recipe review and legitimate merge authority must
be verified independently. Local PASS does not establish CI, reviewer APPROVE,
merge or production publication. Never treat `auto_merge_triggered` as proof.
