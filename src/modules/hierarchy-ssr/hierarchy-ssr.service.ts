import { employeeService } from "#modules/employees/employee.service.js";
import { hierarchyService } from "#modules/hierarchy/hierarchy.service.js";

interface HierarchyNode {
    id: string;
    subordinates: HierarchyNode[];
}

export const hierarchyPageService = {
    async hierarchyTree() {
        const [employees, relationships] = await Promise.all([
            employeeService.getAll(),
            hierarchyService.getAll(),
        ]);

        const nodes = new Map<string, HierarchyNode>(
            employees.map(({ id }) => [id, { id, subordinates: [] }]),
        );
        const subordinateIds = new Set<string>();

        for (const relationship of relationships) {
            const manager = nodes.get(relationship.employeeId);
            const subordinate = nodes.get(relationship.subordinateId);
            if (!manager || !subordinate) continue;

            manager.subordinates.push(subordinate);
            subordinateIds.add(subordinate.id);
        }

        const hierarchyTree = [...nodes.values()].filter((node) => !subordinateIds.has(node.id));
        return { hierarchyTree };
    },
};
