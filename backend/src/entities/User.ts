import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Achievement } from "./Achievement.js";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar", nullable: true })
    password: string;

    @OneToMany(() => Achievement, (achievement) => achievement.user)
    achievements: Achievement[];

    @CreateDateColumn()
    createdAt: Date;
}
