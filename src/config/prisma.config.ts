import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database was connected");
  } catch (err: any) {
    console.error("❌ Prisma Connection Error:", err.message);
  }
}

testConnection();

export default prisma;