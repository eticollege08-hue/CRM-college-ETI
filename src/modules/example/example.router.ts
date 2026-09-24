import express from 'express';
import { exampleController } from './example.controller.js';
import { exampleCreateSchema, exampleUpdateSchema } from './example.schema.js';
import { uuidSchema } from '#schemas/id.schema.js';
import { validateBody, validateParams } from '../../middlewares/validate.middleware.js';
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

const router = express.Router();

router.get('/', asyncCatch(exampleController.getAll));
router.get('/:id', validateParams(uuidSchema), asyncCatch(exampleController.getById));

router.post('/', validateBody(exampleCreateSchema), asyncCatch(exampleController.create));

router.patch('/:id', validateParams(uuidSchema), validateBody(exampleUpdateSchema), asyncCatch(exampleController.update));

router.delete('/:id', validateParams(uuidSchema), asyncCatch(exampleController.delete));

export default router;