import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

// Neon's serverless driver speaks HTTP/WebSocket and only reaches Neon (or a
// WebSocket proxy). Self-hosted deployments on plain Postgres use the standard
// pg adapter in production too.
const isNeon = /\.neon\.(tech|build)/.test(connectionString);
const adapter =
  process.env.NODE_ENV === "production" && isNeon
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

export { prisma };
