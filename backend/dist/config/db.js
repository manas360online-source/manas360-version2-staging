"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseStatus = exports.disconnectDatabase = exports.connectDatabase = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const env_1 = require("./env");
const connectionString = process.env.DATABASE_URL || '';
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = new client_1.PrismaClient({ adapter });
let isConnected = false;
const connectDatabase = async () => {
    if (isConnected)
        return;
    // Prisma connects lazily; a simple test query ensures the client can connect
    if (env_1.env.databaseUrl) {
        await exports.prisma.$connect();
    }
    isConnected = true;
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    if (!isConnected)
        return;
    await exports.prisma.$disconnect();
    isConnected = false;
};
exports.disconnectDatabase = disconnectDatabase;
const getDatabaseStatus = () => ({ isConnected });
exports.getDatabaseStatus = getDatabaseStatus;
exports.default = exports.prisma;
