import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class Knowledge {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar" })
    topic: string;

    @Column({ type: "text" })
    content: string;

    @Column({ type: "varchar" })
    source: string;

    // pgvector column for storing text embeddings (768 dims for Gemini embedding, or 1536 for OpenAI)
    @Column({
        type: "vector",
        length: 768, // Gemini text-embedding-004 is 768 dimensions
        nullable: true
    })
    embedding: number[];

    @CreateDateColumn()
    createdAt: Date;
}
