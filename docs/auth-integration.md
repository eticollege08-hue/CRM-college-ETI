# CRM-109: prepared authentication module

Поки відсутні таблиці в БД та модуль юзерів. JWT із CRM-102.2 уже інтегровано: `new AuthService(accounts)` використовує справжній JWT issuer, а `createAuthRouter(service)` — middleware `isAuth` і cookie-parser. Production-router ще не підключений до `/api`, оскільки немає реального UserAccount adapter.

Джерело JWT-функцій, middleware та назв публічних експортів — `features/auth-middleware`, commit `3a00b259d09280decbf012113af9581b601441d0`. При перенесенні env перевіряється під час виклику, payload валідується Zod-схемою без залежності від демонстраційної Prisma-моделі, HS256 явно обмежений, а очищення cookie використовує спільні flags і Max-Age=0 із поточного контракту. Демонстраційна таблиця та її міграція не переносилися.

Погоджена поведінка: публічної реєстрації немає; login працює лише з UserAccount, перевіряє `isActive`, повертає `{ expiresIn: 3600 }` та JWT тільки в HttpOnly cookie. Payload містить `userId` (UserAccount ID) і `role`; `employeeId` та `permVersion` не використовуються. Logout після перевірки JWT очищає cookie без серверного відкликання токена. Скопійований токен залишається чинним до завершення строку дії.

## Підключення після CRM-110

1. Реалізувати `AuthUserAccounts` із `auth.types.ts` через внутрішній UserAccount service: вибірка лише credentials/state/role за нормалізованим email і оновлення `last_login_at`. Відсутній account, зокрема Employee без account, повертає null. Не додавати Employee-запити до login.
2. Задати JWT_SECRET у локальному/серверному env і JWT_EXPIRES_IN=3600. JWT_SECRET не має значення за замовчуванням; `.env.example` містить лише порожній placeholder. Інший TTL відхиляється, щоб JWT expiry, JSON expiresIn і cookie Max-Age не розходилися. Ролі CRM-102.2: OWNER, MANAGER, RECRUITER, HR, WORKER; UserAccount ID має бути UUID.
3. Після dotenv створити один `new AuthService(accounts)` і `createAuthRouter(service)`; підключити в `src/routes/api/index.ts` під `/auth`. Спільний jsonBodyParser із `src/middlewares/json.middleware.ts` має виконуватися перед router (у app.ts уже підключено): він розрізняє порожнє chunked-тіло й {} без збереження raw body. JWT та isAuth підключаються автоматично, cookie-parser включений у фабрику. Для інших захищених маршрутів підключити cookie-parser перед isAuth. Не створювати service/limiter на кожен запит. До появи реального UserAccount adapter фабрика не монтується. Екземпляри service/controller не експортуються зараз, оскільки їхня production UserAccount-залежність ще відсутня.
4. Встановити AUTH_ALLOWED_ORIGINS, BCRYPT_COST (12), LOGIN_MAX_FAILED_ATTEMPTS (5), LOGIN_ATTEMPT_WINDOW_SECONDS (300), AUTH_COOKIE_SECURE (true; false тільки для локального HTTP за NODE_ENV=development). Перевірити передавання env у Compose, довірені проксі для req.ip та credentialed CORS, якщо FE використовує інший origin. In-memory limiter працює в межах одного процесу.
5. Реалізувати `InitialAdminStore` із `src/scripts/auth-seed.script.ts`: Employee + активний OWNER UserAccount створюються атомарно; concurrent duplicate повертає існуючий account. Не змінювати пароль, роль чи активність на повторному запуску. Підключити функцію `seedInitialAdmin` до `db:seed`/setup CLI після появи моделей. Задати ADMIN_EMAIL, ADMIN_PASSWORD, необов'язковий ADMIN_NAME. Seed приймає пароль від 12 Unicode-символів до 72 UTF-8 байтів; у storage передається тільки bcrypt hash. Секрети не виводити у CLI.
6. Виконати HTTP/БД-тести із справжніми UserAccount та JWT: seed двічі, вхід створеного admin, generic 401, active=false, last_login_at, JWT claims/expiry, cookie, lockout і logout. Перевірити також Prisma/Users-логи: підготовлені auth-тести не підтверджують гігієну ще відсутнього адаптера БД.

## Довірені проксі

`TRUSTED_PROXIES` порожній або відсутній означає `trust proxy=false`: IP береться зі з'єднання, а клієнтський `X-Forwarded-For` не впливає на rate limit. При reverse proxy DevOps має задати лише його реальні IP або вузькі CIDR через кому (наприклад, `192.0.2.10,2001:db8::10`; це документаційні адреси, не готові значення для сервера). `true`, кількість hops, імена хостів та CIDR `/0` відхиляються.

Довірений proxy повинен перезаписувати або безпечно очищати `X-Forwarded-For`, `X-Forwarded-Proto` та `X-Forwarded-Host`; не включати IP клієнтів у TRUSTED_PROXIES. При TLS termination це налаштування також потрібне для secure cookie express-session. У production Compose змінна передається через наявний env_file; для локального прямого HTTP залишити порожньою. Реальну мережеву конфігурацію потрібно перевірити під час розгортання.

## Перевірки зараз

`npm test`, `npm run test:typecheck`, `npm run lint`, `npx tsc --noEmit`, `npm run lint:openapi`.

`tests/auth/auth.contract.test.ts` проганяє Express-router і JSON parser у процесі з HTTP stream doubles та підмінними залежностями; відповіді зіставляються з прикладами OpenAPI. `tests/auth/auth.jwt.test.ts` додатково перевіряє login, cookie, захищений запит і logout зі справжніми bcrypt, JWT issuer і isAuth; підміняється лише UserAccount. Unit-тести JWT/middleware покривають expiry, forged signature, malformed JWT, not-before, неправильні claims і конфігурацію. Сервер, TCP і БД не запускаються. Це не повна JSON Schema валідація чи перевірка майбутнього Prisma adapter. Swagger Try it out залишається вимкненим до production-підключення.
