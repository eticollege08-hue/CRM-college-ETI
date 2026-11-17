## Add Project Team backend (add/remove/list)

Implemented backend API to add, remove and list employees in a project team.

- **Model** `ProjectMember` with fields `projectId`, `employeeId`, `addedBy`, `addedAt`.
- **Repository**: `addMember`, `removeMember`, `listMembers` with existence/active checks.
- **Service**: role‑based access (`OWNER`, `MANAGER` for add/remove; any authenticated user for list) and clear text responses.
- **Controller / Routes / Zod schemas** for:
    - `POST /projects/:projectId/team`
    - `DELETE /projects/:projectId/team/:employeeId`
    - `GET /projects/:projectId/team`
- **Constants** with user‑facing messages.
- **Tests** covering success, validation, permission, conflict and 404 scenarios.
- Updated Prisma schema, generated client, lint, TypeScript checks and all tests pass.

All changes follow the router → controller → service → repository architecture and project coding standards.
