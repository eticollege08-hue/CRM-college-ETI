import { projectsService } from "#modules/projects/projects.service.js";

export const projectsPageService = {
    async getPageData(companyId: string) {
        const projects = await projectsService.getAll(companyId);
        return { projects };
    },
};
