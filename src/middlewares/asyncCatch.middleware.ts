import type { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncCatch = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
