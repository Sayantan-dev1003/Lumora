import { PrismaClient } from "@prisma/client";
import { NODE_ENV, DATABASE_URL } from "./env";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: NODE_ENV === "production" ? ["warn", "error"] : ["query", "info", "warn", "error"],
});

export default prisma;
