# Правила роботи АІ в CRM

Цей файл діє для всього репозиторію. Перед змінами прочитай його, а потім лише файли, потрібні для задачі. Опис нижче фіксує поточну архітектуру; правила стилю задають єдиний стандарт для нового та зміненого коду.

## Швидка карта проєкту

- Стек: Node.js 24, TypeScript strict ESM, Express 5, Zod 4, Prisma 5, PostgreSQL 17, Nunjucks. Версії — package-lock.json.
- `src/app.ts` — спочатку dotenv/config, потім стандартні express.json(), cookieParser(), static, Nunjucks, API/SSR registries, errorHandler; trust proxy=false. Секрет/TTL JWT, origins, Secure і bcrypt перевіряються до listen.
- `src/modules/auth/` містить лише auth.constants.ts, auth.controller.ts, auth.routes.ts, auth.service.ts, auth.types.ts. Стандартні authService/authController; routes default export під /api/auth. Публічної реєстрації немає.
- AuthService використовує реальний userAccountService: нормалізований email, bcrypt/dummy hash, isActive, JWT userId+roleKey, оновлення lastLoginAt. Ніяких Employee-запитів/створення під час login.
- `src/modules/user-accounts/` — внутрішні service/repository; timestamp і атомарне створення Employee+UserAccount із заданою роллю для seed. Ідемпотентний seed не оновлює існуючі credentials; concurrent duplicate обробляється після відкату вкладеного write.
- `src/modules/employees/` — dev-only CRUD; створення порожнього профілю {} дозволено. Однаковий API error contract застосовується і тут.
- `src/modules/about-us/` — About Us CRUD: читання доступне всім автентифікованим ролям, зміни — лише OWNER.
  `src/modules/about-us-ssr/` рендерить About Us сторінку з усіма записами.
- `src/modules/hierarchy/` — CRUD зв'язків керівник–підлеглий (controller/service/repository); service повертає 404 для відсутніх записів/працівників і 409 для дублікатів, самопризначення та циклів. Обхід використовує getAllRelationships (лише ID), при update виключає поточний зв'язок. За погодженим винятком service керує Prisma Serializable-транзакціями create/update/delete й повторює P2034 до трьох спроб; усі перевірки й запис використовують один tx. Методи hierarchy repository та employeeRepository.getById приймають необов'язковий tx.
- `src/schemas/auth.schema.ts`, `src/schemas/jwt.schema.ts` — strict login та claims; JWT role береться з Prisma Role, типи виведені зі schema.
- `src/services/auth-rate-limit.service.ts` — спільний singleton, sliding window 5 failures/300s (env), черга email+IP. Технічні помилки не рахуються, успіх не стирає невдачі, заблоковані запити не подовжують вікно. Перезапуск скидає пам'ять, процеси не мають спільного ліміту.
- `src/middlewares/auth-origin.middleware.ts` — точний обов'язковий Origin за AUTH_ALLOWED_ORIGINS. Перевірка використовується лише в auth POST routes.
- `src/utils/auth-cookie.util.ts` — HttpOnly, SameSite=Lax, host-only, Path=/; встановлення/очищення також видаляють legacy cookie на /api. Cache-Control: no-store. Logout лише очищає cookie, не відкликає JWT.
- `src/config/jwt.config.ts` — єдине джерело TTL (JWT_EXPIRES_IN, default 3600); JWT_SECRET без default, мінімум 32 байти. `src/utils/jwt.util.ts` і isAuth перевіряють HS256, signature, expiry та claims.
- `src/middlewares/access.middleware.ts` — `accessFor(roles)` перевіряє лише `req.user.role`; без користувача або дозволеної ролі передає ApiError 403 у errorHandler. Порядок у захищеному маршруті: `isAuth, accessFor(["OWNER", "WORKER"])`.
- `src/config/auth.config.ts` — BCRYPT_COST (12), LOGIN_MAX_FAILED_ATTEMPTS (5), LOGIN_ATTEMPT_WINDOW_SECONDS (300), AUTH_COOKIE_SECURE та список origins. Secure=false тільки для development.
- `src/scripts/auth-seed.script.ts`, `src/config/seed.config.ts` — npm run db:seed створює п'ять фіксованих mock-акаунтів, по одному на кожну Prisma Role, без credentials з env. Запуск лише за NODE_ENV=development. Пароль не логувати; у БД лише bcrypt hash.
- `src/modules/auth-ssr/` — constants/service/controller/routes; GET /login рендерить pages/login.njk нульової довжини, без HTML-розмітки; дані css/js/activePage збережені. `src/modules/employees-ssr/` — існуюча employees SSR сторінка.
- `src/modules/hierarchy-ssr/` — GET /hierarchy для всіх авторизованих ролей, порожній pages/hierarchy.njk; hierarchyTree містить id/subordinates, усіх працівників без керівника та спільних підлеглих у кожній гілці їхніх керівників. SSR service збирає дерево через employeeService і hierarchyService; тести лише сервісу.
- `src/routes/api/index.ts` — /auth, /employees, /hierarchy, /docs; /hierarchy захищено isAuth: читання для всіх ролей, POST/PATCH/DELETE для OWNER/RECRUITER/HR/MANAGER. `src/routes/ssr/index.ts` — SSR registry під /.
- `docs/openapi.yaml` — єдиний контракт API, Swagger UI /api/docs; `docs/auth-integration.md` — конфігурація, seed та dev-перевірка. JSON login/logout: success і message, без JWT/строку дії.
- `src/middlewares/validate.middleware.ts` — єдина strict Zod-валідація тіла; parsed data замінюють req.body; {} вирішує schema. Невідомі поля відхиляються.
- `src/middlewares/error.middleware.ts`, `src/utils/error.util.ts`, `src/constants/api-messages.constants.ts` — один ApiError/errorHandler та `{ success: false, message, details: [] }`. Валідація 422, malformed JSON 400, oversized 413, charset/encoding 415. Сирі exceptions/SQL/секрети не логувати.
- `src/config/prisma.config.ts` — один lazy PrismaClient, log: []; під час імпорту немає підключення чи логів.
- `prisma/schema.prisma` — Employee (усі profile поля optional), UserAccount з унікальними employeeId/email, Prisma Role; SQL-міграції не переписувати.
- Auth unit-тести: `tests/auth/auth.service.test.ts`, `tests/auth/auth-rate-limit.service.test.ts`. Попередні тести CRM-102.2/Employee/UserAccount/SSR збережені.
- `src/views/` — Nunjucks; `src/public/` — static. `dist/` і `node_modules/` не редагувати.

## Команди

Виконуй з кореня проєкту. Менеджер пакетів — npm; зберігай `package-lock.json`, не додавай lock-файли інших менеджерів.

| Команда                      | Призначення / передумови                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `npm ci`                     | Встановити залежності за lock-файлом; потрібна активна версія Node.js.                    |
| `npx prisma generate`        | Оновити Prisma Client після встановлення залежностей або зміни схеми.                     |
| `npm run start:dev`          | Nodemon + tsx, стеження за `.ts` у `src`; потрібні env та доступна БД.                    |
| `npx tsc --noEmit`           | Перевірити типи без створення `dist`.                                                     |
| `npm run build`              | Компілювати TypeScript у `dist`.                                                          |
| `npm start`                  | Виконати `node dist/app.js`; див. застереження щодо ESM нижче.                            |
| `npm run docker:dev`         | Зібрати й запустити dev app + PostgreSQL; працює у foreground.                            |
| `npm run docker:dev:down`    | Зупинити dev-оточення без видалення volume.                                               |
| `npm run docker:dev:migrate` | `prisma migrate dev` у запущеному dev-контейнері; створює/застосовує міграції, змінює БД. |
| `npm run docker:prod`        | Зібрати й запустити production у background; старт застосовує `prisma migrate deploy`.    |
| `npm run docker:prod:down`   | Зупинити production-оточення без видалення volume.                                        |
| `npx prisma validate`        | Перевірити Prisma-схему; потрібен заданий `DATABASE_URL`.                                 |

Юніт-тести використовують Vitest у `dependencies`. ESLint 9 перевіряє код через `npm run lint`; Prettier форматує через `npm run format`. Не звітуй про неіснуючі перевірки. Не запускай production, міграції чи зупинку сервісів як звичайну перевірку зміни коду.

## Межі шарів і нові модулі

Потік запиту: **router → validation → asyncCatch(controller) → service → repository → Prisma**.

| Файл `src/modules/<module-name>.*.ts` | Відповідальність                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `router`                              | Шляхи, HTTP-методи, порядок middleware, експорт router за замовчуванням.                                                 |
| `controller`                          | Прочитати валідований запит, викликати service, сформувати HTTP-відповідь. Без запитів до БД і бізнес-правил.            |
| `service`                             | Бізнес-правила, перевірки існування, виклики repository, доменні помилки через `ApiError`. Без Express Request/Response. |
| `repository`                          | Prisma-запити та операції з даними. Без HTTP-відповідей і статусів.                                                      |
| `schema`                              | Zod-схеми вхідних даних. Для PATCH використай `.partial()`, якщо це відповідає вимогам.                                  |
| `types`                               | DTO через `z.infer<typeof schema>`; не дублюй поля Zod-схем вручну.                                                      |
| `constants`                           | Повторювані повідомлення та константи цього домену.                                                                      |

- Новий CRUD-модуль будуй за прикладами `example` нижче в цьому документі. Не створюй порожні файли для невикористаних шарів.
- Класи називай `<Module>Controller`, `<Module>Service`, `<Module>Repository`; експортуй також екземпляри `<module>Controller`, `<module>Service`, `<module>Repository`.
- Залежності передавай через `constructor(private readonly ... = existingInstance)`, як у прикладах нижче. Використовуй спільний PrismaClient, не створюй клієнт на кожен запит.
- Методи controller, які передаєш у router, прив'язуй через `.bind(this)` у конструкторі за поточним шаблоном.
- Підключай API-router у `src/routes/api/index.ts`; SSR-router — у `src/routes/ssr/index.ts`. Не накопичуй доменні маршрути в `app.ts`.
- Усередині модуля використовуй відносні імпорти; спільні компоненти — через наявні `#config`, `#middlewares`, `#constants`, `#schemas`, `#types`, `#utils`, `#modules`, `#routes`.
- Для нового модуля достатньо `#modules/<module>/...`; не додавай окремий alias для кожного домену без потреби.

## Єдиний стиль коду

- У новому коді: 4 пробіли, подвійні лапки, крапки з комою, завершальні коми в багаторядкових об'єктах/списках, пробіл після коми та навколо операторів. Не переформатовуй сторонні ділянки заради стилю.
- Файли — `<module>.<role>.ts`; класи/типи — PascalCase, змінні/методи — camelCase, групи констант — UPPER_SNAKE_CASE. Зберігай наявні імена публічних експортів.
- Імпорти групуй: зовнішні залежності → внутрішні aliases → відносні → `import type`; групи відділяй порожнім рядком. Для типів використовуй `import type`.
- Для внутрішніх ESM-імпортів вказуй `.js`, навіть коли джерело — `.ts`. Це стосується також `import type`. Не додавай імпортів без розширення.
- Не додавай `any`, `@ts-ignore` чи необґрунтованих `!` і `as`. Для невідомих значень використовуй `unknown` і звуження типів; типізація не замінює runtime-валідацію.
- Ідентифікатори в коді — англійською. Повідомлення користувачу зберігай мовою відповідного модуля; зараз у проєкті є українські й англійські повідомлення, не перекладай існуючі без задачі.
- Коментарі пояснюють причину або обмеження, а не переказують код. Уникай очевидних коментарів, зайвих абстракцій і створення загального helper заради одного виклику.

## Валідація та контракт API

- POST/PATCH — validateBody(schema), /:id — validateParams(uuidSchema), далі asyncCatch(controller). Дані для service беруться після Zod parsing.
- Єдина валідація без режимів і auth-залежностей: не-об'єктне/відсутнє тіло — 400; поля/UUID — 422. Порожній {} валідний, якщо це дозволяє schema, зокрема для Employee.
- Всі помилки передавати next/throw ApiError; тільки errorHandler формує JSON. API-помилки мають success=false, message, details завжди масив (field/message). Внутрішні SQL/exception.message/stack не повертати й не логувати.
- Статуси — HttpStatus. Загальні повідомлення — API_MESSAGES, auth-повідомлення — текстові рядки AUTH_MESSAGES.
- Успіх: success=true і message для create/update/delete та login/logout; читання може містити публічну entity/entities. Create — 201, решта — 200; не додавати data wrapper.
- Token, строк дії, passwordHash і credentials не включати до JSON. JWT доступний лише в HttpOnly cookie.
- express.json() працює стандартно; нестандартні parser, режими та окремі auth-error класи не додавати.

## База даних і конфігурація

- Зміни моделей починай з `prisma/schema.prisma`; зберігай SQL-міграції у `prisma/migrations`. Не переписуй уже застосовану історію міграцій.
- У документованому прикладі `Example.id` — String із UUID, створеним PostgreSQL через `gen_random_uuid()`; `createdAt` має `@default(now())` і `@map("created_at")`. Для нових аналогічних моделей дотримуйся цього підходу, якщо немає іншої вимоги.
- Для пов'язаних записів, що мають змінитися атомарно, використовуй Prisma-транзакцію в межах шару даних. Уникай небезпечного raw SQL із конкатенацією вхідних даних.
- Не використовуй `prisma db push` замість історії міграцій. Reset БД, видалення volume та руйнівні міграції потребують явного дозволу користувача.
- Назви env: `DATABASE_URL`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`; Compose також використовує `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DB`, `DATABASE_PORT`.
- `.env` ігнорується Git. Не друкуй його вміст, не додавай секрети в код, документацію чи логи. Для опису конфігурації достатньо назв змінних і безпечних placeholders.

## Відомі особливості — не витрачай час на повторне відкриття

- Стиль старих файлів змішаний; це не привід для масового форматування. Застосовуй стандарт вище до свого коду.
- `package.json#imports` спрямовані на `./src/`. Production Dockerfile замінює їх на `./dist/` у контейнері. Локальний `npm start` такої заміни не робить; успішна компіляція не гарантує успішний запуск.
- У старому коді є імпорти без `.js` (зокрема в `app.ts`) і прямі імпорти Prisma runtime. Якщо задача стосується production/ESM, перевір їх разом з aliases; для інших задач не розширюй scope автоматично.
- `import "dotenv/config"` виконується перед імпортами модулів у app/seed. Prisma підключається лише на першому запиті.
- Production Dockerfile копіює `src/views` і `src/public`; окремого етапу збірки assets немає. Порожні views/public не зберігаються Git. Перед задачею Docker-збірки перевір наявність цих каталогів.
- `errorHandler` повертає SSR-помилки як text/plain зі збереженням HTTP-статусу, без шаблону error.njk; API та запити з Accept: application/json отримують JSON.
- JWT не використовує express-session. Trust proxy=false для прямого доступу; при reverse proxy довіру налаштувати явно для реальної інфраструктури.

## Як працювати швидко та перевіряти зміни

1. Визнач модуль/шар задачі за картою вище. Почни з `rg --files src prisma` або адресного `rg -n <symbol> src`; читай лише знайдені файли й прямі залежності. Не скануй `node_modules`, `dist`, `.git`, lock-файл чи весь репозиторій без потреби.
2. Перед редагуванням перевір `git status --short`; збережи сторонні зміни. Обери найменшу зміну, що повністю вирішує задачу; не додавай залежності, фреймворки чи нові архітектурні шари без потреби.
3. Для змін JavaScript/TypeScript виконай `npm run lint`; для TypeScript також `npx tsc --noEmit`. Для змін збірки — `npm run build`; для Prisma-схеми — `npx prisma validate` і `npx prisma generate`. Перевірки без змін коду не потребують запуску БД.
4. Для зміни поведінки API перевір релевантні сценарії: успіх, неправильне тіло/id, відсутній запис. Використовуй Vitest для юніт-тестів, а перевірку HTTP/БД виконуй окремо в dev-оточенні. Не вигадуй результатів і не встановлюй тестовий стек для дрібного рефакторингу.
5. Якщо перевірка заблокована середовищем, повідом точну причину; не встановлюй інструменти й не міняй конфігурацію лише заради документаційної задачі. Повідомлення Node shim про відсутність активної версії Node.js означає проблему середовища, а не діагностику помилки коду.
6. Перед завершенням перевір diff, випадкові файли й секрети. У відповіді коротко зазнач зміни, виконані перевірки та реальні обмеження. Не повторюй повний аналіз архітектури.
7. Якщо задача змінює структуру, scripts, контракт або описані особливості, онови відповідний пункт цього `AGENTS.md`. Зберігай його коротким: правила й карта, а не журнал кожної виконаної задачі.

## ESLint, Prettier і CI

- `npm run lint` — ESLint 9 із JS/TS recommended і eslint-config-prettier. Конфіг: `eslint.config.js`; `dist`, `node_modules`, `coverage` та кеш npm виключено.
- `npm run lint:openapi` — перевіряє `docs/openapi.yaml` за правилами `redocly.yaml`. Виконується локально після змін контракту та в CI. Перевіряє структуру, посилання, використання компонентів і відповідність прикладів схемам; не замінює перевірку бізнес-вимог та FE/BE review.
- `@typescript-eslint/no-explicit-any` і `@typescript-eslint/consistent-type-imports` — errors. Використовуй `unknown` зі звуженням типів та `import type`; не вимикай правила заради проходження CI. Невикористані обов'язкові аргументи middleware позначай префіксом `_`.
- `npm run format` — Prettier із `.prettierrc`: semi true, singleQuote false, tabWidth 4, trailingComma all, printWidth 100. Виключення — у `.prettierignore`. Для локальної зміни формату можна запускати Prettier тільки для змінених файлів; не переформатовуй сторонній код без потреби.
- TypeScript зафіксовано в сумісній гілці 6.0: поточний typescript-eslint не підтримує TypeScript 7. Не обходь peer dependencies через force/legacy-peer-deps.
- CI автоматично форматує PR із гілок цього репозиторію через npm run format; після успішних перевірок комітить зміни у гілку PR. Forks, Dependabot і push у master/staging проходять лише prettier --check. Не додавай pull_request_target чи force push для обходу обмежень. Після коміту бота синхронізуй локальну гілку.
- `.github/workflows/ci.yml` запускається для push і pull request у master/staging. Кроки: Node.js 24 → npm ci → генерація Prisma → lint → типи src → типи тестів. Юніт-тести запускаються через npm test.

## Юніт-тести (Vitest)

Vitest встановлено в `dependencies` за вимогою користувача. Середовище — Node.js; конфігурація шукає тільки `tests/**/*.test.ts`. Імпортуй `describe`, `it`, `expect`, `vi` явно з `vitest`; глобальні функції вимкнені. Моки очищуються й spies відновлюються після кожного тесту.

| Що тестуємо              | Шлях                                         |
| ------------------------ | -------------------------------------------- |
| Шар доменного модуля     | `tests/<module>/<module>.<layer>.test.ts`    |
| Middleware               | `tests/middleware/<name>.middleware.test.ts` |
| Script                   | `tests/script/<name>.script.test.ts`         |
| Utils                    | `tests/utils/<name>.utils.test.ts`           |
| Інший спільний компонент | `tests/<category>/<name>.<category>.test.ts` |

Наприклад: `tests/customer/customer.service.test.ts`, `tests/customer/customer.repository.test.ts`, `tests/middleware/validate.middleware.test.ts`, `tests/script/import.script.test.ts`, `tests/utils/error.utils.test.ts`. Не розміщуй тести у `src`, не використовуй `.spec.ts` і не відновлюй демонстраційний модуль заради тестів.

| Команда                                               | Призначення                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `npm test`                                            | Одноразово запустити всі юніт-тести.                        |
| `npm run test:watch`                                  | Запустити тести у watch-режимі.                             |
| `npm test -- tests/customer/customer.service.test.ts` | Запустити конкретний файл.                                  |
| `npm run test:typecheck`                              | Перевірити типи тестів і конфігурації без генерації файлів. |

- Тестуй поведінку: успіх, граничні значення й очікувані помилки. Використовуй зрозумілі назви сценаріїв; дотримуйся порядку підготовка → дія → перевірка.
- Юніт-тести не запускають сервер, Docker, міграції та не підключаються до справжньої БД. Не імпортуй `src/app.ts`.
- Для service підміняй repository, для controller — service; для repository підміняй PrismaClient. Якщо імпорт запускає спільний PrismaClient, мокай його модуль через `vi.mock` до імпорту тестованого компонента.
- Для middleware підміняй `req`, `res`, `next`; перевіряй статус, тіло відповіді й передачу керування. Приведення типів допустимі для часткових Express/Prisma doubles у тестах; не перенось їх у production-код.
- Складні загальні fixtures/helpers додавай лише коли вони потрібні кільком тестам. Не додавай залежності coverage/UI без окремої потреби.
- Vitest виконує TypeScript без перевірки типів: після зміни тестів запускай відповідні тести та `npm run test:typecheck`; після зміни production-коду також `npx tsc --noEmit`.

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
