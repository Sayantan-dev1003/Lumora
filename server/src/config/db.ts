import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, PoolConfig } from "@neondatabase/serverless";
import { DATABASE_URL, NODE_ENV } from "./env";

const pool = new Pool({ connectionString: DATABASE_URL } as PoolConfig);
const adapter = new PrismaNeon(pool);

const prisma = new PrismaClient({
  adapter,
  log:
    NODE_ENV === "production"
      ? ["warn", "error"]
      : ["error"],
});

export default prisma;
