import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User.js";

@Entity()
export class LearningPlan {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    user: User;

    @Column({ type: "varchar" })
    topic: string;

    @Column({ type: "varchar" })
    duration: string;

    // We store the full JSON structure of the plan here
    @Column('jsonb')
    planData: any;

    @CreateDateColumn()
    createdAt: Date;
}
