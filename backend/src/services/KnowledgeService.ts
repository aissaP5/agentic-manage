import { pipeline } from "@xenova/transformers";
import { AppDataSource } from "../data-source.js";
import { Knowledge } from "../entities/Knowledge.js";

// Singleton pipeline for local embeddings (Free, No API Keys needed!)
class Embedder {
    static task = "feature-extraction";
    // all-mpnet-base-v2 generates 768-dimensional vectors, perfectly matching our DB schema
    static model = "Xenova/all-mpnet-base-v2"; 
    static instance: any = null;

    static async getInstance() {
        if (this.instance === null) {
            console.log(`⏳ Loading local embedding model (${this.model})... This might take a moment on first run.`);
            this.instance = await pipeline(this.task as any, this.model);
        }
        return this.instance;
    }
}

export class KnowledgeService {
    /**
     * Stores a document or topic in the vector knowledge base
     */
    static async remember(topic: string, content: string, source: string = "AI") {
        try {
            const extractor = await Embedder.getInstance();
            
            // Generate semantic embeddings locally
            const output: any = await extractor(content, { pooling: 'mean', normalize: true });
            const embeddingVector = Array.from(output.data as Float32Array);

            const knowledgeRepo = AppDataSource.getRepository(Knowledge);
            
            const newKnowledge = knowledgeRepo.create({
                topic,
                content,
                source,
                embedding: embeddingVector
            });

            await knowledgeRepo.save(newKnowledge);
            console.log(`🧠 KnowledgeService: Remembered topic "${topic}" (100% Local RAG)`);
            
            return newKnowledge;
        } catch (err) {
            console.error("KnowledgeService Error (remember):", err);
            return null;
        }
    }

    /**
     * Searches the vector knowledge base for relevant context
     */
    static async search(query: string, limit: number = 3) {
        try {
            const extractor = await Embedder.getInstance();
            const output: any = await extractor(query, { pooling: 'mean', normalize: true });
            const queryVector = Array.from(output.data as Float32Array);

            // Using pgvector's specific cosine distance operator <=>
            // and TypeORM's query builder for raw queries.
            const vectorString = `[${queryVector.join(",")}]`;

            const results = await AppDataSource.query(`
                SELECT id, topic, content, source, 1 - (embedding <=> $1) AS similarity
                FROM knowledge
                ORDER BY embedding <=> $1
                LIMIT $2
            `, [vectorString, limit]);

            console.log(`🧠 KnowledgeService: Found ${results.length} memories for "${query}" (Local RAG)`);
            return results;
        } catch (err) {
            console.error("KnowledgeService Error (search):", err);
            return [];
        }
    }
}
