import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import OpenAI from "openai";
import { KnowledgeService } from "./KnowledgeService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");
const grokClient = process.env.GROK_API_KEY ? new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
}) : null;

// Mock Tool Functions for the Resource Agent
// Real-World Researcher Agent Tool (Wikipedia API)
const searchWikipedia = async (query: string) => {
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`);
    const data = await res.json();
    if (!data?.query?.search) return [];
    
    // Process top 2 results
    return data.query.search.slice(0, 2).map((item: any) => ({
      title: item.title + " - Wikipedia",
      link: `https://en.wikipedia.org/?curid=${item.pageid}`,
      // Use regex to strip HTML tags from the snippet
      description: item.snippet.replace(/(<([^>]+)>)/gi, "") + "..."
    }));
  } catch (err) {
    console.warn("Wikipedia search failed:", err);
    return [];
  }
};

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    level: { type: SchemaType.STRING },
    goal: { type: SchemaType.STRING },
    plan: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          week: { type: SchemaType.NUMBER },
          topics: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ["week", "topics"]
      }
    },
    content: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING },
          reasoning: { type: SchemaType.STRING }, // Chain of thought block
          sections: { // Replacing the monolithic explanation
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                content: { type: SchemaType.STRING }
              },
              required: ["title", "content"]
            }
          },
          resources: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                link: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING }
              },
              required: ["title", "link", "description"]
            }
          },
          quiz: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                question: { type: SchemaType.STRING },
                options: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                },
                answer: { type: SchemaType.STRING },
                explanation: { type: SchemaType.STRING }
              },
              required: ["question", "options", "answer", "explanation"]
            }
          },
          exercises: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING },
                solution: { type: SchemaType.STRING }
              },
              required: ["title", "description", "type", "solution"]
            }
          }
        },
        required: ["topic", "reasoning", "sections", "resources", "quiz", "exercises"]
      }
    }
  },
  required: ["level", "goal", "plan", "content"]
};

export class AgentOrchestrator {
  
  static async generateLearningPlan(topic: string, duration: string) {
    const aiProviders = [];
    
    // If Grok is available, try it first as it provides exceptional performance
    if (grokClient) {
      aiProviders.push({ name: "grok-beta", provider: "grok" });
    }
    
    // Add Gemini fallbacks
    aiProviders.push(
      { name: "gemini-2.5-flash", provider: "gemini" },
      { name: "gemini-flash-latest", provider: "gemini" },
      { name: "gemini-2.0-flash", provider: "gemini" }
    );

    let lastError = null;
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Retrieval-Augmented Generation (RAG): Memory Search
    const memories = await KnowledgeService.search(topic, 3);
    const contextString = memories.length > 0 
        ? `\nPREVIOUS KNOWLEDGE CONTEXT CONCERNING THIS TOPIC:\n${memories.map((m: any) => `- ${m.content}`).join("\n")}\nUse this context to inform your plan if relevant.`
        : "";

    const prompt = `
You are an advanced Agentic AI System acting as an elite educator.

Topic: ${topic}
Time available: ${duration}${contextString}

Your task: Generate a comprehensive structured learning plan in JSON.
Use **Chain of Thought** reasoning before writing the content.
IMPORTANT AESTHETIC REQUIREMENT: Break down the lessons into small, easily digestible "sections" instead of one massive paragraph. Readability is key.

RULES:
1. Create a week-by-week plan in the "plan" array.
2. For ALL topics in the plan, generate "content" items with:
   - "reasoning": A brief explanation of WHY you are teaching it this way (Chain of Thought).
   - "sections": Break down the explanation into EXACTLY 3 or 4 small, focused sections. For each section provide a "title" and "content" (markdown).
   - "quiz": Array of EXACTLY 3 multiple choice questions (each with "question", "options" (4 choices), "answer" (exact text of correct option), "explanation").
   - "exercises": Array of EXACTLY 2 exercises highly tailored to the domain (code, translation, problem, or theory).
   - "resources": 2-3 real useful links.

3. The JSON MUST exactly follow this shape:
{
  "level": "beginner|intermediate|advanced",
  "goal": "one-sentence summary of what the learner will achieve",
  "plan": [
    { "week": 1, "topics": ["Topic A", "Topic B", ...] },
    ...
  ],
  "content": [
    {
      "topic": "string",
      "reasoning": "string - explaining the pedagogical approach",
      "sections": [
         { "title": "string", "content": "markdown string (short, 1-2 paragraphs max)" },
         { "title": "string", "content": "markdown string..." }
      ],
      "resources": [{ "title": "string", "link": "https://...", "description": "string" }],
      "quiz": [
        { "question": "string", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "string" },
        ...
      ],
      "exercises": [
        { "title": "string", "description": "string", "type": "code|translation|theory|problem", "solution": "string" },
        ...
      ]
    }
  ]
}

CRITICAL: Return ONLY the valid JSON object. No markdown fences, no extra text.
    `;

    for (const modelConfig of aiProviders) {
      try {
        console.log(`🤖 AgentOrchestrator: Attempting plan generation with ${modelConfig.name} (${modelConfig.provider})...`);
        let responseText = "";

        if (modelConfig.provider === "grok") {
          const completion = await grokClient!.chat.completions.create({
            model: modelConfig.name,
            messages: [
              { role: "system", content: "You are a JSON-only API that outputs strict JSON matching the schema." },
              { role: "user", content: prompt + "\n\nCRITICAL: OUTPUT PURE JSON VALID AGAINST THE EXPECTED SCHEMA, NOTHING ELSE. NO MARKDOWN TICKS." }
            ],
            response_format: { type: "json_object" }
          });
          responseText = completion.choices[0]?.message?.content || "{}";

        } else {
          // Gemini — NO JSON mode, full creative freedom via prompt
          // This allows rich output: deep explanations, 3 quiz Qs, 2 exercises etc.
          const model = genAI.getGenerativeModel({ model: modelConfig.name });
          const result = await model.generateContent(prompt);
          responseText = result.response.text();
        }
        
        // Robust JSON extraction: strip ```json fences, then find the first { ... } block
        if (responseText.includes("```")) {
           responseText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        }
        // Fallback: extract the first JSON object if there's any surrounding text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) responseText = jsonMatch[0];
        
        // Parse the AI output
        console.log(`Parsing AI JSON response (${responseText.length} chars)...`);
        const rawData = JSON.parse(responseText);

        // Run the Smart Tool to ensure guaranteed resources if AI misses them
        if (rawData.content && Array.isArray(rawData.content)) {
          rawData.content = await Promise.all(rawData.content.map(async (c: any) => {
            const wikiRes = await searchWikipedia(c.topic || "");
            c.resources = [...(c.resources || []), ...wikiRes];
            
            // Save to Vector DB for future context
            if (c.sections && Array.isArray(c.sections)) {
                const combinedContent = c.sections.map((s: any) => s.content).join("\n\n");
                await KnowledgeService.remember(c.topic, combinedContent, modelConfig.name);
            }
            
            return c;
          }));
        }

        console.log(`✅ AgentOrchestrator: Success with ${modelConfig.name}`);
        return rawData;

      } catch (error: any) {
        console.warn(`⚠️ AgentOrchestrator: Model ${modelConfig.name} failed. Error: ${error.message}`);
        lastError = error;
        
        // If it's a 503 or 429, wait briefly and try the next model
        if (error.message?.includes("503") || error.message?.includes("429")) {
          await sleep(2000); 
          continue; 
        }
        
        // If it's a JSON parse error or other, try next model
        if (error instanceof SyntaxError) {
           continue;
        }

        // If Grok fails for some other reason, fall back to Gemini
        continue;
      }
    }

    throw lastError || new Error("All AI models failed to generate a plan.");
  }

  /**
   * AI TUTOR: Refines an existing plan based on natural language feedback.
   */
  static async refinePlan(currentPlan: any, userMessage: string): Promise<any> {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
You are an elite Educational Architect. I will provide you with a CURRENT JSON learning plan and a USER FEEDBACK message.
Your task is to REDESIGN the JSON plan according to the user's request while maintaining the exact structure.

CURRENT PLAN:
${JSON.stringify(currentPlan)}

USER REQUEST:
"${userMessage}"

RULES:
1. Return ONLY the updated JSON. No markdown ticks, no preamble.
2. Maintain the exact JSON schema (level, goal, plan[], content[]).
3. If the user wants to focus more on a certain sub-topic, update the text in the "sections" and "quiz" to reflect that.
4. If the user wants to make it harder/easier, adjust the complexity of the explanation and exercises.
5. Keep sections chunked and educational.

Return only the valid JSON object.
`;

    try {
      console.log("🤖 AgentOrchestrator: Refining plan based on tutor chat...");
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text);
    } catch (error: any) {
      console.error("❌ RefinePlan failed:", error);
      throw new Error("I couldn't refine the plan right now. Please try again.");
    }
  }
}
