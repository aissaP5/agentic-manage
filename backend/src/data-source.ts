import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User.js";
import { LearningPlan } from "./entities/LearningPlan.js";
import { Progress } from "./entities/Progress.js";
import { Knowledge } from "./entities/Knowledge.js";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "agentic_learning",
    synchronize: true, // Auto-create tables for development
    logging: false,
    entities: [User, LearningPlan, Progress, Knowledge],
    subscribers: [],
    migrations: [],
});
