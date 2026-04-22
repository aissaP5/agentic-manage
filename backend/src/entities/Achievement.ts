import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User.js";

@Entity()
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  type: string; // e.g. "PHASE_MASTER", "COURSE_MASTER", "QUIZ_WHIZ"

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "varchar" })
  description: string;

  @Column({ type: "varchar", nullable: true })
  icon: string;

  @ManyToOne(() => User, (user) => user.achievements)
  user: User;

  @CreateDateColumn()
  earnedAt: Date;
}
