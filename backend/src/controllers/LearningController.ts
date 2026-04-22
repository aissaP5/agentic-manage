import { Request, Response } from "express";
import { AgentOrchestrator } from "../services/AgentOrchestrator.js";
import { AppDataSource } from "../data-source.js";
import { LearningPlan } from "../entities/LearningPlan.js";
import { User } from "../entities/User.js";

export class LearningController {
  static async createLearningPlan(req: Request, res: Response) {
    try {
      const { topic, duration, userId } = req.body;

      if (!topic || !userId) {
        return res.status(400).json({ error: "Topic and userId are required" });
      }

      // Step 1: Call Orchestrator
      console.log(`🚀 Starting plan generation for: ${topic}`);
      const planData = await AgentOrchestrator.generateLearningPlan(topic, duration);
      console.log("✅ AI Plan generated successfully");

      // Step 2: Save to DB
      const planRepository = AppDataSource.getRepository(LearningPlan);
      const userRepository = AppDataSource.getRepository(User);

      // Verify user exists
      const user = await userRepository.findOneBy({ id: Number(userId) });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const newPlan = new LearningPlan();
      newPlan.topic = topic;
      newPlan.duration = duration || planData.estimatedDuration || "Unknown";
      newPlan.planData = planData;
      newPlan.user = user;

      await planRepository.save(newPlan);
      console.log("📂 Plan saved to DB with ID:", newPlan.id);

      res.json({
        message: "Plan generated successfully",
        planId: newPlan.id,
        data: planData
      });

    } catch (error: any) {
      console.error("❌ Error in createLearningPlan:", error);
      res.status(500).json({ 
        error: "An error occurred while generating the plan",
        details: error.message || "Unknown error"
      });
    }
  }

  static async getUserPlans(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const planRepository = AppDataSource.getRepository(LearningPlan);
      
      const plans = await planRepository.find({
        where: { user: { id: Number(userId) } },
        order: { createdAt: "DESC" }
      });
      
      res.json(plans);
    } catch (error) {
       res.status(500).json({ error: "Failed to fetch plans" });
    }
  }

  static async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { planData } = req.body;
      
      const planRepository = AppDataSource.getRepository(LearningPlan);
      const plan = await planRepository.findOneBy({ id: Number(id) });
      
      if (!plan) {
         return res.status(404).json({ error: "Plan not found" });
      }
      
      plan.planData = planData;
      await planRepository.save(plan);
      
      res.json({ message: "Plan updated successfully", data: plan.planData });
    } catch (error) {
       res.status(500).json({ error: "Failed to update plan" });
    }
  }

  static async chatRefine(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      if (!message) return res.status(400).json({ error: "Message is required" });

      const planRepository = AppDataSource.getRepository(LearningPlan);
      const plan = await planRepository.findOneBy({ id: Number(id) });
      
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      // Call AI to refine the JSON
      const updatedPlanData = await AgentOrchestrator.refinePlan(plan.planData, message);
      
      // Save
      plan.planData = updatedPlanData;
      await planRepository.save(plan);
      
      res.json({ message: "Plan refined successfully", data: updatedPlanData });
    } catch (error: any) {
        console.error("ChatRefine error:", error);
        res.status(500).json({ error: "AI Refinement failed", details: error.message });
    }
  }

  /**
   * Generates missing details for a topic on-demand.
   */
  static async generateTopicDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { topicName } = req.body;

      if (!topicName) return res.status(400).json({ error: "Topic name is required" });

      const planRepository = AppDataSource.getRepository(LearningPlan);
      const plan = await planRepository.findOneBy({ id: Number(id) });

      if (!plan) return res.status(404).json({ error: "Plan not found" });

      // Check if topic content already exists
      const existing = plan.planData.content.find((c: any) => c.topic === topicName && c.sections);
      if (existing) {
        return res.json({ message: "Content already exists", data: existing });
      }

      // Generate
      console.log(`📡 Controller: Requesting details for [${topicName}]...`);
      const details = await AgentOrchestrator.generateTopicDetails(plan.topic, topicName);

      // Merge into planData
      // If we had a partial object (only topic name), remove it first
      plan.planData.content = plan.planData.content.filter((c: any) => c.topic !== topicName);
      plan.planData.content.push(details);

      await planRepository.save(plan);
      console.log(`✅ Controller: Details for [${topicName}] saved to DB.`);

      res.json({ message: "Details generated", data: details });

    } catch (error: any) {
      console.error("❌ GenerateTopicDetails error:", error);
      res.status(500).json({ error: "Failed to generate details", details: error.message });
    }
  }
  static async deletePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Backend: Request to delete plan ID: ${id}`);
      const planRepository = AppDataSource.getRepository(LearningPlan);
      
      const plan = await planRepository.findOneBy({ id: Number(id) });
      if (!plan) {
          console.warn(`⚠️ Backend: Plan ID ${id} not found for deletion.`);
          return res.status(404).json({ error: "Plan not found" });
      }
      
      await planRepository.remove(plan);
      console.log(`✅ Backend: Plan ID ${id} deleted successfully.`);
      res.json({ message: "Plan deleted successfully" });
    } catch (error: any) {
      console.error("❌ DeletePlan error:", error);
      res.status(500).json({ error: "Failed to delete plan", details: error.message });
    }
  }
  static async generatePhaseExam(req: Request, res: Response) {
    try {
      const { id, phaseIndex } = req.params;
      const planRepository = AppDataSource.getRepository(LearningPlan);
      const plan = await planRepository.findOneBy({ id: Number(id) });

      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const phase = plan.planData.plan[Number(phaseIndex)];
      if (!phase) return res.status(404).json({ error: "Phase not found" });

      const exam = await AgentOrchestrator.generatePhaseExam(
        plan.topic,
        phase.title || `Phase ${phase.week}`,
        phase.topics
      );

      res.json({ message: "Exam generated", data: exam });
    } catch (error: any) {
      console.error("❌ GeneratePhaseExam error:", error);
      res.status(500).json({ error: "Failed to generate exam", details: error.message });
    }
  }
}
