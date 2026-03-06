**Therapist Profile Persistence — PR Checklist**

- **Summary**: Add `TherapistProfile` Prisma model, migration, seed updates, service persistence, and integration tests.

- **Files Changed**:
  - `prisma/schema.prisma` — add `TherapistProfile` model and relation on `User`
  - `prisma/migrations/*` — migration created by `prisma migrate dev`
  - `src/services/therapist.service.ts` — persist/read via Prisma
  - `prisma/seed.js` and `seed.js` — upsert therapist profiles for seeded users
  - `tests/therapist.profile.integration.test.ts` — integration test for profile CRUD

- **Testing**:
  - [ ] `npm run prisma:generate` and `npx prisma migrate dev` applied locally
  - [ ] Run `npm test` and ensure integration test passes
  - [ ] Manual smoke: login and GET `/api/v1/therapist/me/profile`

- **Documentation**:
  - [ ] Update API docs for therapist profile endpoints
  - [ ] Add migration notes to `IMPLEMENTATION_SUMMARY.md` if required

- **Security & Ops**:
  - [ ] Validate no sensitive data logged during seed or migration
  - [ ] Add migrations to CI pipeline

- **Follow-up tasks (separate PRs)**:
  - Add therapist profile update/partial-patch endpoints + validation
  - Add frontend form and tests for editing therapist profile
  - Add feature toggle and rollout plan if needed
