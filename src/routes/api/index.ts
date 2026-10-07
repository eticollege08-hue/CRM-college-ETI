import express from "express";

import docsRouter from "#modules/docs/docs.router.js";

const router = express.Router();

router.use("/docs", docsRouter);

export default router;
