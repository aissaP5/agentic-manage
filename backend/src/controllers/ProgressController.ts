import { Request, Response } from "express";
import { AppDataSource } from "../data-source.js";
import { Progress } from "../entities/Progress.js";
import { User } from "../entities/User.js";
import { LearningPlan } from "../entities/LearningPlan.js";

export class ProgressController {
  // POST /api/progress/quiz
  static async completeQuiz(req: Request, res: Response): Promise<void> {
    const { userId, planId, topicName, quizScore } = req.body;
    
    if (!userId || !topicName || quizScore === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const progressRepo = AppDataSource.getRepository(Progress);
    
    // Find existing progress or create new one
    let progress = await progressRepo.findOne({
      where: {
        user: { id: userId },
        topicName: topicName
      }
    });

    if (!progress) {
      progress = new Progress();
      // Only set associations if creating new
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: userId });
      if (user) progress.user = user;

      if (planId) {
        const planRepo = AppDataSource.getRepository(LearningPlan);
        const plan = await planRepo.findOneBy({ id: planId });
        if (plan) progress.plan = plan;
      }
      
      progress.topicName = topicName;
    }

    // Only update score if it's higher than previous best, or if none exists
    const currentScore = progress.quizScore || 0;
    if (quizScore > currentScore) {
      progress.quizScore = quizScore;
    }
    
    progress.isCompleted = true;
    
    await progressRepo.save(progress);

    res.json(progress);
  }
}
