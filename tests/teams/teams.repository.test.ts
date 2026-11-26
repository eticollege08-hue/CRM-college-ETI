import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { TeamsRepository } from "../../src/modules/teams/teams.repository.js";
describe("project team transaction", () => {
    const setup = () => {
        const project = { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "p" }) };
        const team = {
            findUniqueOrThrow: vi.fn().mockResolvedValue({
                members: ["new", "old", "dismissed"].map((id) => ({
                    employee: { id, deletedAt: id === "dismissed" ? new Date() : null },
                })),
            }),
        };
        const employeeProject = {
            createManyAndReturn: vi.fn().mockResolvedValue([{ employeeId: "new" }]),
        };
        const tx = { project, team, employeeProject };
        const repository = new TeamsRepository({
            $transaction: vi.fn((fn) => fn(tx)),
        } as unknown as PrismaClient);
        return { repository, ...tx };
    };
    it("scopes both lookups and counts only inserted employees", async () => {
        const { repository, project, team, employeeProject } = setup();
        expect(await repository.addToProject("c", "p", "t")).toEqual({
            addedCount: 1,
            skipped: [
                { employeeId: "old", reason: "ALREADY_MEMBER" },
                { employeeId: "dismissed", reason: "DISMISSED" },
            ],
        });
        for (const [mock, id] of [
            [project, "p"],
            [team, "t"],
        ] as const)
            expect(mock.findUniqueOrThrow).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id, companyId: "c" } }),
            );
        expect(employeeProject.createManyAndReturn).toHaveBeenCalledWith(
            expect.objectContaining({
                skipDuplicates: true,
                data: ["new", "old"].map((employeeId) => ({
                    employeeId,
                    companyId: "c",
                    projectId: "p",
                })),
            }),
        );
    });
    it("does not insert when the tenant-scoped team lookup fails", async () => {
        const { repository, team, employeeProject } = setup();
        team.findUniqueOrThrow.mockRejectedValue(new Error("missing"));
        await expect(repository.addToProject("c", "p", "x")).rejects.toThrow("missing");
        expect(employeeProject.createManyAndReturn).not.toHaveBeenCalled();
    });
});
