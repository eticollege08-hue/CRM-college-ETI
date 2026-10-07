import express from "express";
import path from "node:path";
import swaggerUi from "swagger-ui-express";

const router = express.Router();
const specificationPath = path.resolve(process.cwd(), "docs", "openapi.yaml");

router.get("/openapi.yaml", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(specificationPath);
});

router.use(
    "/",
    swaggerUi.serve,
    swaggerUi.setup(null, {
        customSiteTitle: "CRM API Documentation",
        swaggerOptions: {
            url: "/api/docs/openapi.yaml",
            withCredentials: true,
            supportedSubmitMethods: [],
        },
    }),
);

export default router;
