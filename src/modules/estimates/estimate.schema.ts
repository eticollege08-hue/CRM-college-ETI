import { z } from "zod";

import { ESTIMATE_PAGINATION } from "./estimate.constants.js";

const paymentRegex = /^\d+(\.\d{1,2})?$/;

const positivePaymentSchema = z
    .union([z.number(), z.string()])
    .refine((val) => {
        const num = typeof val === "number" ? val : Number(val);
        if (Number.isNaN(num) || num <= 0) return false;
        return paymentRegex.test(String(val));
    }, "Payment must be greater than 0 and have at most 2 decimal places.")
    .transform((val) => (typeof val === "number" ? val : Number(val)));

export const estimateCreateSchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(1, "Name is required.")
        .max(100, "Name must not exceed 100 characters."),
    description: z
        .string()
        .trim()
        .min(1, "Description is required.")
        .max(1000, "Description must not exceed 1000 characters."),
    time: z.number().positive("Time must be greater than 0.").nullable().optional(),
    payment: positivePaymentSchema.nullable().optional(),
});

export const estimateUpdateSchema = z
    .strictObject({
        name: z
            .string()
            .trim()
            .min(1, "Name is required.")
            .max(100, "Name must not exceed 100 characters.")
            .optional(),
        description: z
            .string()
            .trim()
            .min(1, "Description is required.")
            .max(1000, "Description must not exceed 1000 characters.")
            .optional(),
        time: z.number().positive("Time must be greater than 0.").nullable().optional(),
        payment: positivePaymentSchema.nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

export const estimateListQuerySchema = z.strictObject({
    page: z
        .union([z.string(), z.number()])
        .optional()
        .transform((val) => {
            if (val === undefined || val === null || val === "")
                return ESTIMATE_PAGINATION.DEFAULT_PAGE;
            const parsed = typeof val === "number" ? val : parseInt(val, 10);
            return Number.isInteger(parsed) && parsed > 0
                ? parsed
                : ESTIMATE_PAGINATION.DEFAULT_PAGE;
        }),
    pageSize: z
        .union([z.string(), z.number()])
        .optional()
        .transform((val) => {
            if (val === undefined || val === null || val === "")
                return ESTIMATE_PAGINATION.DEFAULT_PAGE_SIZE;
            const parsed = typeof val === "number" ? val : parseInt(val, 10);
            if (!Number.isInteger(parsed) || parsed < 1)
                return ESTIMATE_PAGINATION.DEFAULT_PAGE_SIZE;
            return Math.min(parsed, ESTIMATE_PAGINATION.MAX_PAGE_SIZE);
        }),
    search: z.string().trim().optional(),
    sortBy: z.enum(["name", "createdAt"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
