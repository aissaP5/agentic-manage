import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn } from "typeorm";
import { User } from "./User.js";
import { LearningPlan } from "./LearningPlan.js";

@Entity()
export class Progress {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    user: User;

    @ManyToOne(() => LearningPlan)
    plan: LearningPlan;

    @Column({ type: "varchar" })
    topicName: string;

    @Column({ type: "boolean", default: false })
    isCompleted: boolean;

    @Column({ type: "int", nullable: true })
    quizScore: number;

    @UpdateDateColumn()
    lastAcccessedAt: Date;
}
