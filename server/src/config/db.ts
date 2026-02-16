import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { DATABASE_URL, NODE_ENV } from "./env";

const adapter = new PrismaNeon({
  connectionString: DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log:
    NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

export default prisma;
