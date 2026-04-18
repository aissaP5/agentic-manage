import { Request, Response } from "express";
import { AppDataSource } from "../data-source.js";
import { User } from "../entities/User.js";
import { Progress } from "../entities/Progress.js";

export class UserController {
  // POST /api/users/login
  static async login(req: Request, res: Response): Promise<void> {
    const { name, password } = req.body;
    if (!name || name.trim().length === 0 || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const cleanedName = name.trim().toLowerCase();
    
    // Find
    let user = await userRepo.findOne({ where: { name: cleanedName } });
    
    if (user) {
      // Check password
      if (user.password !== password) {
        res.status(401).json({ error: "Incorrect password" });
        return;
      }
    } else {
      // Create
      user = userRepo.create({ name: cleanedName, password });
      await userRepo.save(user);
    }

    res.json(user);
  }

  // GET /api/users/:id/stats
  static async getStats(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: "User ID required" });
        return;
    }

    const progressRepo = AppDataSource.getRepository(Progress);
    
    // Calculate total XP (sum of quizScore) and topicsMastered (count where isCompleted = true)
    const stats = await progressRepo
        .createQueryBuilder("progress")
        .select("SUM(progress.quizScore)", "totalXp")
        .addSelect("COUNT(progress.id) FILTER (WHERE progress.isCompleted = true)", "topicsMastered")
        .where("progress.userId = :id", { id: Number(id) })
        .getRawOne();

    const xp = Math.floor(Number(stats?.totalXp || 0));
    const mastered = Number(stats?.topicsMastered || 0);
    
    // Calculate fun levels based on XP
    let level = "Beginner";
    if (xp > 500) level = "Explorer";
    if (xp > 1500) level = "Scholar";
    if (xp > 3000) level = "Master";

    res.json({
        xp,
        mastered,
        level
    });
  }
}
