import express from "express"

import exampleRoutes from "#example/example.router.js"

const router = express.Router()

router.use('/example', exampleRoutes)

export default router