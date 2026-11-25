import { randomBytes } from "node:crypto";
import { hashPassword } from "#utils/password.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { hierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { ApiError } from "#utils/error.util.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeePersonalDataService } from "./employee-personal-data.service.js";
import { employeeRepository } from "./employee.repository.js";

import type { Prisma } from "@prisma/client";
import type { HierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import type { JWT } from "#types/common.types.js";
import type { UserAccountService } from "#modules/user-accounts/user-account.service.js";
import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeePersonalDataService } from "./employee-personal-data.service.js";
import type {
    EmployeeCreateInput,
    EmployeeListQuery,
    EmployeeSalaryUpdateInput,
    EmployeeUpdateInput,
} from "./employee.types.js";

type EmployeeActor = Pick<JWT, "userId" | "role" | "companyId">;

export class EmployeeService {
    constructor(
        private readonly repository: EmployeeRepository = employeeRepository,
        private readonly hierarchy: HierarchyService = hierarchyService,
        private readonly userAccounts: UserAccountService = userAccountService,
        private readonly personalData: EmployeePersonalDataService = employeePersonalDataService,
    ) {}

    async getAll(actor: EmployeeActor | string) {
        const companyId = typeof actor === "string" ? actor : actor.companyId;
        const employees = await this.repository.getAll(companyId);
        if (typeof actor === "string") {
            return employees.map(({ compensation, ...employee }) => {
                void compensation;
                return employee;
            });
        }
        return await this.personalData.serializeMany(employees, actor);
    }

    async getById(id: string, actor: EmployeeActor | string) {
        const companyId = typeof actor === "string" ? actor : actor.companyId;
        const employee = await this.repository.getWithCompensation(id, companyId);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        if (typeof actor === "string") {
            const { compensation, ...publicEmployee } = employee;
            void compensation;
            return publicEmployee;
        }
        return await this.personalData.serialize(employee, actor);
    }

    async update(id: string, actor: EmployeeActor, data: EmployeeUpdateInput) {
        const { companyId } = actor;
        await this.getRawById(id, companyId);
        if (actor.role === "MANAGER") await this.checkDirectManager(id, actor);
        return await this.repository.update(id, companyId, data);
    }

    async updateSalary(id: string, actor: EmployeeActor, data: EmployeeSalaryUpdateInput) {
        const employee = await this.getRawById(id, actor.companyId);
        if (!(await this.personalData.mayAccess(actor, employee, "salary", "edit"))) {
            throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        }
        return await this.repository.upsertCompensation(
            id,
            actor.companyId,
            data.salary,
            data.currency,
        );
    }

    async list(actor: EmployeeActor, query: EmployeeListQuery) {
        const rows = await this.repository.getAll(actor.companyId, query);
        return {
            employees: await this.personalData.serializeMany(rows.slice(0, query.limit), actor),
            hasNext: rows.length > query.limit,
            page: query.page,
            limit: query.limit,
        };
    }
    async create(actor: EmployeeActor, data: EmployeeCreateInput) {
        if (actor.role !== "OWNER" && (actor.role !== "RECRUITER" || data.role === "OWNER"))
            throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        try {
            return await this.repository.create(
                actor.companyId,
                data,
                await hashPassword(randomBytes(32).toString("hex")),
            );
        } catch (error) {
            if (error && typeof error === "object" && "code" in error && error.code === "P2002")
                throw new ApiError(HttpStatus.CONFLICT, "Email is unavailable.");
            throw error;
        }
    }
    async dismiss(id: string, actor: EmployeeActor, replacement: string | null | undefined) {
        return this.repository.dismiss(id, actor.companyId, actor.userId, replacement);
    }
    async getPhoto(id: string, actor: EmployeeActor) {
        const photo = await this.repository.getPhoto(id, actor.companyId);
        if (!photo) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        return photo;
    }
    async putPhoto(id: string, actor: EmployeeActor, type: string, bytes: unknown) {
        const self = await this.userAccounts.getEmployeeByAccountId(actor.userId);
        if (self?.id !== id || self.companyId !== actor.companyId)
            throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        if (
            !Buffer.isBuffer(bytes) ||
            !(
                (type === "image/png" &&
                    bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") ||
                (type === "image/jpeg" && bytes.subarray(0, 3).toString("hex") === "ffd8ff") ||
                (type === "image/webp" &&
                    bytes.toString("ascii", 0, 4) === "RIFF" &&
                    bytes.toString("ascii", 8, 12) === "WEBP")
            )
        )
            throw new ApiError(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Choose a JPEG, PNG or WebP photo.",
            );
        await this.repository.putPhoto(id, actor.companyId, type, bytes);
    }

    private async checkDirectManager(id: string, actor: EmployeeActor) {
        const actorEmployee = await this.userAccounts.getEmployeeByAccountId(actor.userId);
        const isManager =
            actorEmployee !== null &&
            actorEmployee.companyId === actor.companyId &&
            (await this.hierarchy.isManager(id, actorEmployee.id, actor.companyId));

        if (!isManager) {
            throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        }
    }

    private async getRawById(id: string, companyId: string, tx?: Prisma.TransactionClient) {
        const employee = await this.repository.getById(id, companyId, tx);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        return employee;
    }
}

export const employeeService = new EmployeeService();
