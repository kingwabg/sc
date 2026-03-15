# Architecture

## Why this stack

- Backend: Spring Boot with Java 21, well suited for Apache POI and HWP processing libraries
- Frontend: Next.js App Router for a fast admin UX and clear route structure
- Database target: PostgreSQL in production, H2 for local bootstrapping
- Document integrations: Apache POI for spreadsheets, HWPLib-compatible integration layer for HWP

## Core domains

- Identity and access
- Facility operations
- Child case records
- Staff shift and schedule
- Document generation
- Dashboard and reporting

## Initial modules

1. Auth
2. Admin dashboard
3. Facility overview
4. Document center
5. Reporting and spreadsheet exchange

## API principles

- `/api/v1/auth/*` for login and session bootstrap
- `/api/v1/dashboard/*` for KPI and alerts
- `/api/v1/documents/*` for HWP and spreadsheet capabilities
- `/api/v1/facilities/*` for facility operations

## UI principles

- calm and trustworthy visual language
- mobile-safe but desktop-first
- fast path to urgent work
- dashboards that explain status, not just counts
