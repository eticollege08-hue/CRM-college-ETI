import { describe, it, expect, vi } from "vitest";
import { TeamsService } from "../../src/modules/teams/teams.service.js";
import { TeamsRepository } from "../../src/modules/teams/teams.repository.js";
describe("Teams service", () => {
    it("returns counts from the active-members query", async () => {
        const repo = new TeamsRepository();
        vi.spyOn(repo, "list").mockResolvedValue([{ id: "t", name: "QA", _count: { members: 2 } }]);
        expect(await new TeamsService(repo).list("c")).toEqual([
            { id: "t", name: "QA", memberCount: 2 },
        ]);
    });
    it("returns only picker fields and a protected photo URL", async () => {
        const repo = new TeamsRepository();
        vi.spyOn(repo, "members").mockResolvedValue({
            members: [
                { employee: { id: "e", fullName: "Alice", position: null, imageId: "photo" } },
            ],
        });
        expect(await new TeamsService(repo).members("c", "t")).toEqual([
            { id: "e", name: "Alice", position: null, photo: "/api/employees/e/photo" },
        ]);
    });
});
