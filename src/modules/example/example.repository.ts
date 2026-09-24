import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { UUID } from "node:crypto";
import type { ExampleCreateInput, ExampleUpdateInput } from "./example.types";

export class ExampleRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: ExampleCreateInput) {
        return await this.db.example.create({ data });
    }

    async update(id: UUID, data: ExampleUpdateInput) {
        return await this.db.example.update({
            where: { id },
            data,
        });
    }

    async delete(id: UUID) {
        return await this.db.example.delete({
            where: { id },
        });
    }

    async getAll() {
        return await this.db.example.findMany();
    }

    async getById(id: UUID) {
        return await this.db.example.findUnique({
            where: { id },
        });
    }
}

export const exampleRepository = new ExampleRepository();