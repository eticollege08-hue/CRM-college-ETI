import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

// This opt-in suite creates and removes only its own fresh, randomly named schema.
// It is deliberately excluded from Vitest's **/*.test.ts unit-test discovery.
if (process.env.NODE_ENV !== "development") {
    throw new Error("Calendar database checks require NODE_ENV=development.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const schemaName = "calendar_check_" + randomBytes(12).toString("hex");
assert.match(schemaName, /^calendar_check_[a-f0-9]{24}$/);
const base = new PrismaClient({ log: [] });
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("schema", schemaName);
const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    NODE_ENV: "development",
    AUTH_COOKIE_SECURE: "false",
    JWT_SECRET: randomBytes(32).toString("hex"),
    JWT_EXPIRES_IN: "3600",
    BCRYPT_COST: "4",
};
const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } }, log: [] });
let created = false;
let server: ReturnType<typeof spawn> | undefined;
let phase = "schema setup";

interface EventResponse {
    success: boolean;
    event: { id: string; participants: { employee: { id: string } }[] };
}

async function run() {
    const existing = await base.$queryRaw<
        { schema_name: string }[]
    >`SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${schemaName}`;
    assert.equal(existing.length, 0);
    // PostgreSQL identifiers cannot be bound parameters; the identifier is generated above, never user input.
    await base.$executeRawUnsafe('CREATE SCHEMA "' + schemaName + '"');
    created = true;
    for (let attempt = 0; attempt < 2; attempt++) {
        const result = spawnSync(
            process.execPath,
            ["node_modules/prisma/build/index.js", "migrate", "deploy"],
            { env, stdio: "ignore" },
        );
        assert.equal(
            result.status,
            0,
            "Migrations must apply and be repeatable on an isolated schema.",
        );
    }
    phase = "HTTP setup";
    const password = randomBytes(20).toString("hex");
    const passwordHash = await hash(password, 4);
    const worker = await db.userAccount.create({
        data: {
            email: "worker@example.invalid",
            passwordHash,
            roleKey: "WORKER",
            employee: { create: { fullName: "Worker" } },
        },
    });
    const owner = await db.userAccount.create({
        data: {
            email: "owner@example.invalid",
            passwordHash,
            roleKey: "OWNER",
            employee: { create: { fullName: "Owner" } },
        },
    });
    const participant = await db.employee.create({
        data: { fullName: "Employee without account" },
    });
    const freeEmployee = await db.employee.create({ data: { fullName: "Another participant" } });
    const listener = net.createServer();
    await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const address = listener.address();
    if (!address || typeof address === "string") throw new Error("No test port available.");
    const port = address.port;
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    const origin = "http://127.0.0.1:" + port;
    server = spawn(process.execPath, ["--import", "tsx", "src/app.ts"], {
        env: { ...env, PORT: String(port), AUTH_ALLOWED_ORIGINS: origin },
        stdio: "ignore",
    });
    let startupError: Error | undefined;
    server.on("error", (error) => {
        startupError = error;
    });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            const response = await fetch(origin + "/login");
            if (response.status === 200) {
                ready = true;
                break;
            }
        } catch {
            /* The isolated child may still be starting. */
        }
        if (startupError || server.exitCode !== null) break;
        await delay(100);
    }
    assert.equal(ready, true, "Application failed to start.");

    async function request(
        method: string,
        path: string,
        cookie?: string,
        body?: unknown,
        sendOrigin = true,
    ) {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (cookie) headers.Cookie = cookie;
        if (sendOrigin) headers.Origin = origin;
        if (body !== undefined) headers["Content-Type"] = "application/json";
        return await fetch(origin + path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    }
    async function login(email: string) {
        const response = await request("POST", "/api/auth/login", undefined, { email, password });
        assert.equal(response.status, 200);
        const cookie = response.headers.getSetCookie().find((value) => value.includes("Max-Age="));
        assert.ok(cookie);
        return cookie.split(";")[0];
    }
    const cookie = await login(worker.email);
    const otherCookie = await login(owner.email);
    const input = {
        type: "MEETING",
        title: "Planning",
        description: "Details",
        startsAt: "2026-10-26T10:00:00Z",
        endsAt: "2026-10-26T11:00:00Z",
        timeZone: "UTC",
        participantIds: [participant.id],
    };
    async function create(body: unknown, auth = cookie) {
        return await request("POST", "/api/events", auth, body);
    }
    async function createdEvent(body: unknown, auth = cookie) {
        const response = await create(body, auth);
        assert.equal(response.status, 201);
        const value: EventResponse = await response.json();
        return value.event;
    }
    phase = "authorization and CRUD";
    assert.equal((await request("GET", "/api/events?date=2026-10-26")).status, 401);
    assert.equal((await request("POST", "/api/events", cookie, input, false)).status, 403);
    const event = await createdEvent(input);
    assert.deepEqual(
        event.participants.map((entry) => entry.employee.id),
        [participant.id],
    );
    assert.equal(
        (await db.event.findUniqueOrThrow({ where: { id: event.id } })).ownerAccountId,
        worker.id,
    );
    const self = await createdEvent({
        ...input,
        title: "Creator time",
        participantIds: [worker.employeeId],
    });
    assert.ok(self.id, "Scheduling for others must not occupy the creator automatically.");
    assert.equal((await create(input)).status, 409);
    await createdEvent({
        ...input,
        title: "Adjacent",
        startsAt: "2026-10-26T11:00:00Z",
        endsAt: "2026-10-26T12:00:00Z",
    });
    assert.equal((await request("GET", "/api/events/" + event.id, otherCookie)).status, 200);
    for (const [method, path, body] of [
        ["PATCH", "/api/events/" + event.id, { title: "Forbidden" }],
        ["DELETE", "/api/events/" + event.id, { confirmationTitle: "Planning" }],
        [
            "POST",
            "/api/events/" + event.id + "/participants",
            { participantIds: [freeEmployee.id] },
        ],
        ["DELETE", "/api/events/" + event.id + "/participants/" + participant.id, undefined],
    ] as const)
        assert.equal((await request(method, path, otherCookie, body)).status, 403);
    assert.equal(
        (
            await request("PATCH", "/api/events/" + event.id, cookie, {
                startsAt: "2026-10-26T12:00:00Z",
            })
        ).status,
        422,
    );
    assert.equal(
        (
            await request("PATCH", "/api/events/" + event.id, cookie, {
                endsAt: "2026-10-26T11:30:00Z",
            })
        ).status,
        409,
    );
    assert.equal(
        (await request("PATCH", "/api/events/" + event.id, cookie, { ownerAccountId: owner.id }))
            .status,
        422,
    );
    assert.equal(
        (
            await request("POST", "/api/events/" + event.id + "/participants", cookie, {
                participantIds: [worker.employeeId],
            })
        ).status,
        409,
    );
    for (let attempt = 0; attempt < 2; attempt++) {
        assert.equal(
            (
                await request("POST", "/api/events/" + event.id + "/participants", cookie, {
                    participantIds: [freeEmployee.id],
                })
            ).status,
            200,
        );
        assert.equal(await db.eventParticipant.count({ where: { eventId: event.id } }), 2);
    }
    assert.equal(
        (
            await request(
                "DELETE",
                "/api/events/" + event.id + "/participants/" + freeEmployee.id,
                cookie,
            )
        ).status,
        200,
    );
    assert.equal(
        (
            await request(
                "DELETE",
                "/api/events/" + event.id + "/participants/" + participant.id,
                cookie,
            )
        ).status,
        422,
    );
    assert.equal(
        (
            await request(
                "DELETE",
                "/api/events/" + event.id + "/participants/" + freeEmployee.id,
                cookie,
            )
        ).status,
        404,
    );
    assert.equal(
        (await request("PATCH", "/api/events/" + event.id, cookie, { title: "Renamed" })).status,
        200,
    );
    assert.equal(
        (
            await request("DELETE", "/api/events/" + event.id, cookie, {
                confirmationTitle: "Planning",
            })
        ).status,
        422,
    );
    assert.equal(
        (
            await request("DELETE", "/api/events/" + event.id, cookie, {
                confirmationTitle: "Renamed",
            })
        ).status,
        200,
    );
    assert.equal(await db.eventParticipant.count({ where: { eventId: event.id } }), 0);
    assert.equal((await request("GET", "/api/events/" + event.id, cookie)).status, 404);
    assert.equal((await request("GET", "/api/events/not-uuid", cookie)).status, 422);
    for (const change of [
        { timeZone: "Bad/Zone" },
        { participantIds: [] },
        { participantIds: [participant.id, participant.id] },
        { type: "ROOM_BOOKING" },
        { startsAt: "2026-10-26T00:00:00Z", endsAt: "2026-10-27T00:00:00Z" },
    ]) {
        assert.equal((await create({ ...input, ...change })).status, 422);
    }
    assert.equal(
        (await create({ ...input, participantIds: ["550e8400-e29b-41d4-a716-446655440099"] }))
            .status,
        404,
    );
    console.log(
        "PASS: CRUD, author-only writes across roles, confirmation, participants, adjacency and validation.",
    );

    phase = "concurrency";
    const concurrent = {
        ...input,
        startsAt: "2026-10-27T10:00:00Z",
        endsAt: "2026-10-27T11:00:00Z",
    };
    const attempts = await Promise.all(Array.from({ length: 6 }, () => create(concurrent)));
    assert.equal(attempts.filter((value) => value.status === 201).length, 1);
    assert.ok(attempts.every((value) => value.status === 201 || value.status === 409));
    assert.equal(await db.event.count({ where: { startsAt: new Date(concurrent.startsAt) } }), 1);
    const left = await createdEvent({
        ...input,
        startsAt: "2026-10-28T10:00:00Z",
        endsAt: "2026-10-28T11:00:00Z",
    });
    const right = await createdEvent({
        ...input,
        startsAt: "2026-10-28T12:00:00Z",
        endsAt: "2026-10-28T13:00:00Z",
    });
    const updates = await Promise.all(
        [left, right].map((value) =>
            request("PATCH", "/api/events/" + value.id, cookie, {
                startsAt: "2026-10-28T14:00:00Z",
                endsAt: "2026-10-28T15:00:00Z",
            }),
        ),
    );
    assert.equal(updates.filter((value) => value.status === 200).length, 1);
    assert.equal(updates.filter((value) => value.status === 409).length, 1);
    const membershipLeft = await createdEvent({
        ...input,
        startsAt: "2026-10-30T10:00:00Z",
        endsAt: "2026-10-30T11:00:00Z",
    });
    const membershipRight = await createdEvent({
        ...input,
        participantIds: [owner.employeeId],
        startsAt: "2026-10-30T10:00:00Z",
        endsAt: "2026-10-30T11:00:00Z",
    });
    const additions = await Promise.all(
        [membershipLeft, membershipRight].map((value) =>
            request("POST", "/api/events/" + value.id + "/participants", cookie, {
                participantIds: [freeEmployee.id],
            }),
        ),
    );
    assert.equal(additions.filter((value) => value.status === 200).length, 1);
    assert.equal(additions.filter((value) => value.status === 409).length, 1);
    console.log(
        "PASS: concurrent creation, updates and participant additions cannot double-book an employee.",
    );

    phase = "time zones and SSR";
    const zoned = await createdEvent({
        ...input,
        startsAt: "2026-10-29T00:30:00+02:00",
        endsAt: "2026-10-29T01:00:00+02:00",
        timeZone: "Europe/Kyiv",
    });
    const dayResponse = await request(
        "GET",
        "/api/events?date=2026-10-29&timeZone=Europe%2FKyiv",
        otherCookie,
    );
    assert.equal(dayResponse.status, 200);
    const dayValue: { events: { id: string }[] } = await dayResponse.json();
    assert.ok(dayValue.events.some((value) => value.id === zoned.id));
    const invalidQuery = await request("GET", "/api/events?date=2026-02-30", cookie);
    assert.equal(invalidQuery.status, 422);
    const invalidValue: {
        success: boolean;
        message: string;
        details: { field: string; message: string }[];
    } = await invalidQuery.json();
    assert.deepEqual(Object.keys(invalidValue).sort(), ["success", "message", "details"].sort());
    const calendar = await fetch(origin + "/calendar?month=2026-10&timeZone=Europe%2FKyiv", {
        headers: { Cookie: cookie },
    });
    assert.equal(calendar.status, 200);
    assert.equal(await calendar.text(), "");
    assert.equal(calendar.headers.get("Cache-Control"), "no-store");
    assert.equal((await fetch(origin + "/calendar")).status, 401);
    console.log("PASS: local-day retrieval, shared JSON errors and authenticated zero-byte SSR.");
}

try {
    await run();
} catch (error: unknown) {
    console.error(
        "Calendar integration check failed during " +
            phase +
            ". Raw errors withheld to protect credentials.",
    );
    if (error instanceof assert.AssertionError) console.error("Failed assertion: " + error.message);
    process.exitCode = 1;
} finally {
    if (server && server.exitCode === null) {
        server.kill();
        await Promise.race([
            new Promise<void>((resolve) => server?.once("exit", () => resolve())),
            delay(3000),
        ]);
    }
    await db.$disconnect();
    if (created) {
        await base.$executeRawUnsafe('DROP SCHEMA "' + schemaName + '" CASCADE');
        console.log("Temporary calendar schema removed. Existing schemas were not modified.");
    }
    await base.$disconnect();
}
