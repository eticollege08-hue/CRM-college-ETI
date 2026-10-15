import { PrismaClient } from "@prisma/client";

// Connect lazily on the first query. Never log SQL, parameters or raw database errors.
const prisma = new PrismaClient({ log: [] });

export default prisma;
