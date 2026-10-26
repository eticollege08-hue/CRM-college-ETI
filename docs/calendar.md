# Calendar and Event CRUD

## Scope

All authenticated CRM roles can read the shared calendar and create events. Only the author (the JWT UserAccount ID, not role OWNER) may update/delete an event or change its participants. Room Booking, teams, Google Meet integration, recurrence, all-day/multi-day events and general RBAC are excluded. Supported types: LEAVE, SICK_LEAVE, VACATION, TIME_OFF, MEETING.

Participants are Employee IDs, including employees without UserAccounts. The author is not automatically a participant. To occupy the author's time, explicitly include their Employee ID. At least one and at most 200 unique employees are required; the last participant cannot be removed. Adding an existing member is idempotent. PATCH participantIds replaces the entire membership list; POST participants adds to it.

## API

The canonical contract and examples are in `docs/openapi.yaml` (Swagger `/api/docs`).

| Method | Path                                                          | Purpose                                                           |
| ------ | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| GET    | /api/events?date=2026-10-26&timeZone=Europe/Kyiv              | Events overlapping a local calendar day                           |
| GET    | /api/events?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z | Events overlapping a half-open instant range                      |
| GET    | /api/events/:id                                               | Event details                                                     |
| POST   | /api/events                                                   | Create event with participants                                    |
| PATCH  | /api/events/:id                                               | Update owned event                                                |
| DELETE | /api/events/:id                                               | Delete with JSON `{ "confirmationTitle": "Exact current title" }` |
| POST   | /api/events/:id/participants                                  | Add `{ "participantIds": ["employee-uuid"] }`                     |
| DELETE | /api/events/:id/participants/:employeeId                      | Remove a participant                                              |
| GET    | /api/employees                                                | Existing authenticated employee picker API                        |
| GET    | /calendar?month=2026-10&timeZone=Europe/Kyiv                  | SSR calendar page                                                 |

Cookies use the existing HttpOnly authentication. All event writes require Origin from AUTH_ALLOWED_ORIGINS, reusing the existing origin check. Browsers send this header automatically. There is no client-controlled owner ID. Date/range query modes are mutually exclusive; from/to must both be provided, must be ordered and may span at most 366 elapsed days. Unknown query/body fields are rejected.

Create accepts type, title (trimmed, 1-200 characters), description (trimmed, 0-4000 characters), startsAt, endsAt, timeZone and participantIds. PATCH requires at least one field and validates the merged state. Delete confirmation is case-sensitive and not trimmed. Success uses `{ success: true, event/events, message? }`; delete returns JSON 200. Errors use the existing `{ success: false, message, details: [] }`, with field errors in details.

401: missing/invalid authentication or unavailable creator account; 403: non-author mutation or denied Origin; 404: missing event/employee/membership; 409: overlap or exhausted transaction retries; 422: invalid fields/range/query/confirmation. Standard parser errors remain 400/413/415. Technical failures use safe 500 responses.

## Time and concurrency

- startsAt/endsAt are ISO instants with Z or an explicit offset, at most millisecond precision. They are persisted as timestamptz(3) and returned in UTC. The IANA timeZone is stored separately; UTC is allowed, fixed-offset zone IDs are not. An input offset identifies an absolute instant, while timeZone determines the event's local day; clients must not send ambiguous offset-free wall times.
- Temporal polyfill handles local day/month boundaries and DST independently of the server's local zone. timeZone defaults to UTC for queries. SSR month defaults to the current month in that zone. Nonexistent local dates are rejected.
- startsAt must be earlier than endsAt. Events must fit within one local calendar day; an exclusive midnight end is allowed, but occupying the whole local day is not.
- Events conflict when they share any participant and `existing.startsAt < proposed.endsAt && existing.endsAt > proposed.startsAt`. Thus adjacent intervals are allowed. Conflict checks cover all event types; no author-only or role filters are applied.
- Every schedule-changing operation reads the current event/memberships, validates employees, checks overlap and writes within one Serializable database transaction. EventRepository owns transaction/retry mechanics; business checks remain in EventService. P2034 retries the entire operation up to three times. A conflict never leaves a partially modified event.

## SSR and frontend boundary

`calendar-ssr` has constants/service/controller/routes. The controller validates query parameters, loads calendar data and renders `pages/calendar.njk` with Cache-Control: no-store. The template intentionally has **zero bytes**: no grid, HTML markup, scripts or styles are included in this backend task.

Template locals: currentDate (YYYY-MM-DD), month (YYYY-MM), timeZone, range (UTC from/to), events, eventTypes, employees (id/fullName/imageId/position), css/js/activePage. These locals are not serialized to JSON in the empty HTML response; FE can later consume them in Nunjucks, while client-side data retrieval uses the API. Monthly SSR data covers the selected month; the range API can include neighboring-month days needed for a full calendar grid.

## Migration and verification

`20261026120000_add_calendar_events` adds two tables, EventType, indexes, FKs and a positive-range CHECK. Existing migrations are unchanged; no existing data is deleted. Event deletion cascades only to its memberships. Referenced Employee/UserAccount deletion is restricted to preserve event ownership/schedules. Apply normally with `prisma migrate deploy` after reviewing pending migrations; no reset or db push.

Unit tests (no real database): `npm test`, `npm run test:typecheck`, `npm run lint`, `npx tsc --noEmit`, `npm run lint:openapi`, `npm run build`.

Opt-in database/HTTP verification, with a reachable **development** PostgreSQL and DATABASE_URL:

```powershell
$env:NODE_ENV = "development"
npm run test:calendar:integration
```

This command requires permission to create/drop schemas in the dev database. It creates a verified-new, randomly named schema, applies migrations twice, starts the real app on a temporary loopback port, checks CRUD/ownership/participants, parallel creates/updates/additions, time zones and empty authenticated SSR, then removes only that test schema. It never resets or changes existing schemas. CI's `npm test` does not run this database suite.
