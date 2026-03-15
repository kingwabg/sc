# Bomcare Suite

Modern operations platform for child welfare facilities.

## Workspace

- `apps/api`: Spring Boot API for auth, dashboard, document integrations, and facility operations
- `apps/web`: Next.js web app for staff, administrators, and reporting workflows
- `docs`: architecture and product notes

## Product Direction

This project is being rebuilt from scratch for a 2026-ready stack with these priorities:

- HWP document workflows
- spreadsheet export and import
- administrator dashboards
- child welfare facility operations
- secure staff authentication

## Initial Scope

- staff login
- admin overview dashboard
- facility status cards
- HWP and spreadsheet integration center
- document approval and reporting hooks

## Local Run Targets

### API

```powershell
cd apps/api
mvn spring-boot:run
```

### Web

```powershell
cd apps/web
npm install
npm run dev
```

## Notes

- Local development defaults to mock-friendly APIs and in-memory configuration.
- Production planning should move to PostgreSQL, object storage, and externalized secrets.
