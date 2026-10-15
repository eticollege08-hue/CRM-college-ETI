# CRM-109: login, logout та початковий акаунт

Auth підключено до реальних UserAccount service/repository та маршрутів `/api/auth/login`, `/api/auth/logout`. Публічної реєстрації немає. `GET /login` рендерить порожній `pages/login.njk` із метаданими css/js/activePage.

Login нормалізує email, перевіряє bcrypt та `isActive`, видає JWT із UserAccount ID і Prisma Role та оновлює `last_login_at`. Відсутній акаунт, неправильний пароль і неактивний акаунт повертають однакові 401 та `{ success: false, message: "Invalid email or password.", details: [] }`. Employee або UserAccount під час login не створюються.

Успішний login повертає `{ success: true, message: "Signed in successfully." }`; logout — відповідне повідомлення виходу. JWT та його строк дії в JSON не повертаються. Один спільний ApiError/errorHandler формує помилки всього API без code, без details-значень паролів, JWT, hashes або сирих технічних помилок.

## Конфігурація

- `DATABASE_URL` — PostgreSQL із застосованими міграціями Employee/UserAccount.
- `JWT_SECRET` — згенерувати щонайменше 32 випадкові байти; перевірка мінімальної довжини не визначає випадковість секрету.
- `JWT_EXPIRES_IN` — додатне ціле в секундах, типово 3600. JWT-конфігурація є єдиним джерелом строку дії для signing і cookie.
- `AUTH_ALLOWED_ORIGINS` — точні canonical HTTP(S) origins через кому, без шляхів, wildcard або credentials. Для auth POST Origin обов'язковий; Referer не використовується.
- `AUTH_COOKIE_SECURE` — true за замовчуванням. false дозволено лише для локального HTTP за `NODE_ENV=development`.
- `BCRYPT_COST` — 12 за замовчуванням.
- `LOGIN_MAX_FAILED_ATTEMPTS` та `LOGIN_ATTEMPT_WINDOW_SECONDS` — 5 і 300.

Створити секрет у поточній PowerShell-сесії без виведення значення:

```powershell
$env:JWT_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
```

Cookie: `crm_access_token`, HttpOnly, SameSite=Lax, host-only, Path=/, Secure відповідно до конфігурації. Встановлення й очищення також видаляють стару однойменну cookie на Path=/api. Login/logout та API-помилки мають Cache-Control: no-store. Logout перевіряє JWT і очищає cookie без серверного відкликання: скопійований JWT залишається чинним до закінчення строку.

Застосунок використовує стандартні express.json() та cookieParser(). Для POST/PATCH потрібен JSON-об'єкт; неправильні поля й зайві властивості повертають 422. Порожній Employee-профіль `{}` дозволений його схемою. Стандартний parser може перетворити нуль байтів на `{}`; спеціальної обробки chunked/порожніх тіл немає. Некоректний JSON дає безпечний 400, завеликий — 413, неприйнятний charset/encoding — 415. Logout не використовує parsed body.

Trust proxy=false для прямого доступу; клієнтські forwarded headers не визначають IP. За reverse proxy довіру потрібно налаштувати під фактичну інфраструктуру. Для окремого FE origin окремо потрібен credentialed CORS; типовий сценарій — same-origin.

Rate limiter зберігає ковзне вікно та послідовну чергу за нормалізованим email + IP. Після п'яти невдалих перевірок наступна спроба має 429 до bcrypt. Заблоковані запити не подовжують вікно; технічні помилки не рахуються; успіх не скидає попередні невдачі. Час очікування не передається у JSON або Retry-After. Один процес має спільний limiter; перезапуск скидає лічильники, кілька процесів не мають спільного ліміту.

## Початковий admin

Додати в локальний environment (не у Git): `ADMIN_EMAIL`, `ADMIN_PASSWORD`, необов'язково `ADMIN_NAME` (типово System Administrator). Пароль: щонайменше 12 Unicode-символів, максимум 72 UTF-8 байти. Імена змінних навмисно не включені до .env.example.

Приклад введення в поточну PowerShell-сесію без відкритого пароля в історії:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", (Read-Host "Admin password" -AsSecureString)).Password
npm run db:seed
```

Перед запуском перевірити `npx prisma migrate status`. Міграції з поточної staging не переписувалися; за наявності незастосованих міграцій спочатку перевірити їхній вплив на дані. Reset/db push/видалення volume не потрібні.

Seed викликає внутрішній UserAccount service. Вкладене створення Prisma атомарно додає Employee та активний OWNER UserAccount. У БД передається лише bcrypt hash. Повторний запуск повертає існуючий акаунт, не змінюючи пароль, роль або активність. За конкурентного конфлікту email програшна транзакція відкочується й повертається вже створений акаунт. CLI не друкує credentials, hashes або сирі помилки.

## Перевірка

`npm run lint`, `npx tsc --noEmit`, `npm run test:typecheck`, `npm test`, `npm run lint:openapi`.

В auth PR залишено unit-тести AuthService і rate limiter. Попередні тести CRM-102.2, Employee, UserAccount та SSR збережені; JWT/middleware адаптовані до спільного контракту. Тести не замінюють dev-перевірку реального seed, login/logout, persisted bcrypt та last_login_at.

Для dev-перевірки: seed двічі (стабільні IDs і hash), конкурентний seed (один Employee/account), login із правильним і неправильним паролем, missing/inactive account (однаковий 401), 429 і відновлення після вікна, cookie на / та очищення legacy /api, logout і 401 без cookie. Публічна відповідь не повинна містити token, expiresIn, credentials чи hash. `GET /login` має повертати порожню HTML-сторінку.
