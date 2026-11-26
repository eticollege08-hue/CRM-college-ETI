import { projectsService } from "#modules/projects/projects.service.js";

export const projectsPageService = {
    async getPageData(companyId: string) {
        const projects = await projectsService.getAll(companyId);
        return { projects };
    },
    async getProject(id: string, companyId: string) {
        const project = await projectsService.getById(id, companyId);
        return { project };
    },
    async getCreatePageData() {
        return {};
    },
};
