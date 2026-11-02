import { employeeService } from "#modules/employees/employee.service.js";
import { hierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";

type Employee = Awaited<ReturnType<typeof employeeService.getAll>>[number];

interface HierarchyNode extends Employee {
    initials: string;
    levelLabel: string;
    subordinates: HierarchyNode[];
    managerNames: string[];
    managerIds: string[];
    managerRelationshipIds: string[];
}

export const hierarchyPageService = {
    async hierarchyTree(accountId: string) {
        const [employees, relationships, account] = await Promise.all([
            employeeService.getAll(),
            hierarchyService.getAll(),
            userAccountService.getProfileById(accountId),
        ]);

        const nodes = new Map<string, HierarchyNode>(
            employees.map((employee) => [
                employee.id,
                {
                    ...employee,
                    initials: (employee.fullName ?? "?")
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toLocaleUpperCase() ?? "")
                        .join(""),
                    levelLabel: employee.level
                        ? /^level\s/i.test(employee.level)
                            ? employee.level
                            : `Level ${employee.level}`
                        : "",
                    subordinates: [],
                    managerNames: [],
                    managerIds: [],
                    managerRelationshipIds: [],
                },
            ]),
        );
        const subordinateIds = new Set<string>();

        for (const relationship of relationships) {
            const manager = nodes.get(relationship.employeeId);
            const subordinate = nodes.get(relationship.subordinateId);
            if (!manager || !subordinate) continue;

            subordinate.managerIds.push(manager.id);
            subordinate.managerNames.push(manager.fullName ?? "Unnamed employee");
            subordinate.managerRelationshipIds.push(relationship.id);
            manager.subordinates.push(subordinate);
            subordinateIds.add(subordinate.id);
        }

        const hierarchyTree = [...nodes.values()].filter((node) => !subordinateIds.has(node.id));
        const initials = (account.employee.fullName ?? "?")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toLocaleUpperCase() ?? "")
            .join("");
        return { hierarchyTree, employees, relationships, profile: { ...account, initials } };
    },
};
