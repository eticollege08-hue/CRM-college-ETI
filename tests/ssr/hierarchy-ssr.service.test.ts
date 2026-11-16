import { beforeEach, describe, expect, it, vi } from "vitest";

import { hierarchyPageService } from "../../src/modules/hierarchy-ssr/hierarchy-ssr.service.js";

const { getEmployees, getRelationships, getProfile } = vi.hoisted(() => ({
    getEmployees: vi.fn(),
    getRelationships: vi.fn(),
    getProfile: vi.fn(),
}));

vi.mock("#modules/employees/employee.service.js", () => ({
    employeeService: { getAll: getEmployees },
}));
vi.mock("#modules/hierarchy/hierarchy.service.js", () => ({
    hierarchyService: { getAll: getRelationships },
}));
vi.mock("#modules/user-accounts/user-account.service.js", () => ({
    userAccountService: { getProfileById: getProfile },
}));

const accountId = "account";
const companyId = "company";
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
        getProfile.mockResolvedValue({
            email: "employee@example.com",
            roleKey: "WORKER",
            employee: employee("current"),
        });
    });

    it("returns an empty tree when there are no employees", async () => {
        await expect(
            hierarchyPageService.hierarchyTree(accountId, companyId),
        ).resolves.toMatchObject({
            hierarchyTree: [],
        });
    });

    it("includes all employees without managers as roots", async () => {
        getEmployees.mockResolvedValue([employee("a"), employee("b")]);

        await expect(
            hierarchyPageService.hierarchyTree(accountId, companyId),
        ).resolves.toMatchObject({
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

        await expect(
            hierarchyPageService.hierarchyTree(accountId, companyId),
        ).resolves.toMatchObject({
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

        await expect(
            hierarchyPageService.hierarchyTree(accountId, companyId),
        ).resolves.toMatchObject({
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

        const { hierarchyTree } = await hierarchyPageService.hierarchyTree(accountId, companyId);

        expect(hierarchyTree).toHaveLength(1);
        let node = hierarchyTree[0];
        for (let index = 0; index < depth - 1; index++) {
            expect(node.id).toBe(String(index));
            node = node.subordinates[0];
        }
        expect(node).toMatchObject({ id: String(depth - 1), subordinates: [] });
        expect(getEmployees).toHaveBeenCalledExactlyOnceWith(companyId);
        expect(getRelationships).toHaveBeenCalledExactlyOnceWith(companyId);
    });

    it("loads the authenticated profile and includes employee and manager metadata", async () => {
        const employees = [employee("manager"), employee("subordinate")];
        const relationships = [relationship("manager", "subordinate")];
        getEmployees.mockResolvedValue(employees);
        getRelationships.mockResolvedValue(relationships);

        const result = await hierarchyPageService.hierarchyTree(accountId, companyId);

        expect(getProfile).toHaveBeenCalledExactlyOnceWith(accountId);
        expect(result).toMatchObject({
            employees,
            relationships,
            profile: { email: "employee@example.com", initials: "E" },
            hierarchyTree: [
                {
                    ...employee("manager"),
                    initials: "E",
                    levelLabel: "",
                    subordinates: [
                        {
                            id: "subordinate",
                            managerIds: ["manager"],
                            managerNames: ["Employee"],
                            managerRelationshipIds: ["manager-subordinate"],
                        },
                    ],
                },
            ],
        });
    });

    it.each(["employees", "relationships", "profile"])(
        "forwards errors from %s",
        async (source) => {
            const error = new Error("Lookup failed");
            const lookup =
                source === "employees"
                    ? getEmployees
                    : source === "relationships"
                      ? getRelationships
                      : getProfile;
            lookup.mockRejectedValue(error);

            await expect(hierarchyPageService.hierarchyTree(accountId, companyId)).rejects.toBe(
                error,
            );
        },
    );
});
