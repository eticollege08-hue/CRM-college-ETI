import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import path from "node:path";
import nunjucks from "nunjucks";

import { getAuthAllowedOrigins, getAuthCookieSecure, getBcryptCost } from "#config/auth.config.js";
import { getJwtConfig } from "#config/jwt.config.js";
import { errorHandler } from "#middlewares/error.middleware.js";
import apiRoutes from "#routes/api/index.js";
import ssrRoutes from "#routes/ssr/index.js";

getJwtConfig();
getAuthAllowedOrigins();
getAuthCookieSecure();
getBcryptCost();

const app = express();
app.set("trust proxy", false);
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "src", "public")));

nunjucks.configure(path.join(process.cwd(), "src", "views"), {
    autoescape: true,
    express: app,
    watch: process.env.NODE_ENV !== "production",
});
app.set("view engine", "njk");
app.use("/", ssrRoutes);
app.use("/api", apiRoutes);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Server is started on port " + port);
});
