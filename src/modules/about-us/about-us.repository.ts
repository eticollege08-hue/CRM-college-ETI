import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { AboutUsCreateInput, AboutUsUpdateInput } from "./about-us.types.js";

export class AboutUsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: AboutUsCreateInput, companyId: string) {
        return await this.db.aboutUs.create({ data: { ...data, companyId } });
    }

    async getAll(companyId: string) {
        return await this.db.aboutUs.findMany({ where: { companyId } });
    }

    async getById(id: string, companyId: string) {
        return await this.db.aboutUs.findUnique({ where: { id, companyId } });
    }

    async update(id: string, companyId: string, data: AboutUsUpdateInput) {
        return await this.db.aboutUs.update({ where: { id, companyId }, data });
    }

    async delete(id: string, companyId: string) {
        return await this.db.aboutUs.delete({ where: { id, companyId } });
    }
}

export const aboutUsRepository = new AboutUsRepository();
