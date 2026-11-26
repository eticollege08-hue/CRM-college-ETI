import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import teamsRouter from "../../src/modules/teams/teams.router.js";
import { teamsService } from "../../src/modules/teams/teams.service.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";
import { ApiError } from "../../src/utils/error.util.js";
describe("Teams HTTP", () => {
    let server: Server, base: string;
    beforeAll(async () => {
        vi.stubEnv("AUTH_ALLOWED_ORIGINS", "http://localhost:3000");
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            req.user = {
                userId: "account",
                companyId: "company",
                role: req.get("role") === "worker" ? "WORKER" : "OWNER",
                exp: 2000000000,
            };
            next();
        });
        app.use("/api/teams", teamsRouter);
        app.use(errorHandler);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        base = "http://127.0.0.1:" + (server.address() as AddressInfo).port + "/api/teams";
    });
    afterAll(() => {
        server.close();
        vi.unstubAllEnvs();
    });
    function create(body: unknown, role = "owner", origin = "http://localhost:3000") {
        return fetch(base, {
            method: "POST",
            headers: { role, origin, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }
    it("creates under the authenticated company", async () => {
        const team = { id: "id", name: "Platform", memberCount: 0 };
        const spy = vi.spyOn(teamsService, "create").mockResolvedValue(team);
        const res = await create({ name: " Platform " });
        expect(res.status).toBe(201);
        expect((await res.json()).team).toEqual(team);
        expect(spy).toHaveBeenCalledWith("company", "Platform");
    });
    it("rejects invalid bodies and ids, disallowed roles and origins", async () => {
        expect((await create({ name: " " })).status).toBe(422);
        expect((await create({ name: "ok" }, "worker")).status).toBe(404);
        expect((await create({ name: "ok" }, "owner", "https://other.test")).status).toBe(404);
        expect((await fetch(base + "/invalid")).status).toBe(422);
    });
    it("returns 404 for an unavailable team", async () => {
        vi.spyOn(teamsService, "get").mockRejectedValue(new ApiError(404, "Not found"));
        expect((await fetch(base + "/550e8400-e29b-41d4-a716-446655440000")).status).toBe(404);
    });
});
