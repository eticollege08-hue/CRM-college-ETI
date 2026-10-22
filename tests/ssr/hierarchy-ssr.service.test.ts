import { beforeEach, describe, expect, it, vi } from "vitest";

import { hierarchyPageService } from "../../src/modules/hierarchy-ssr/hierarchy-ssr.service.js";

const { getEmployees, getRelationships } = vi.hoisted(() => ({
    getEmployees: vi.fn(),
    getRelationships: vi.fn(),
}));

vi.mock("#modules/employees/employee.service.js", () => ({
    employeeService: { getAll: getEmployees },
}));
vi.mock("#modules/hierarchy/hierarchy.service.js", () => ({
    hierarchyService: { getAll: getRelationships },
}));

const employee = (id: string) => ({
    id,
    fullName: "Employee",
    imageId: null,
    level: null,
    position: null,
});
const relationship = (employeeId: string, subordinateId: string) => ({
    id: `${employeeId}-${subordinateId}`,
    employeeId,
    subordinateId,
});

describe("hierarchyPageService", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getEmployees.mockResolvedValue([]);
        getRelationships.mockResolvedValue([]);
    });

    it("returns an empty tree when there are no employees", async () => {
        await expect(hierarchyPageService.hierarchyTree()).resolves.toEqual({ hierarchyTree: [] });
    });

    it("includes all employees without managers as roots and passes only required data", async () => {
        getEmployees.mockResolvedValue([employee("a"), employee("b")]);

        await expect(hierarchyPageService.hierarchyTree()).resolves.toEqual({
            hierarchyTree: [
                { id: "a", subordinates: [] },
                { id: "b", subordinates: [] },
            ],
        });
    });

    it("builds nested branches and keeps employees without relationships", async () => {
        getEmployees.mockResolvedValue(["a", "b", "c", "d", "isolated"].map(employee));
        getRelationships.mockResolvedValue([
            relationship("a", "b"),
            relationship("a", "c"),
            relationship("b", "d"),
        ]);

        await expect(hierarchyPageService.hierarchyTree()).resolves.toEqual({
            hierarchyTree: [
                {
                    id: "a",
                    subordinates: [
                        { id: "b", subordinates: [{ id: "d", subordinates: [] }] },
                        { id: "c", subordinates: [] },
                    ],
                },
                { id: "isolated", subordinates: [] },
            ],
        });
    });

    it("includes shared subordinates and their descendants under every manager", async () => {
        getEmployees.mockResolvedValue(["a", "b", "shared", "child"].map(employee));
        getRelationships.mockResolvedValue([
            relationship("a", "shared"),
            relationship("b", "shared"),
            relationship("shared", "child"),
        ]);
        const shared = { id: "shared", subordinates: [{ id: "child", subordinates: [] }] };

        await expect(hierarchyPageService.hierarchyTree()).resolves.toEqual({
            hierarchyTree: [
                { id: "a", subordinates: [shared] },
                { id: "b", subordinates: [shared] },
            ],
        });
    });

    it("builds a deep hierarchy without recursive calls", async () => {
        const depth = 12_000;
        getEmployees.mockResolvedValue(
            Array.from({ length: depth }, (_, index) => employee(String(index))),
        );
        getRelationships.mockResolvedValue(
            Array.from({ length: depth - 1 }, (_, index) =>
                relationship(String(index), String(index + 1)),
            ),
        );

        const { hierarchyTree } = await hierarchyPageService.hierarchyTree();

        expect(hierarchyTree).toHaveLength(1);
        let node = hierarchyTree[0];
        for (let index = 0; index < depth - 1; index++) {
            expect(node.id).toBe(String(index));
            node = node.subordinates[0];
        }
        expect(node).toEqual({ id: String(depth - 1), subordinates: [] });
        expect(getEmployees).toHaveBeenCalledOnce();
        expect(getRelationships).toHaveBeenCalledOnce();
    });

    it.each(["employees", "relationships"])("forwards errors from %s", async (source) => {
        const error = new Error("Lookup failed");
        const lookup = source === "employees" ? getEmployees : getRelationships;
        lookup.mockRejectedValue(error);

        await expect(hierarchyPageService.hierarchyTree()).rejects.toBe(error);
    });
});
