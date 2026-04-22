import { Request, Response } from "express";
import { AppDataSource } from "../data-source.js";
import { Progress } from "../entities/Progress.js";
import { User } from "../entities/User.js";
import { LearningPlan } from "../entities/LearningPlan.js";
import { AgentOrchestrator } from "../services/AgentOrchestrator.js";
import { Achievement } from "../entities/Achievement.js";

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

    // Achievement Logic
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: userId });
    
    if (user && quizScore === 100) {
        await this.awardAchievement(user, "QUIZ_WHIZ", "Quiz Master", "Perfect score on a topic quiz!");
    }

    if (user && planId) {
        await this.checkPlanMilestones(user, planId);
    }

    // Fetch the latest achievement if it was earned in this request
    const latestAchievement = await AppDataSource.getRepository(Achievement).findOne({
        where: { user: { id: userId } },
        order: { earnedAt: "DESC" }
    });

    const wasEarnedNow = latestAchievement && (new Date().getTime() - latestAchievement.earnedAt.getTime() < 5000);

    res.json({ 
        progress, 
        achievement: wasEarnedNow ? latestAchievement : null 
    });
  }

  // POST /api/progress/evaluate
  static async evaluateExercise(req: Request, res: Response): Promise<void> {
    const { userId, planId, topicName, exercise, submission } = req.body;

    if (!userId || !topicName || !exercise || !submission) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const evaluation = await AgentOrchestrator.evaluateExercise(topicName, exercise, submission);
      
      const progressRepo = AppDataSource.getRepository(Progress);
      let progress = await progressRepo.findOne({
        where: { user: { id: userId }, topicName: topicName }
      });

      if (!progress) {
        progress = new Progress();
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

      // Add score to existing quiz score (as XP) or update it
      // For simplicity, let's say exercise scores also contribute to progress
      const currentScore = progress.quizScore || 0;
      progress.quizScore = currentScore + Math.floor(evaluation.score / 10); // Exercises give less XP than quizzes
      progress.isCompleted = true;

      await progressRepo.save(progress);

      // Fetch the latest achievement if it was earned in this request
      const latestAchievement = await AppDataSource.getRepository(Achievement).findOne({
          where: { user: { id: userId } },
          order: { earnedAt: "DESC" }
      });

      const wasEarnedNow = latestAchievement && (new Date().getTime() - latestAchievement.earnedAt.getTime() < 5000);

      res.json({
        evaluation,
        totalXp: progress.quizScore,
        achievement: wasEarnedNow ? latestAchievement : null
      });

      // Achievement logic
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: userId });
      if (user && evaluation.score >= 90) {
        await this.awardAchievement(user, "EXERCISE_STAR", "Brilliant Mind", "Exceptional performance on a practice exercise!");
      }

    } catch (error) {
      console.error("Evaluation error:", error);
      res.status(500).json({ error: "Failed to evaluate exercise" });
    }
  }

  private static async awardAchievement(user: User, type: string, title: string, description: string) {
    const achievementRepo = AppDataSource.getRepository(Achievement);
    
    // Check if already earned
    const existing = await achievementRepo.findOneBy({ user: { id: user.id }, type });
    if (existing) return;

    const achievement = new Achievement();
    achievement.user = user;
    achievement.type = type;
    achievement.title = title;
    achievement.description = description;
    await achievementRepo.save(achievement);
    console.log(`🏆 Achievement Awarded: ${title} to User ${user.id}`);
  }

  private static async checkPlanMilestones(user: User, planId: number) {
    const planRepo = AppDataSource.getRepository(LearningPlan);
    const progressRepo = AppDataSource.getRepository(Progress);
    
    const plan = await planRepo.findOneBy({ id: planId });
    if (!plan) return;

    const allTopics = plan.planData.plan.flatMap((p: any) => p.topics);
    const completedProgress = await progressRepo.find({
        where: { user: { id: user.id }, plan: { id: planId }, isCompleted: true }
    });

    const completedTopics = completedProgress.map(p => p.topicName);
    
    // Check Subject Master
    if (allTopics.every((t: string) => completedTopics.includes(t))) {
        await this.awardAchievement(user, "SUBJECT_MASTER", `Master of ${plan.topic}`, `Successfully completed all modules in ${plan.topic}!`);
    }

    // Check Phase Masters (Week-wise)
    for (const phase of plan.planData.plan) {
        if (phase.topics.every((t: string) => completedTopics.includes(t))) {
            await this.awardAchievement(user, `PHASE_${phase.week}_MASTER`, `Phase ${phase.week} Completed`, `Mastered all topics in ${phase.phase || 'Week ' + phase.week}.`);
        }
    }
  }
  // POST /api/progress/phase-exam
  static async completePhaseExam(req: Request, res: Response): Promise<void> {
    const { userId, planId, phaseIndex, score, totalQuestions } = req.body;
    
    if (!userId || !planId || phaseIndex === undefined || score === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const pct = (score / totalQuestions) * 100;
    if (pct < 70) {
      res.json({ success: false, message: "Exam failed. Score at least 70% to earn achievement." });
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const planRepo = AppDataSource.getRepository(LearningPlan);
    const user = await userRepo.findOneBy({ id: userId });
    const plan = await planRepo.findOneBy({ id: planId });

    if (user && plan) {
        const phase = plan.planData.plan[Number(phaseIndex)];
        const phaseTitle = phase?.title || `Phase ${phase?.week || phaseIndex}`;
        
        await this.awardAchievement(
            user, 
            `PHASE_${phaseIndex}_CERTIFIED`, 
            `Certified: ${phaseTitle}`, 
            `Passed the final exam for ${phaseTitle} with ${Math.round(pct)}%!`
        );

        const latestAchievement = await AppDataSource.getRepository(Achievement).findOne({
            where: { user: { id: userId } },
            order: { earnedAt: "DESC" }
        });

        res.json({ success: true, achievement: latestAchievement });
    } else {
        res.status(404).json({ error: "User or Plan not found" });
    }
  }
}
