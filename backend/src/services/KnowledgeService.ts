import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppDataSource } from "../data-source.js";
import { Knowledge } from "../entities/Knowledge.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");
// Using a stable embedding model (embedding-001 is widely available)
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

export class KnowledgeService {
    /**
     * Stores a document or topic in the vector knowledge base
     */
    static async remember(topic: string, content: string, source: string = "AI") {
        try {
            // Generate semantic embeddings for the content
            const result = await embeddingModel.embedContent(content);
            const embeddingVector = result.embedding.values;

            const knowledgeRepo = AppDataSource.getRepository(Knowledge);
            
            const newKnowledge = knowledgeRepo.create({
                topic,
                content,
                source,
                embedding: embeddingVector
            });

            await knowledgeRepo.save(newKnowledge);
            console.log(`🧠 KnowledgeService: Remembered topic "${topic}"`);
            
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
            const result = await embeddingModel.embedContent(query);
            const queryVector = result.embedding.values;

            // Using pgvector's specific cosine distance operator <=>
            // and TypeORM's query builder for raw queries.
            const vectorString = `[${queryVector.join(",")}]`;

            const results = await AppDataSource.query(`
                SELECT id, topic, content, source, 1 - (embedding <=> $1) AS similarity
                FROM knowledge
                ORDER BY embedding <=> $1
                LIMIT $2
            `, [vectorString, limit]);

            console.log(`🧠 KnowledgeService: Found ${results.length} memories for "${query}"`);
            return results;
        } catch (err) {
            console.error("KnowledgeService Error (search):", err);
            return [];
        }
    }
}
