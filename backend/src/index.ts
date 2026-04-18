import "reflect-metadata";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./data-source.js";
import { LearningController } from "./controllers/LearningController.js";
import { UserController } from "./controllers/UserController.js";
import { ProgressController } from "./controllers/ProgressController.js";

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.post("/api/learn", LearningController.createLearningPlan);
app.get("/api/users/:userId/plans", LearningController.getUserPlans);
app.put("/api/plans/:id", LearningController.updatePlan);
app.post("/api/plans/:id/refine", LearningController.chatRefine);

// Auth & Progress Routes
app.post("/api/users/login", UserController.login);
app.get("/api/users/:id/stats", UserController.getStats);
app.post("/api/progress/quiz", ProgressController.completeQuiz);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize().then(async () => {
    // Ensure pgvector is active before we do any operations
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log("Connected to PostgreSQL DB with pgvector");
    
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
}).catch(error => console.log("Database connection error: ", error));
