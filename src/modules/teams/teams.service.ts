import { teamsRepository } from "./teams.repository.js";
import type { TeamsRepository } from "./teams.repository.js";
function summary(row: { id: string; name: string; _count: { members: number } }) {
    return { id: row.id, name: row.name, memberCount: row._count.members };
}
export class TeamsService {
    constructor(private readonly repository: TeamsRepository = teamsRepository) {}
    async list(companyId: string) {
        return (await this.repository.list(companyId)).map(summary);
    }
    async get(companyId: string, id: string) {
        return summary(await this.repository.get(companyId, id));
    }
    async create(companyId: string, name: string) {
        return summary(await this.repository.create(companyId, name));
    }
    async rename(companyId: string, id: string, name: string) {
        return summary(await this.repository.rename(companyId, id, name));
    }
    remove(companyId: string, id: string) {
        return this.repository.remove(companyId, id);
    }
    async members(companyId: string, id: string) {
        const { members } = await this.repository.members(companyId, id);
        return members.map(({ employee }) => ({
            id: employee.id,
            name: employee.fullName,
            position: employee.position,
            photo: employee.imageId ? `/api/employees/${employee.id}/photo` : null,
        }));
    }
    add(companyId: string, id: string, employeeId: string) {
        return this.repository.add(companyId, id, employeeId);
    }
    drop(companyId: string, id: string, employeeId: string) {
        return this.repository.drop(companyId, id, employeeId);
    }
    addToProject(companyId: string, projectId: string, teamId: string) {
        return this.repository.addToProject(companyId, projectId, teamId);
    }
}
export const teamsService = new TeamsService();
