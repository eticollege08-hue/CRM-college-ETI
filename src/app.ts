import express from "express";
import path from "path";
import nunjucks from "nunjucks";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import apiRoutes from "#routes/api/index.js";
import ssrRoutes from "#routes/ssr/index.js";

import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "src", "public")));
app.use(cookieParser());

const viewsPath = path.join(process.cwd(), "src", "views");

nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app,
    watch: process.env.NODE_ENV !== "production",
});

app.set("view engine", "njk");

app.use("/", ssrRoutes);
app.use("/api", apiRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV;

app.listen(PORT, () => {
    console.log(`Server is started on http://localhost:${PORT} in [${NODE_ENV}] mode`);
});
