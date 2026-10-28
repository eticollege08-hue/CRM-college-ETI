import express from "express";

import authRoutes from "#modules/auth/auth.routes.js";
import docsRouter from "#modules/docs/docs.router.js";

const router = express.Router();

router.use("/docs", docsRouter);
router.use("/auth", authRoutes);

export default router;
