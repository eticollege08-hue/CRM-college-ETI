import { getAuthUser } from "#utils/auth-user.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { teamsService } from "./teams.service.js";
import type { TeamsService } from "./teams.service.js";
import type { Request, Response } from "express";
export class TeamsController {
    constructor(private readonly service: TeamsService = teamsService) {
        this.list = this.list.bind(this);
        this.get = this.get.bind(this);
        this.create = this.create.bind(this);
        this.rename = this.rename.bind(this);
        this.remove = this.remove.bind(this);
        this.members = this.members.bind(this);
        this.add = this.add.bind(this);
        this.drop = this.drop.bind(this);
        this.addToProject = this.addToProject.bind(this);
    }
    async list(req: Request, res: Response) {
        const result = await this.service.list(getAuthUser(req).companyId);
        res.status(HttpStatus.OK).json({ success: true, teams: result });
    }
    async get(req: Request, res: Response) {
        const result = await this.service.get(getAuthUser(req).companyId, String(req.params.id));
        res.status(HttpStatus.OK).json({ success: true, team: result });
    }
    async create(req: Request, res: Response) {
        const result = await this.service.create(getAuthUser(req).companyId, req.body.name);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: "Team created",
            team: result,
        });
    }
    async rename(req: Request, res: Response) {
        const result = await this.service.rename(
            getAuthUser(req).companyId,
            String(req.params.id),
            req.body.name,
        );
        res.status(HttpStatus.OK).json({ success: true, message: "Team updated", team: result });
    }
    async remove(req: Request, res: Response) {
        await this.service.remove(getAuthUser(req).companyId, String(req.params.id));
        res.status(HttpStatus.OK).json({ success: true, message: "Team deleted" });
    }
    async members(req: Request, res: Response) {
        const result = await this.service.members(
            getAuthUser(req).companyId,
            String(req.params.id),
        );
        res.status(HttpStatus.OK).json({ success: true, members: result });
    }
    async add(req: Request, res: Response) {
        await this.service.add(
            getAuthUser(req).companyId,
            String(req.params.id),
            req.body.employeeId,
        );
        res.status(HttpStatus.CREATED).json({ success: true, message: "Member added" });
    }
    async drop(req: Request, res: Response) {
        await this.service.drop(
            getAuthUser(req).companyId,
            String(req.params.id),
            String(req.params.employeeId),
        );
        res.status(HttpStatus.OK).json({ success: true, message: "Member removed" });
    }
    async addToProject(req: Request, res: Response) {
        const result = await this.service.addToProject(
            getAuthUser(req).companyId,
            String(req.params.id),
            req.body.teamId,
        );
        res.status(HttpStatus.OK).json({ success: true, message: "Team processed", ...result });
    }
}
export const teamsController = new TeamsController();
