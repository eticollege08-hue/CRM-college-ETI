import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
});

async function testConnection() {
    try {
        await prisma.$connect();
        console.log("✅ Database was connected");
    } catch (err: unknown) {
        console.error("❌ Prisma Connection Error:", err instanceof Error ? err.message : err);
    }
}

testConnection();

export default prisma;
