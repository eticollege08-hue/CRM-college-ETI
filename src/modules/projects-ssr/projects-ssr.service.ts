import { projectsService } from "#modules/projects/projects.service.js";

export const projectsPageService = {
    async getPageData() {
        const projects = await projectsService.getAll();
        return { projects };
    },
};
