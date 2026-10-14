# CRM-109: prepared authentication module

Поки відсутні таблиці в БД та модуль юзерів. Auth-модуль підготовлено для майбутнього підключення, але production-router ще не підключений до `/api`.

Погоджена поведінка: публічної реєстрації немає; login працює лише з UserAccount, перевіряє `isActive`, повертає `{ expiresIn: 3600 }` та JWT тільки в HttpOnly cookie. Payload містить `userId` (UserAccount ID) і `role`; `employeeId` та `permVersion` не використовуються. Logout після перевірки JWT очищає cookie без серверного відкликання токена. Скопійований токен залишається чинним до завершення строку дії.

## Підключення після CRM-110 та CRM-102.2

1. Реалізувати `AuthUserAccounts` із `auth.types.ts` через внутрішній UserAccount service: вибірка лише credentials/state/role за нормалізованим email і оновлення `last_login_at`. Відсутній account, зокрема Employee без account, повертає null. Не додавати Employee-запити до login.
2. Реалізувати `AuthTokenIssuer.issue` через CRM-102.2. Валідувати UserAccount ID та роль типами JWT-модуля; узгодити JWT_EXPIRES_IN=3600 із контрактом і cookie. Middleware CRM-102.2 підключити до logout через аргумент `authenticate` фабрики; його помилки мають використовувати AuthError UNAUTHORIZED/TOKEN_STALE, без секретних details.
3. Після dotenv створити один AuthService, один limiter і `createAuthRouter(service, authenticate)`; підключити в `src/routes/api/index.ts` під `/auth`. До цього фабрика не монтується, щоб не видавати підмінні дані за реальну авторизацію. Екземпляри service/controller не експортуються зараз, оскільки їхні production-залежності ще відсутні.
4. Встановити AUTH_ALLOWED_ORIGINS, BCRYPT_COST (12), LOGIN_MAX_FAILED_ATTEMPTS (5), LOGIN_ATTEMPT_WINDOW_SECONDS (300), AUTH_COOKIE_SECURE (true; false тільки для локального HTTP за NODE_ENV=development). Перевірити передавання env у Compose, довірені проксі для req.ip та credentialed CORS, якщо FE використовує інший origin. In-memory limiter працює в межах одного процесу.
5. Реалізувати `InitialAdminStore` із `src/scripts/auth-seed.script.ts`: Employee + активний OWNER UserAccount створюються атомарно; concurrent duplicate повертає існуючий account. Не змінювати пароль, роль чи активність на повторному запуску. Підключити функцію `seedInitialAdmin` до `db:seed`/setup CLI після появи моделей. Задати ADMIN_EMAIL, ADMIN_PASSWORD, необов'язковий ADMIN_NAME. Seed приймає пароль від 12 Unicode-символів до 72 UTF-8 байтів; у storage передається тільки bcrypt hash. Секрети не виводити у CLI.
6. Виконати HTTP/БД-тести із справжніми UserAccount та JWT: seed двічі, вхід створеного admin, generic 401, active=false, last_login_at, JWT claims/expiry, cookie, lockout і logout. Перевірити також Prisma/Users-логи: підготовлені auth-тести не підтверджують гігієну ще відсутнього адаптера БД.

## Перевірки зараз

`npm test`, `npm run test:typecheck`, `npm run lint`, `npx tsc --noEmit`, `npm run lint:openapi`.

`tests/auth/auth.contract.test.ts` проганяє справжній Express-router і JSON parser у процесі з HTTP stream doubles, без сервера, TCP та БД. UserAccount і JWT замінені тестовими залежностями. Відповіді зіставляються з прикладами OpenAPI; це не повна JSON Schema валідація чи тест справжніх JWT. Swagger Try it out залишається вимкненим до production-підключення.
