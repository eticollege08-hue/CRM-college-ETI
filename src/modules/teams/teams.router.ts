import { Router } from "express";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { teamsController } from "./teams.controller.js";
import { teamSchema, memberSchema, memberParamsSchema } from "./teams.schema.js";
const router = Router();
const write = [accessFor(["OWNER", "MANAGER"]), checkAuthOrigin];
router.get("/", accessFor(ALL_ROLES), asyncCatch(teamsController.list));
router.get(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(teamsController.get),
);
router.post("/", ...write, validateBody(teamSchema), asyncCatch(teamsController.create));
router.patch(
    "/:id",
    ...write,
    validateParams(uuidSchema),
    validateBody(teamSchema),
    asyncCatch(teamsController.rename),
);
router.delete("/:id", ...write, validateParams(uuidSchema), asyncCatch(teamsController.remove));
router.get(
    "/:id/members",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(teamsController.members),
);
router.post(
    "/:id/members",
    ...write,
    validateParams(uuidSchema),
    validateBody(memberSchema),
    asyncCatch(teamsController.add),
);
router.delete(
    "/:id/members/:employeeId",
    ...write,
    validateParams(memberParamsSchema),
    asyncCatch(teamsController.drop),
);
export default router;
