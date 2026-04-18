import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar", nullable: true })
    password: string;

    @CreateDateColumn()
    createdAt: Date;
}
