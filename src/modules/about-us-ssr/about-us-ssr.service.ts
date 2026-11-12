import { aboutUsService } from "#modules/about-us/about-us.service.js";

export const aboutUsPageService = {
    async getPageData(companyId: string) {
        const aboutUsRecords = await aboutUsService.getAll(companyId);
        return { aboutUsRecords };
    },
};
