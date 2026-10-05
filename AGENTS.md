# Правила роботи АІ в CRM

Цей файл діє для всього репозиторію. Перед змінами прочитай його, а потім лише файли, потрібні для задачі. Опис нижче фіксує поточну архітектуру; правила стилю задають єдиний стандарт для нового та зміненого коду.

## Швидка карта проєкту

- Стек: Node.js (Docker використовує 24), TypeScript із `strict: true`, ESM (`"type": "module"`), Express 5, Zod 4, Prisma 5, PostgreSQL 17, Nunjucks, express-session. Точні версії встановлення — у `package-lock.json`.
- `src/app.ts` — налаштування Express, JSON, статичних файлів, сесій, Nunjucks, підключення маршрутів, останнім — `errorHandler`, запуск на `PORT` або 3000.
- `src/routes/api/index.ts` — реєстр API-модулів під `/api`; наразі порожній.
- `src/routes/ssr/index.ts` — реєстр SSR-маршрутів під `/`, наразі порожній.
- `src/modules/` — каталог доменних модулів. Демонстраційний модуль видалено; повні приклади семи його шарів збережено лише нижче в цьому документі.
- `src/config/prisma.config.ts` — спільний PrismaClient; під час імпорту перевіряє з'єднання та логує запити.
- `src/middlewares/` — `asyncCatch`, `validateBody`, `validateParams`, `errorHandler`.
- `src/constants/http-status.constants.ts` — `HttpStatus`; `src/utils/error.util.ts` — `ApiError`.
- `src/schemas/id.schema.ts` — спільна `uuidSchema`; `src/types/common.types.ts` — типи помилок.
- `prisma/schema.prisma` — джерело моделі БД; `prisma/migrations/` — історія SQL-міграцій.
- `src/views/` — каталог шаблонів `.njk`, зараз без шаблонів; `src/public/` — каталоги css, img, js, зараз без файлів.
- `dist/` — результат компіляції, не редагувати. `node_modules/` — залежності, не редагувати.

## Команди

Виконуй з кореня проєкту. Менеджер пакетів — npm; зберігай `package-lock.json`, не додавай lock-файли інших менеджерів.

| Команда                                 | Призначення / передумови                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm ci`                                | Встановити залежності за lock-файлом; потрібна активна версія Node.js.                    |
| `npx prisma generate --allow-no-models` | Оновити Prisma Client після встановлення залежностей або зміни схеми.                     |
| `npm run start:dev`                     | Nodemon + tsx, стеження за `.ts` у `src`; потрібні env та доступна БД.                    |
| `npx tsc --noEmit`                      | Перевірити типи без створення `dist`.                                                     |
| `npm run build`                         | Компілювати TypeScript у `dist`.                                                          |
| `npm start`                             | Виконати `node dist/app.js`; див. застереження щодо ESM нижче.                            |
| `npm run docker:dev`                    | Зібрати й запустити dev app + PostgreSQL; працює у foreground.                            |
| `npm run docker:dev:down`               | Зупинити dev-оточення без видалення volume.                                               |
| `npm run docker:dev:migrate`            | `prisma migrate dev` у запущеному dev-контейнері; створює/застосовує міграції, змінює БД. |
| `npm run docker:prod`                   | Зібрати й запустити production у background; старт застосовує `prisma migrate deploy`.    |
| `npm run docker:prod:down`              | Зупинити production-оточення без видалення volume.                                        |
| `npx prisma validate`                   | Перевірити Prisma-схему; потрібен заданий `DATABASE_URL`.                                 |

Команд `test`, `lint`, `format` та їх конфігурацій наразі немає. Не звітуй про неіснуючі перевірки. Не запускай production, міграції чи зупинку сервісів як звичайну перевірку зміни коду.

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

- POST/PATCH перевіряй через `validateBody`; `/:id` — через `validateParams(uuidSchema)` перед controller. Після валідації використовуй розібрані дані middleware.
- Асинхронні handlers обгортай наявним `asyncCatch`, навіть з Express 5, щоб зберегти єдиний підхід. Не дублюй однакові try/catch у кожному controller.
- Статуси бери з `HttpStatus`. Очікувані бізнес-помилки — `throw new ApiError(status, moduleMessage)` у service; централізоване відображення помилок — у `errorHandler`.
- Поточний контракт успіху: `{ success: true, <entity> }` або `{ success: true, <entities> }`; для create/update/delete додається `message`. Create — 201; читання/update/delete — 200; delete повертає JSON із повідомленням.
- Контракт помилки: `{ success: false, message, details? }`; валідаційні `details` мають `{ field, message }`. Не вводь обгортку `data`, інші назви полів або 204 для чинних endpoints без явної задачі.
- `validateBody` відхиляє порожнє тіло й сам повертає JSON для помилки схеми; `validateParams` також повертає JSON. `errorHandler` підтримує JSON/SSR і коди Prisma P2002, P2003, P2025, P2000, P2005, P2006. Враховуй це при зміні обробки помилок.
- Не передавай неперевірене тіло напряму у Prisma. Для нових моделей віддавай лише публічні поля; паролі, токени та внутрішні секрети не повинні потрапляти у відповідь.

## База даних і конфігурація

- Зміни моделей починай з `prisma/schema.prisma`; зберігай SQL-міграції у `prisma/migrations`. Не переписуй уже застосовану історію міграцій.
- У документованому прикладі `Example.id` — String із UUID, створеним PostgreSQL через `gen_random_uuid()`; `createdAt` має `@default(now())` і `@map("created_at")`. Для нових аналогічних моделей дотримуйся цього підходу, якщо немає іншої вимоги.
- Для пов'язаних записів, що мають змінитися атомарно, використовуй Prisma-транзакцію в межах шару даних. Уникай небезпечного raw SQL із конкатенацією вхідних даних.
- Не використовуй `prisma db push` замість історії міграцій. Reset БД, видалення volume та руйнівні міграції потребують явного дозволу користувача.
- Назви env: `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`; Compose також використовує `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DB`, `DATABASE_PORT`.
- `.env` ігнорується Git. Не друкуй його вміст, не додавай секрети в код, документацію чи логи. Для опису конфігурації достатньо назв змінних і безпечних placeholders.

## Відомі особливості — не витрачай час на повторне відкриття

- Стиль старих файлів змішаний; це не привід для масового форматування. Застосовуй стандарт вище до свого коду.
- `package.json#imports` спрямовані на `./src/`. Production Dockerfile замінює їх на `./dist/` у контейнері. Локальний `npm start` такої заміни не робить; успішна компіляція не гарантує успішний запуск.
- У старому коді є імпорти без `.js` (зокрема в `app.ts`) і прямі імпорти Prisma runtime. Якщо задача стосується production/ESM, перевір їх разом з aliases; для інших задач не розширюй scope автоматично.
- `dotenv.config()` викликається в `app.ts` після статичних імпортів; Prisma ініціалізується при імпорті. Для локального запуску перевір доступність `DATABASE_URL` у момент ініціалізації. Compose передає його через environment.
- Production Dockerfile копіює `src/views`, `src/public`, `src/scripts/assets`. Останнього каталогу зараз немає; порожні views/public не зберігаються Git. Перед задачею Docker-збірки перевір ці COPY, не вважай збірку вже справною.
- `errorHandler` рендерить SSR-шаблон `error`, якого наразі немає. Наявність Nunjucks не означає завершений SSR.
- Сесії використовують стандартне сховище express-session; secure cookie вмикається в production, `trust proxy` дорівнює 1. Не вважай поточну конфігурацію готовим масштабованим auth-рішенням.

## Як працювати швидко та перевіряти зміни

1. Визнач модуль/шар задачі за картою вище. Почни з `rg --files src prisma` або адресного `rg -n <symbol> src`; читай лише знайдені файли й прямі залежності. Не скануй `node_modules`, `dist`, `.git`, lock-файл чи весь репозиторій без потреби.
2. Перед редагуванням перевір `git status --short`; збережи сторонні зміни. Обери найменшу зміну, що повністю вирішує задачу; не додавай залежності, фреймворки чи нові архітектурні шари без потреби.
3. Для TypeScript-змін виконай `npx tsc --noEmit`. Для змін збірки — `npm run build`; для Prisma-схеми — `npx prisma validate` і `npx prisma generate --allow-no-models`. Перевірки без змін коду не потребують запуску БД.
4. Для зміни поведінки API перевір релевантні сценарії: успіх, неправильне тіло/id, відсутній запис. Використовуй наявний тестовий механізм, якщо він з'явиться, або адресну ручну перевірку у dev-оточенні. Не вигадуй результатів і не встановлюй тестовий стек для дрібного рефакторингу.
5. Якщо перевірка заблокована середовищем, повідом точну причину; не встановлюй інструменти й не міняй конфігурацію лише заради документаційної задачі. Повідомлення Node shim про відсутність активної версії Node.js означає проблему середовища, а не діагностику помилки коду.
6. Перед завершенням перевір diff, випадкові файли й секрети. У відповіді коротко зазнач зміни, виконані перевірки та реальні обмеження. Не повторюй повний аналіз архітектури.
7. Якщо задача змінює структуру, scripts, контракт або описані особливості, онови відповідний пункт цього `AGENTS.md`. Зберігай його коротким: правила й карта, а не журнал кожної виконаної задачі.

## Повні приклади коду модуля example

Нижче наведено повний код кожного шару. Це навчальний знімок видаленого модуля; не створюй його файли, маршрути чи модель без явної задачі користувача; у новому коді дотримуйся правил стилю вище, зокрема додавай .js до внутрішніх імпортів.

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
import type {
  ExampleCreateInput,
  ExampleUpdateInput,
} from "./example.types.js";

export class ExampleService {
  constructor(
    private readonly repository: ExampleRepository = exampleRepository,
  ) {}

  async create(data: ExampleCreateInput) {
    return await this.repository.create(data);
  }

  async getAll() {
    return await this.repository.getAll();
  }

  async getById(id: UUID) {
    const item = await this.repository.getById(id);
    if (!item) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        EXAMPLE_FAILURE_MESSAGES.NOT_FOUND,
      );
    }

    return item;
  }

  async update(id: UUID, data: ExampleUpdateInput) {
    const isExist = await this.repository.getById(id);
    if (!isExist) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        EXAMPLE_FAILURE_MESSAGES.NOT_FOUND,
      );
    }

    return await this.repository.update(id, data);
  }

  async delete(id: UUID) {
    const isExist = await this.repository.getById(id);
    if (!isExist) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        EXAMPLE_FAILURE_MESSAGES.NOT_FOUND,
      );
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
import {
  validateBody,
  validateParams,
} from "../../middlewares/validate.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

const router = express.Router();

router.get("/", asyncCatch(exampleController.getAll));
router.get(
  "/:id",
  validateParams(uuidSchema),
  asyncCatch(exampleController.getById),
);

router.post(
  "/",
  validateBody(exampleCreateSchema),
  asyncCatch(exampleController.create),
);

router.patch(
  "/:id",
  validateParams(uuidSchema),
  validateBody(exampleUpdateSchema),
  asyncCatch(exampleController.update),
);

router.delete(
  "/:id",
  validateParams(uuidSchema),
  asyncCatch(exampleController.delete),
);

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

## Видалення демонстраційної таблиці з раніше створеної БД

Модуль, його alias, Prisma-модель і обидві демонстраційні міграції видалено з репозиторію за явною вимогою користувача. Схема наразі без моделей, тому генерація Prisma Client потребує `--allow-no-models`. Наведені вище приклади існують тільки як документація.
