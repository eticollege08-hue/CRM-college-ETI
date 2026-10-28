import express from "express";

import authPageRoutes from "#modules/auth-ssr/auth-ssr.routes.js";

const router = express.Router();

router.use("/", authPageRoutes);
router.use("/", hierarchyPageRoutes);
router.use("/", calendarPageRoutes);

export default router;
