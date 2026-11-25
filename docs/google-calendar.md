# Синхронізація подій з Google Calendar

Події CRM (`/api/events`) створюються в Google Calendar **одного Google-акаунта CRM**, який є
організатором. Кожен учасник з активним акаунтом CRM запрошується за **email логіну**, тож подія
з'являється в його власному Google Calendar, і він отримує лист про запрошення, зміни або скасування.

База даних лишається джерелом правди. Читання (`GET /api/events`, сторінки календаря та Leave)
працює з БД. Синхронізація йде в один бік: CRM → Google.

## Як це працює

- Google-запит виконується останнім кроком тієї ж Serializable-транзакції. Якщо Google недоступний,
  транзакція відкочується, а API повертає `502` з повідомленням
  `Google Calendar is unavailable. Please try again later.`. Деталі від Google не повертаються й не логуються.
- Якщо БД не вдалося закомітити вже після запису в Google, сервіс best-effort повертає Google у
  попередній стан. Учасники можуть отримати додатковий лист про це.
- ID події в Google — UUID події CRM без дефісів (`Event.googleEventId`). Повторні спроби P2034
  ідемпотентні.
- Attendees — це email логіну (`UserAccount.email`) учасників з активним акаунтом. Співробітники без
  акаунта або з вимкненим акаунтом записуються лише в CRM, запрошення вони не отримують.
- При зміні події відповіді учасників (прийняв/відхилив) зберігаються. Нові учасники отримують
  запрошення, видалені — лист про скасування.
- Тенант, автор, тип і всі учасники зберігаються в `extendedProperties.private` (`crmEventId`,
  `companyId`, `ownerAccountId`, `type`, `employee_<employeeId без дефісів>=1`; ключ Google обмежує 44 символами). Учасники цих полів не бачать.
- Події з `googleEventId = null` (створені до міграції або при `GOOGLE_CALENDAR_ENABLED=false`)
  синхронізуються при першій наступній зміні.
- Якщо користувач змінив email у профілі, запрошення на вже наявні події оновляться лише при
  наступній зміні цих подій.
- Зміни, зроблені вручну в Google, у CRM не імпортуються й перезаписуються наступною зміною з CRM.

## Налаштування

### 1. Google Cloud: API та OAuth consent screen

1. У Google Cloud Console виберіть проєкт і увімкніть **Google Calendar API**
   (**APIs & Services → Library**).
2. Відкрийте **APIs & Services → OAuth consent screen** (або **Google Auth Platform**):
    - User type: **External**. **Internal** можна вибрати, якщо акаунт CRM належить Workspace.
    - Заповніть назву застосунку та email підтримки.
    - У **Audience / Publishing status** натисніть **Publish app** (**In production**). У статусі
      **Testing** refresh token перестає працювати через 7 днів. Верифікація Google не потрібна, бо
      авторизується лише один акаунт CRM. На кроці входу Google покаже попередження
      «Google hasn't verified this app»: натисніть **Advanced → Go to … (unsafe)**.

### 2. OAuth client

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Desktop app**, назва довільна, далі **Create**.
3. Скопіюйте **Client ID** у `GOOGLE_OAUTH_CLIENT_ID` і **Client secret** у `GOOGLE_OAUTH_CLIENT_SECRET`.

### 3. Refresh token

```bash
npm run google:auth
```

Скрипт виведе посилання. Відкрийте його, увійдіть **тим Google-акаунтом, від імені якого CRM
надсилатиме запрошення**, і дозвольте доступ. У терміналі з'явиться рядок
`GOOGLE_OAUTH_REFRESH_TOKEN=...`, перенесіть його в `.env`. Токен — це секрет: не комітьте його і
не пересилайте.

### 4. `.env`

| Змінна                       | Значення                                                                    |
| ---------------------------- | --------------------------------------------------------------------------- |
| `GOOGLE_CALENDAR_ENABLED`    | `true` вмикає синхронізацію; `false` (default) — CRM працює лише з БД.      |
| `GOOGLE_OAUTH_CLIENT_ID`     | Client ID з кроку 2.                                                        |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client secret з кроку 2.                                                    |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Результат `npm run google:auth`.                                            |
| `GOOGLE_CALENDAR_ID`         | Календар акаунта CRM, у якому живуть події; `primary` (default) — основний. |
| `GOOGLE_CALENDAR_TIMEOUT_MS` | Таймаут одного запиту до Google, 1000–7000 мс (default 5000).               |

Якщо `GOOGLE_CALENDAR_ENABLED=true`, застосунок перевіряє змінні до `listen` і з неповною
конфігурацією не стартує.

### 5. Міграція

Застосуйте `20261116120000_add_event_google_calendar_sync` (колонка `events.google_event_id`):
у dev — `npm run docker:dev:migrate`, у production — `prisma migrate deploy`.

## Обмеження

- Запити до Google тримають транзакцію БД відкритою (таймаут 30 с), тому таймаут одного запиту
  обмежено 7 с.
- Якщо refresh token відкликано (змінено пароль акаунта CRM, знято доступ у налаштуваннях Google),
  зміни подій повертатимуть 502. Тоді треба повторити `npm run google:auth`.
- Інтеграційний скрипт `npm run test:calendar:integration` примусово вимикає синхронізацію.
