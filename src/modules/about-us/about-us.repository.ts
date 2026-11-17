import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { AboutUsCreateInput, AboutUsUpdateInput } from "./about-us.types.js";

export class AboutUsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: AboutUsCreateInput) {
        const lastRecord = await this.db.aboutUs.findFirst({ orderBy: { sortOrder: "desc" } });
        return await this.db.aboutUs.create({
            data: { ...data, sortOrder: (lastRecord?.sortOrder ?? -1) + 1 },
        });
    }

    async getAll() {
        return await this.db.aboutUs.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
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

    async reorder(ids: string[]) {
        await this.db.$transaction(
            ids.map((id, sortOrder) =>
                this.db.aboutUs.update({ where: { id }, data: { sortOrder } }),
            ),
        );
        return await this.getAll();
    }
}

export const aboutUsRepository = new AboutUsRepository();
