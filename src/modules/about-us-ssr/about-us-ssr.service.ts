import { aboutUsService } from "#modules/about-us/about-us.service.js";

export const aboutUsPageService = {
    async getPageData() {
        const aboutUsRecords = await aboutUsService.getAll();
        return { aboutUsRecords };
    },
};
