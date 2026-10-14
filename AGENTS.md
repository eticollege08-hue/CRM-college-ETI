# AI Working Rules for CRM

This file applies to the entire repository. Read it before making changes, then read only the files needed for the task. The description below records the current architecture; the style rules establish a single standard for new and modified code.

## Quick Project Map

- Stack: Node.js (Docker uses 24), TypeScript with `strict: true`, ESM (`"type": "module"`), Express 5, Zod 4, Prisma 5, PostgreSQL 17, Nunjucks, express-session. Exact installed versions are recorded in `package-lock.json`.
- `src/app.ts` — Express configuration, JSON, static files, sessions, Nunjucks, route registration, `errorHandler` registered last, and startup on `PORT` or 3000.
- `src/routes/api/index.ts` — API module registry under `/api`; registers documentation at `/docs` and dev-only employee routes at `/employees`.
- `src/modules/docs/docs.router.ts` — Swagger UI at `/api/docs`; the specification is available at `/api/docs/openapi.yaml`. Try it out is disabled until auth is implemented.
- `docs/openapi.yaml` — draft auth contract; the single source for Swagger UI. The production Dockerfile copies `docs` into the runtime image.
- Swagger auth contract: errors use `{ success: false, code, message, details }`; the token is only stored in an HttpOnly cookie, and the login JSON contains `expiresIn`. The specification describes only applicable responses; auth implementation has not yet been added.
- `src/routes/ssr/index.ts` — SSR route registry under `/`, including the employees page.
- `src/modules/employees/` — Employee CRUD API, available only when `NODE_ENV=development`.
- `src/modules/user-accounts/` — UserAccount repository and service for auth integration; no public controller or router.
- `src/modules/employees-ssr/` — employees page data service, controller, and route; the corresponding Nunjucks template is intentionally empty.
- `src/modules/` — domain modules. The demonstration module has been removed; complete examples of its seven layers are retained only below in this document.
- `src/config/prisma.config.ts` — shared PrismaClient; checks the connection and logs queries on import.
- `src/middlewares/` — `asyncCatch`, `validateBody`, `validateParams`, `errorHandler`, `isAuth` (401 UNAUTHORIZED/TOKEN_STALE with cookie clearing).
- `src/constants/http-status.constants.ts` — `HttpStatus`; `src/utils/error.util.ts` — `ApiError`.
- `src/schemas/id.schema.ts` — shared `uuidSchema`; `src/types/common.types.ts` — error types.
- `prisma/schema.prisma` — database model source; `prisma/migrations/` — SQL migration history.
- `src/views/` — `.njk` templates, including the empty employees page template; `src/public/` — css, img, js directories, currently without files.
- `tests/` — Vitest unit tests; `vitest.config.ts` — runner configuration; `tests/tsconfig.json` — separate test type checking. Tests are excluded from the production build.
- `dist/` — compilation output; do not edit. `node_modules/` — dependencies; do not edit.

## Commands

Run commands from the project root. The package manager is npm; retain `package-lock.json` and do not add lock files from other package managers.

| Command                                 | Purpose / prerequisites                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                | Install dependencies from the lock file; requires an active Node.js version.                                    |
| `npx prisma generate --allow-no-models` | Update Prisma Client after installing dependencies or changing the schema.                                      |
| `npm run start:dev`                     | Nodemon + tsx, watching `.ts` files in `src`; requires environment variables and an accessible database.        |
| `npx tsc --noEmit`                      | Check types without creating `dist`.                                                                            |
| `npm run build`                         | Compile TypeScript into `dist`.                                                                                 |
| `npm start`                             | Run `node dist/app.js`; see the ESM caveats below.                                                              |
| `npm run docker:dev`                    | Build and start the dev app + PostgreSQL in the foreground.                                                     |
| `npm run docker:dev:down`               | Stop the dev environment without deleting its volume.                                                           |
| `npm run docker:dev:migrate`            | Run `prisma migrate dev` inside the running dev container; creates/applies migrations and changes the database. |
| `npm run docker:prod`                   | Build and start production in the background; startup applies `prisma migrate deploy`.                          |
| `npm run docker:prod:down`              | Stop production without deleting its volume.                                                                    |
| `npx prisma validate`                   | Validate the Prisma schema; requires `DATABASE_URL` to be set.                                                  |

Unit tests use Vitest from `dependencies`. ESLint 9 checks code through `npm run lint`; Prettier formats through `npm run format`. Do not report checks that do not exist. Do not start production, run migrations, or stop services as routine verification of a code change.

## Layer Boundaries and New Modules

Request flow: **router → validation → asyncCatch(controller) → service → repository → Prisma**.

| File `src/modules/<module-name>.*.ts` | Responsibility                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `router`                              | Paths, HTTP methods, middleware order, and default router export.                                                      |
| `controller`                          | Read the validated request, call the service, and build the HTTP response. No database queries or business rules.      |
| `service`                             | Business rules, existence checks, repository calls, and domain errors through `ApiError`. No Express Request/Response. |
| `repository`                          | Prisma queries and data operations. No HTTP responses or statuses.                                                     |
| `schema`                              | Zod input schemas. Use `.partial()` for PATCH when appropriate to the requirements.                                    |
| `types`                               | DTOs through `z.infer<typeof schema>`; do not manually duplicate Zod schema fields.                                    |
| `constants`                           | Repeated messages and constants for this domain.                                                                       |

- Build new CRUD modules using the `example` snippets below. Do not create empty files for unused layers.
- For API modules, name classes `<Module>Controller`, `<Module>Service`, `<Module>Repository`; also export instances `<module>Controller`, `<module>Service`, `<module>Repository`. For SSR, use service/controller objects as shown below.
- Inject dependencies through `constructor(private readonly ... = existingInstance)`, as in the examples below. Use the shared PrismaClient; do not create a client per request.
- Bind controller methods passed to the router using `.bind(this)` in the constructor, following the current pattern.
- Register API routers in `src/routes/api/index.ts` and SSR routers in `src/routes/ssr/index.ts`. Do not accumulate domain routes in `app.ts`.
- Use relative imports within a module; import shared components through existing `#config`, `#middlewares`, `#constants`, `#schemas`, `#types`, `#utils`, `#modules`, `#routes` aliases.
- `#modules/<module>/...` is sufficient for a new module; do not add a separate alias for each domain without a need.

## Consistent Code Style

- For new code: 4 spaces, double quotes, semicolons, trailing commas in multiline objects/lists, and spaces after commas and around operators. Do not reformat unrelated sections solely for style.
- Files: `<module>.<role>.ts`; classes/types: PascalCase; variables/methods: camelCase; constant groups: UPPER_SNAKE_CASE. Preserve existing public export names.
- Group imports: external dependencies → internal aliases → relative imports → `import type`; separate groups with a blank line. Use `import type` for types.
- Include `.js` in internal ESM imports, even when the source is `.ts`. This also applies to `import type`. Do not add imports without extensions.
- Do not add `any`, `@ts-ignore`, or unjustified `!` and `as`. Use `unknown` and type narrowing for unknown values; typing does not replace runtime validation.
- Code identifiers must be in English. Keep user-facing messages in the language of the relevant module; the project currently contains Ukrainian and English messages. Do not translate existing messages without a task requiring it.
- Comments explain a reason or constraint rather than restating the code. Avoid obvious comments, unnecessary abstractions, and creating a shared helper for a single call.

## Validation and API Contract

- Validate POST/PATCH with `validateBody`; validate `/:id` with `validateParams(uuidSchema)` before the controller. After validation, use the data parsed by the middleware.
- Wrap asynchronous handlers with the existing `asyncCatch`, even with Express 5, to preserve a consistent approach. Do not duplicate identical try/catch blocks in every controller.
- Use statuses from `HttpStatus`. Throw expected business errors as `throw new ApiError(status, moduleMessage)` in the service; central error mapping belongs in `errorHandler`.
- Current success contract: `{ success: true, <entity> }` or `{ success: true, <entities> }`; create/update/delete also include `message`. Create returns 201; read/update/delete return 200; delete returns JSON with a message.
- Error contract: `{ success: false, message, details? }`; validation `details` contain `{ field, message }`. Do not introduce a `data` wrapper, different field names, or 204 for existing endpoints without an explicit task.
- `validateBody` rejects an empty body and directly returns JSON for schema errors; `validateParams` also returns JSON. `errorHandler` supports JSON/SSR and Prisma codes P2002, P2003, P2025, P2000, P2005, P2006. Account for this when changing error handling.
- Do not pass an unvalidated body directly to Prisma. Return only public fields for new models; passwords, tokens, and internal secrets must not enter responses.

## Database and Configuration

- Start model changes in `prisma/schema.prisma`; retain SQL migrations in `prisma/migrations`. Do not rewrite already applied migration history.
- In the documented example, `Example.id` is a String containing a UUID generated by PostgreSQL through `gen_random_uuid()`; `createdAt` uses `@default(now())` and `@map("created_at")`. Follow this approach for similar new models unless requirements differ.
- Use a Prisma transaction within the data layer for related records that must change atomically. Avoid unsafe raw SQL built by concatenating input data.
- Do not use `prisma db push` instead of migration history. Database resets, volume deletion, and destructive migrations require explicit user authorization.
- JWT uses `JWT_SECRET` and `JWT_EXPIRES_IN`; expiration is specified as a positive integer number of seconds (3600 for one hour).
- Environment variable names: `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`; Compose also uses `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DB`, `DATABASE_PORT`.
- `.env` is ignored by Git. Do not print its contents or add secrets to code, documentation, or logs. Variable names and safe placeholders are sufficient for configuration documentation.

## Known Caveats — Avoid Repeated Discovery

- Older files have mixed styles; this is not a reason for bulk formatting. Apply the standard above to your code.
- `package.json#imports` points to `./src/`. The production Dockerfile rewrites these paths to `./dist/` inside the container. Local `npm start` does not perform this rewrite; successful compilation does not guarantee successful startup.
- Older code contains imports without `.js` (notably in `app.ts`) and direct Prisma runtime imports. For production/ESM tasks, check them together with aliases; do not automatically expand scope for other tasks.
- `dotenv.config()` is called in `app.ts` after static imports; Prisma initializes on import. For local startup, check that `DATABASE_URL` is available at initialization time. Compose supplies it through the environment.
- The production Dockerfile copies `src/views` and `src/public`; there is no separate asset build step. Git does not retain empty views/public directories. Check that these directories exist before working on Docker builds.
- `errorHandler` renders the SSR template `error`, which does not currently exist. Having Nunjucks configured does not mean SSR is complete.
- Sessions use the default express-session store; secure cookies are enabled in production, and `trust proxy` is 1. Do not treat the current configuration as a finished, scalable auth solution.

## Efficient Workflow and Verification

1. Identify the task's module/layer using the map above. Start with `rg --files src prisma` or a targeted `rg -n <symbol> src`; read only matched files and direct dependencies. Do not scan `node_modules`, `dist`, `.git`, the lock file, or the entire repository without a need.
2. Check `git status --short` before editing; preserve unrelated changes. Choose the smallest change that fully solves the task; do not add dependencies, frameworks, or architectural layers without a need.
3. For JavaScript/TypeScript changes, run `npm run lint`; for TypeScript, also run `npx tsc --noEmit`. For build changes, run `npm run build`; for Prisma schema changes, run `npx prisma validate` and `npx prisma generate --allow-no-models`. Checks without code changes do not require starting a database.
4. For API behavior changes, check relevant scenarios: success, invalid body/id, and a missing record. Use Vitest for unit tests; perform HTTP/database checks separately in the dev environment. Do not invent results or install a testing stack for minor refactoring.
5. If the environment blocks a check, report the exact reason; do not install tools or change configuration solely for a documentation task. A Node shim message about a missing active Node.js version indicates an environment issue, not a code diagnostic.
6. Before finishing, review the diff, accidental files, and secrets. Briefly state changes, performed checks, and actual limitations in the response. Do not repeat the full architecture analysis.
7. If a task changes the structure, scripts, contract, or documented caveats, update the relevant part of this `AGENTS.md`. Keep it concise: rules and a map, not a journal of every completed task.

## Definition of Done for PRs

- Develop each feature on a separate working branch. Keep the feature's commits on that branch and integrate completed work through a PR.
- Once the work is complete, create a PR and assign a reviewer. If you do not know who should review it, ask the developer or team in chat before creating the PR; do not choose a reviewer arbitrarily.
- Check the actual CI result for the latest PR revision, including any formatting commit or review fixes. Confirm that all required checks passed; do not treat pending, skipped, cancelled, or failed checks as successful. Report failures or checks that require attention before considering the PR ready to merge.
- Use `.github/pull_request_template.md` for every PR you create or update: problem and outcome, actual checks, DoD, risks, and exceptions. Include the template explicitly when supplying a PR description through CLI/API.
- Mark DoD items only on the basis of performed checks. Explain "not applicable" for irrelevant items; leave blocked checks unchecked and describe the reason. Do not add unnecessary tests or start a database for documentation changes.
- Before a PR is ready to merge, review the final diff and current CI after the formatting commit. Do not treat the checklist as an automated check: CI performs technical checks; the author and reviewer confirm the rest.

## ESLint, Prettier, and CI

- `npm run lint` — ESLint 9 with JS/TS recommended and eslint-config-prettier. Configuration: `eslint.config.js`; `dist`, `node_modules`, `coverage`, and the npm cache are excluded.
- `npm run lint:openapi` — checks `docs/openapi.yaml` against `redocly.yaml`. Run it locally after contract changes and in CI. It checks structure, references, component usage, and example/schema consistency; it does not replace business requirements validation or FE/BE review.
- `@typescript-eslint/no-explicit-any` and `@typescript-eslint/consistent-type-imports` are errors. Use `unknown` with narrowing and `import type`; do not disable rules to pass CI. Prefix unused required middleware arguments with `_`.
- `npm run format` — Prettier with `.prettierrc`: semi true, singleQuote false, tabWidth 4, trailingComma all, printWidth 100. Exclusions are in `.prettierignore`. You may run Prettier only on changed files for a local formatting change; do not reformat unrelated code without a need.
- TypeScript is pinned to the compatible 6.0 release line: the current typescript-eslint does not support TypeScript 7. Do not bypass peer dependencies through force/legacy-peer-deps.
- CI automatically formats PRs from branches in this repository through npm run format; after successful checks it commits changes to the PR branch. Forks, Dependabot, and pushes to master/staging only run prettier --check. Do not add pull_request_target or force pushes to bypass restrictions. Synchronize your local branch after the bot's commit.
- `.github/workflows/ci.yml` runs on push and pull request to master/staging. Steps: Node.js 24 → npm ci → Prisma generation → lint → src types → test types. Unit tests run through npm test.

## Unit Tests (Vitest)

Vitest is installed in `dependencies` at the user's request. The environment is Node.js; the configuration searches only `tests/**/*.test.ts`. Explicitly import `describe`, `it`, `expect`, `vi` from `vitest`; globals are disabled. Mocks are cleared and spies restored after each test.

| Test target            | Path                                         |
| ---------------------- | -------------------------------------------- |
| Domain module layer    | `tests/<module>/<module>.<layer>.test.ts`    |
| Middleware             | `tests/middleware/<name>.middleware.test.ts` |
| Script                 | `tests/script/<name>.script.test.ts`         |
| Utils                  | `tests/utils/<name>.utils.test.ts`           |
| Other shared component | `tests/<category>/<name>.<category>.test.ts` |

Examples: `tests/customer/customer.service.test.ts`, `tests/customer/customer.repository.test.ts`, `tests/middleware/validate.middleware.test.ts`, `tests/script/import.script.test.ts`, `tests/utils/error.utils.test.ts`. Do not put tests in `src`, use `.spec.ts`, or restore the demonstration module for testing.

| Command                                               | Purpose                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `npm test`                                            | Run all unit tests once.                                         |
| `npm run test:watch`                                  | Run tests in watch mode.                                         |
| `npm test -- tests/customer/customer.service.test.ts` | Run a specific file.                                             |
| `npm run test:typecheck`                              | Check types of tests and configuration without generating files. |

- Test behavior: success, boundary values, and expected errors. Use clear scenario names and follow arrange → act → assert.
- Unit tests do not start the server, Docker, migrations, or connect to a real database. Do not import `src/app.ts`.
- Mock the repository for service tests, the service for controller tests, and PrismaClient for repository tests. If an import initializes the shared PrismaClient, mock its module with `vi.mock` before importing the component under test.
- For middleware, mock `req`, `res`, `next`; verify status, response body, and control flow. Type assertions are acceptable for partial Express/Prisma test doubles; do not transfer them into production code.
- Add complex shared fixtures/helpers only when multiple tests need them. Do not add coverage/UI dependencies without a specific need.
- Vitest executes TypeScript without type checking: after test changes, run relevant tests and `npm run test:typecheck`; after production code changes, also run `npx tsc --noEmit`.

## SSR Module Structure

An SSR module assembles page data from domain services and renders Nunjucks templates. It consists of four files:

```text
src/modules/ssr/
├── ssr.constants.ts
├── ssr.service.ts
├── ssr.controller.ts
└── ssr.routes.ts
```

Flow: **routes → asyncCatch(controller) → params/query validation → SSR service → domain services → render**. SSR does not need a separate repository: database access is already encapsulated in domain modules.

| File         | What to write                                                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants`  | `PAGE_PATH` with template paths and `PAGE_DATA` with `css`, `js`, `activePage` for each page.                                                                                             |
| `service`    | The `ssrService` object: one method per page, domain service calls, payload returns, and pagination calculations. No Express, render, or direct Prisma queries.                           |
| `controller` | The `ssrMainController` object: validates params/query, calls the corresponding SSR service method, renders `PAGE_PATH.KEY` with `{ ...PAGE_DATA.KEY, ...payload }`. No database queries. |
| `routes`     | Express Router, page URLs, each asynchronous controller wrapped with `asyncCatch`, and a default export.                                                                                  |

### Short Instructions for AI

- For each page, add the same key to `PAGE_PATH` and `PAGE_DATA`, a service/controller method, and a route in `ssr.routes.ts`. Check consistency across all five locations; do not accidentally copy another page's service call.
- Always write `.njk` paths as **`pages/<name>`**: `PAGE_PATH.HOME = "pages/home"` corresponds to `src/views/pages/home.njk`. In `res.render`, use the constant without `.njk`, without `src/views/`, and without a leading `/`. Page URLs and template paths are different values.
- `css` and `js` are resource names used by the template; `activePage` is the active navigation item key. A detail page may share its parent's activePage. Do not add an asset builder: resources live in `src/public`.
- Independent queries may use `Promise.all`. Pass only required public data to the template; do not log the full payload or pass tokens/passwords.
- Validate params and query using Zod schemas before the service call. Reuse domain schemas; for SSR pagination, validate positive integer page/limit and cap limit. Do not use `Number(req.query.page)` or `as string` instead of validation.
- `currentPage` must match the page used for offset. Preserve filters in paginationQuery through `URLSearchParams`; forward missing-record errors through asyncCatch to the shared errorHandler.
- Register the module in `src/routes/ssr/index.ts`: import `#modules/ssr/ssr.routes.js` and call `router.use("/", ssrRoutes)`. `app.ts` already mounts the SSR registry under `/`.
- For SSR, use service/controller objects as shown below, without `this`; this pattern does not require `.bind(this)`. The middleware alias in this project is **`#middlewares`**, not `#middleware`.
- Place tests in `tests/ssr/ssr.service.test.ts`, `tests/ssr/ssr.controller.test.ts`, `tests/ssr/ssr.routes.test.ts`: mock domain services and verify the render path, payload, validation, and pagination without a database.

Example short prompts for AI:

- "Create an SSR module with constants, service, controller, routes for pages [list]. Templates: pages/[names]; data comes from [domain services]."
- "Add page [name] to SSR: PAGE_PATH/PAGE_DATA, service/controller, GET [URL], template pages/[name]."
- "Add pagination to SSR page [name]: Zod page/limit validation, count/getPaginated, currentPage, pagesQuantity, and preserved filters in links."

### Examples of the Four SSR Files

In this example, IDs have type string after UUID validation at the HTTP boundary. The domain announcementsQuerySchema must return page/limit as positive integers (limit ≤ 100) and projectId as an array of UUID strings, defaulting to []; verify this when connecting the dependency.

This is a documentation example based on the provided sample: the listed domain modules and templates do not necessarily exist in CRM. Check actual exports and dependency signatures when implementing it. Do not automatically create these pages because the example exists.

### ssr.constants.ts

```ts
export const PAGE_PATH = {
    HOME: "pages/home",
    ABOUT_US: "pages/about-us",
    SERVICES: "pages/services",
    TEAM: "pages/team",
    DONATES: "pages/donates",
    DONATES_DETAILS: "pages/donate",
    ANNOUNCEMENTS: "pages/announcements",
    ANNOUNCEMENTS_ONE: "pages/announcements-one",
    USEFUL: "pages/useful",
    REG_VETERANS: "pages/reg-veterans",
    REG_VOLUNTEERS: "pages/reg-volunteers",
    REPORTS: "pages/reports",
    REPORTS_ONE: "pages/reports-one",
    SHOP: "pages/shop",
    SHOP_ONE: "pages/shop-one",
};

export const PAGE_DATA = {
    HOME: { css: "home", js: "home", activePage: "home" },
    ABOUT_US: { css: "about-us", js: "about-us", activePage: "about-us" },
    SERVICES: { css: "services", js: "services", activePage: "directions" },
    TEAM: { css: "team", js: "team", activePage: "team" },
    DONATES: { css: "donate", js: "donate", activePage: "donate" },
    DONATES_DETAILS: {
        css: "donates-details",
        js: "donates-details",
        activePage: "donate",
    },
    ANNOUNCEMENTS: {
        css: "announcements",
        js: "announcements",
        activePage: "announcements",
    },
    ANNOUNCEMENTS_ONE: {
        css: "announcements-one",
        js: "announcements-one",
        activePage: "announcements",
    },
    USEFUL: { css: "useful", js: "useful", activePage: "useful" },
    REG_VOLUNTEERS: {
        css: "reg-volunteers",
        js: "reg-volunteers",
        activePage: "registrations",
    },
    REG_VETERANS: {
        css: "reg-veterans",
        js: "reg-veterans",
        activePage: "registrations",
    },
    REPORTS: { css: "reports", js: "reports", activePage: "reports" },
    REPORTS_ONE: { css: "reports-one", js: "reports-one", activePage: "reports" },
    SHOP: { css: "shop", js: "shop", activePage: "shop" },
    SHOP_ONE: { css: "shop-one", js: "shop-one", activePage: "shop" },
};
```

### ssr.service.ts

```ts
import { contactsService } from "#modules/contacts/contacts.service.js";
import { aboutUsService } from "#modules/about-us/aboutUs.service.js";
import { valuesService } from "#modules/values/values.service.js";
import { faqService } from "#modules/faq/faq.service.js";
import { feedbackService } from "#modules/feedback/feedback.service.js";
import { partnersService } from "#modules/partners/partners.service.js";
import { servicesService } from "#modules/services/services.service.js";
import { teamService } from "#modules/team/team.service.js";
import { fundraisersService } from "#modules/fundraisers/fundraisers.service.js";
import { fundraisersDetailsService } from "#modules/fundraisers-details/fundraisers-details.service.js";
import { announcementsService } from "#modules/announcements/announcements.service.js";
import { usefulCategoriesService } from "#modules/useful-categories/useful-categories.service.js";
import { registrationsService } from "#modules/registrations/registrations.service.js";
import { reportsService } from "#modules/reports/reports.service.js";
import { projectsService } from "#modules/projects/projects.service.js";
import { productsService } from "#modules/products/products.service.js";

export const ssrService = {
    async home() {
        const contacts = await contactsService.getAll();
        const projects = await projectsService.getAll();

        return { contacts, projects };
    },

    async aboutUs() {
        const contacts = await contactsService.getAll();
        const aboutUs = await aboutUsService.get();
        const values = await valuesService.getAll();
        const faq = await faqService.getAll();
        const feedback = await feedbackService.getAll();
        const partners = await partnersService.getAll();
        const products = await productsService.getAll();

        return { contacts, aboutUs, values, faq, feedback, partners, products };
    },

    async services() {
        const services = await servicesService.getAll();
        const contacts = await contactsService.getAll();

        return { services, contacts };
    },

    async team() {
        const team = await teamService.getAll();
        const contacts = await contactsService.getAll();

        return { team, contacts };
    },

    async donates() {
        const donates = await fundraisersService.getAll();
        const contacts = await contactsService.getAll();

        return { donates, contacts };
    },

    async donatesDetails(fundraiseId: string) {
        const jar = await fundraisersDetailsService.getJar(fundraiseId);
        const requisites = await fundraisersDetailsService.getRequisites(fundraiseId);
        const contacts = await contactsService.getAll();

        return { jar, requisites, contacts };
    },

    async announcements(page = 1, limit = 4, projectIds: string[] = []) {
        const safeLimit = limit > 0 ? limit : 4;
        const safePage = page > 0 ? page : 1;

        const totalAnnouncements = await announcementsService.count(projectIds);
        const pagesQuantity = Math.ceil(totalAnnouncements / safeLimit);

        const offset = (safePage - 1) * safeLimit;

        const [announcements, contacts] = await Promise.all([
            announcementsService.getPaginated({ offset, limit: safeLimit, projectIds }),
            contactsService.getAll(),
        ]);

        const currentPage = safePage;
        const paginationParams = new URLSearchParams({ limit: String(safeLimit) });
        projectIds.forEach((id) => paginationParams.append("projectId", id));
        const paginationQuery = `&${paginationParams.toString()}`;

        return { pagesQuantity, currentPage, announcements, contacts, projectIds, paginationQuery };
    },

    async announcementsOne(id: string) {
        const announcement = await announcementsService.getById(id);
        const contacts = await contactsService.getAll();

        return { announcement, contacts };
    },

    async useful() {
        const useful = await usefulCategoriesService.getAll();
        const contacts = await contactsService.getAll();

        return { useful, contacts };
    },

    async regVolunteers() {
        const links = await registrationsService.get();
        const contacts = await contactsService.getAll();

        return { links, contacts };
    },

    async regVeterans() {
        const links = await registrationsService.get();
        const contacts = await contactsService.getAll();

        return { links, contacts };
    },

    async reports(page = 1, limit = 4) {
        const safeLimit = limit > 0 ? limit : 4;
        const safePage = page > 0 ? page : 1;

        const totalReports = await reportsService.count();
        const pagesQuantity = Math.ceil(totalReports / safeLimit);

        const offset = (safePage - 1) * safeLimit;

        const [reports, contacts] = await Promise.all([
            reportsService.getPaginated({ offset, limit: safeLimit }),
            contactsService.getAll(),
        ]);

        const currentPage = safePage;

        return { pagesQuantity, currentPage, reports, contacts };
    },

    async reportsOne(id: string) {
        const report = await reportsService.getById(id);
        const contacts = await contactsService.getAll();

        return { report, contacts };
    },

    async shop() {
        const products = await productsService.getAll();
        const contacts = await contactsService.getAll();

        return { products, contacts };
    },

    async shopOne(id: string) {
        const product = await productsService.getById(id);
        const contacts = await contactsService.getAll();

        return { product, contacts };
    },
};
```

### ssr.controller.ts

```ts
import { z } from "zod";

import { announcementsQuerySchema } from "#modules/announcements/announcements.schema.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { PAGE_PATH, PAGE_DATA } from "./ssr.constants.js";
import { ssrService } from "./ssr.service.js";

import type { Request, Response } from "express";

const reportsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(4),
});

const render = (path: string, payload: object, res: Response) => {
    res.render(path, payload);
};

export const ssrMainController = {
    async home(_req: Request, res: Response) {
        const payload = await ssrService.home();
        render(PAGE_PATH.HOME, { ...PAGE_DATA.HOME, ...payload }, res);
    },

    async aboutUs(_req: Request, res: Response) {
        const payload = await ssrService.aboutUs();
        render(PAGE_PATH.ABOUT_US, { ...PAGE_DATA.ABOUT_US, ...payload }, res);
    },

    async services(_req: Request, res: Response) {
        const payload = await ssrService.services();
        render(PAGE_PATH.SERVICES, { ...PAGE_DATA.SERVICES, ...payload }, res);
    },

    async team(_req: Request, res: Response) {
        const payload = await ssrService.team();
        render(PAGE_PATH.TEAM, { ...PAGE_DATA.TEAM, ...payload }, res);
    },

    async donates(_req: Request, res: Response) {
        const payload = await ssrService.donates();
        render(PAGE_PATH.DONATES, { ...PAGE_DATA.DONATES, ...payload }, res);
    },

    async donatesDetails(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const payload = await ssrService.donatesDetails(id);
        render(PAGE_PATH.DONATES_DETAILS, { ...PAGE_DATA.DONATES_DETAILS, ...payload }, res);
    },

    async announcements(req: Request, res: Response) {
        const { projectId: projectIds, page, limit } = announcementsQuerySchema.parse(req.query);
        const payload = await ssrService.announcements(page, limit, projectIds);
        render(PAGE_PATH.ANNOUNCEMENTS, { ...PAGE_DATA.ANNOUNCEMENTS, ...payload }, res);
    },

    async announcementOne(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const payload = await ssrService.announcementsOne(id);
        render(PAGE_PATH.ANNOUNCEMENTS_ONE, { ...PAGE_DATA.ANNOUNCEMENTS_ONE, ...payload }, res);
    },

    async useful(_req: Request, res: Response) {
        const payload = await ssrService.useful();
        render(PAGE_PATH.USEFUL, { ...PAGE_DATA.USEFUL, ...payload }, res);
    },

    async regVolunteers(_req: Request, res: Response) {
        const payload = await ssrService.regVolunteers();
        render(PAGE_PATH.REG_VOLUNTEERS, { ...PAGE_DATA.REG_VOLUNTEERS, ...payload }, res);
    },

    async regVeterans(_req: Request, res: Response) {
        const payload = await ssrService.regVeterans();
        render(PAGE_PATH.REG_VETERANS, { ...PAGE_DATA.REG_VETERANS, ...payload }, res);
    },

    async reports(req: Request, res: Response) {
        const { page, limit } = reportsQuerySchema.parse(req.query);
        const payload = await ssrService.reports(page, limit);
        render(PAGE_PATH.REPORTS, { ...PAGE_DATA.REPORTS, ...payload }, res);
    },

    async reportsOne(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const payload = await ssrService.reportsOne(id);
        render(PAGE_PATH.REPORTS_ONE, { ...PAGE_DATA.REPORTS_ONE, ...payload }, res);
    },

    async shop(_req: Request, res: Response) {
        const payload = await ssrService.shop();
        render(PAGE_PATH.SHOP, { ...PAGE_DATA.SHOP, ...payload }, res);
    },

    async shopOne(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const payload = await ssrService.shopOne(id);
        render(PAGE_PATH.SHOP_ONE, { ...PAGE_DATA.SHOP_ONE, ...payload }, res);
    },
};
```

### ssr.routes.ts

```ts
import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { ssrMainController } from "./ssr.controller.js";

const router = Router();

router.get("/", asyncCatch(ssrMainController.home));
router.get("/about-us", asyncCatch(ssrMainController.aboutUs));
router.get("/services", asyncCatch(ssrMainController.services));
router.get("/team", asyncCatch(ssrMainController.team));
router.get("/donate", asyncCatch(ssrMainController.donates));
router.get("/donate/:id", asyncCatch(ssrMainController.donatesDetails));
router.get("/announcements", asyncCatch(ssrMainController.announcements));
router.get("/announcements/:id", asyncCatch(ssrMainController.announcementOne));
router.get("/useful", asyncCatch(ssrMainController.useful));
router.get("/registration/volunteers", asyncCatch(ssrMainController.regVolunteers));
router.get("/registration/veterans", asyncCatch(ssrMainController.regVeterans));
router.get("/reports", asyncCatch(ssrMainController.reports));
router.get("/reports/:id", asyncCatch(ssrMainController.reportsOne));
router.get("/shop", asyncCatch(ssrMainController.shop));
router.get("/shop/:id", asyncCatch(ssrMainController.shopOne));

export default router;
```

## Complete Code Examples of the example Module

The complete code for each layer is shown below. This is a learning snapshot of the removed module; do not create its files, routes , or model without an explicit user task. Follow the style rules above in new code, including .js extensions in internal imports.

### example.repository.ts

```ts
import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { UUID } from "node:crypto";
import type { ExampleCreateInput, ExampleUpdateInput } from "./example.types";

export class ExampleRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: ExampleCreateInput) {
        return await this.db.example.create({ data });
    }

    async update(id: UUID, data: ExampleUpdateInput) {
        return await this.db.example.update({
            where: { id },
            data,
        });
    }

    async delete(id: UUID) {
        return await this.db.example.delete({
            where: { id },
        });
    }

    async getAll() {
        return await this.db.example.findMany();
    }

    async getById(id: UUID) {
        return await this.db.example.findUnique({
            where: { id },
        });
    }
}

export const exampleRepository = new ExampleRepository();
```

### example.service.ts

```ts
import { exampleRepository, ExampleRepository } from "./example.repository.js";
import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { EXAMPLE_FAILURE_MESSAGES } from "./example.constants.js";

import type { UUID } from "node:crypto";
import type { ExampleCreateInput, ExampleUpdateInput } from "./example.types.js";

export class ExampleService {
    constructor(private readonly repository: ExampleRepository = exampleRepository) {}

    async create(data: ExampleCreateInput) {
        return await this.repository.create(data);
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: UUID) {
        const item = await this.repository.getById(id);
        if (!item) {
            throw new ApiError(HttpStatus.NOT_FOUND, EXAMPLE_FAILURE_MESSAGES.NOT_FOUND);
        }

        return item;
    }

    async update(id: UUID, data: ExampleUpdateInput) {
        const isExist = await this.repository.getById(id);
        if (!isExist) {
            throw new ApiError(HttpStatus.NOT_FOUND, EXAMPLE_FAILURE_MESSAGES.NOT_FOUND);
        }

        return await this.repository.update(id, data);
    }

    async delete(id: UUID) {
        const isExist = await this.repository.getById(id);
        if (!isExist) {
            throw new ApiError(HttpStatus.NOT_FOUND, EXAMPLE_FAILURE_MESSAGES.NOT_FOUND);
        }

        return await this.repository.delete(id);
    }
}

export const exampleService = new ExampleService();
```

### example.controller.ts

```ts
import { exampleService, ExampleService } from "./example.service.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { EXAMPLE_SUCCESSFUL_MESSAGES } from "./example.constants.js";

import type { Request, Response } from "express";
import type { UUID } from "node:crypto";

export class ExampleController {
    constructor(private readonly service: ExampleService = exampleService) {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req: Request, res: Response) {
        const example = await this.service.create(req.body);

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: EXAMPLE_SUCCESSFUL_MESSAGES.CREATED,
            example,
        });
    }

    async getAll(req: Request, res: Response) {
        const examples = await this.service.getAll();

        res.status(HttpStatus.OK).json({
            success: true,
            examples,
        });
    }

    async getById(req: Request, res: Response) {
        const { id } = req.params as { id: UUID };
        const example = await this.service.getById(id);

        res.status(HttpStatus.OK).json({
            success: true,
            example,
        });
    }

    async update(req: Request, res: Response) {
        const { id } = req.params as { id: UUID };
        const example = await this.service.update(id, req.body);

        res.status(HttpStatus.OK).json({
            success: true,
            message: EXAMPLE_SUCCESSFUL_MESSAGES.UPDATED,
            example,
        });
    }

    async delete(req: Request, res: Response) {
        const { id } = req.params as { id: UUID };
        await this.service.delete(id);

        res.status(HttpStatus.OK).json({
            success: true,
            message: EXAMPLE_SUCCESSFUL_MESSAGES.DELETED,
        });
    }
}

export const exampleController = new ExampleController();
```

### example.router.ts

```ts
import express from "express";
import { exampleController } from "./example.controller.js";
import { exampleCreateSchema, exampleUpdateSchema } from "./example.schema.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { validateBody, validateParams } from "../../middlewares/validate.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

const router = express.Router();

router.get("/", asyncCatch(exampleController.getAll));
router.get("/:id", validateParams(uuidSchema), asyncCatch(exampleController.getById));

router.post("/", validateBody(exampleCreateSchema), asyncCatch(exampleController.create));

router.patch(
    "/:id",
    validateParams(uuidSchema),
    validateBody(exampleUpdateSchema),
    asyncCatch(exampleController.update),
);

router.delete("/:id", validateParams(uuidSchema), asyncCatch(exampleController.delete));

export default router;
```

### example.schema.ts

```ts
import { z } from "zod";

export const exampleCreateSchema = z.object({
    name: z.string().min(1, "Name must have at least 1 character"),
    description: z.string().min(1, "Description must have at least 1 character"),
});

export const exampleUpdateSchema = exampleCreateSchema.partial();
```

### example.types.ts

```ts
import { z } from "zod";
import { exampleCreateSchema, exampleUpdateSchema } from "./example.schema";

export type ExampleCreateInput = z.infer<typeof exampleCreateSchema>;
export type ExampleUpdateInput = z.infer<typeof exampleUpdateSchema>;
```

### example.constants.ts

```ts
export const EXAMPLE_FAILURE_MESSAGES = {
    NOT_FOUND: "Example not found",
};

export const EXAMPLE_SUCCESSFUL_MESSAGES = {
    CREATED: "Example was created",
    UPDATED: "Example was updated",
    DELETED: "Example was deleted",
};
```

## Removal of the Demonstration Table from an Existing Database

The module, its alias, Prisma model, and both demonstration migrations were removed from the repository at the user's explicit request. The schema currently has no models, so Prisma Client generation requires `--allow-no-models`. The examples above exist only as documentation.
