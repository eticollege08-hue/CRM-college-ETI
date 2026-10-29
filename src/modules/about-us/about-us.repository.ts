import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { AboutUsCreateInput, AboutUsUpdateInput } from "./about-us.types.js";

export class AboutUsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: AboutUsCreateInput) {
        return await this.db.aboutUs.create({ data });
    }

    async getAll() {
        return await this.db.aboutUs.findMany();
    }

    async getById(id: string) {
        return await this.db.aboutUs.findUnique({ where: { id } });
    }

    async update(id: string, data: AboutUsUpdateInput) {
        return await this.db.aboutUs.update({ where: { id }, data });
    }

    async delete(id: string) {
        return await this.db.aboutUs.delete({ where: { id } });
    }
}

export const aboutUsRepository = new AboutUsRepository();
