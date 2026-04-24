import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { jsonrepair } from 'jsonrepair';
import * as dotenv from "dotenv";
import OpenAI from "openai";
import { KnowledgeService } from "./KnowledgeService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");
const groqClient = process.env.GROQ_API_KEY ? new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
}) : null;

// Tool Definitions for Function Calling
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "searchWikipedia",
        description: "Search Wikipedia for a specific topic to get factual background information.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: "The search term to look up on Wikipedia.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "searchGoogle",
        description: "Search Google for the latest resources, links, and technical articles.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: "The search term to look up on Google.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "searchYouTube",
        description: "Search YouTube for educational video tutorials. Returns real YouTube video URLs. Use this to find video resources for the learning plan.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: "The search term to look up on YouTube.",
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];


// Implementation of the tools
const toolActions: Record<string, Function> = {
  searchWikipedia: async (args: { query: string }) => {
    try {
      // Increase search depth (top 4 instead of 2)
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(args.query)}&utf8=&format=json&srlimit=4`);
      const data = await res.json();
      if (!data?.query?.search) return { results: [] };
      return {
        results: data.query.search.map((item: any) => ({
          title: item.title + " - Wikipedia",
          link: `https://en.wikipedia.org/?curid=${item.pageid}`,
          description: item.snippet.replace(/(<([^>]+)>)/gi, "") + "..."
        }))
      };
    } catch (err) {
      console.warn("Wikipedia tool failed:", err);
      return { error: "Wikipedia search failed", results: [] };
    }
  },
  searchGoogle: async (args: { query: string }) => {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;
    
    // Silent fail if no credentials (avoids crashing the agent session)
    if (!apiKey || !cx || apiKey.startsWith('YOUR')) {
        return { results: [], notice: "Google Search disabled (no credentials)" };
    }

    try {
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(args.query)}&num=3`);
      const data = await res.json();
      
      if (data.error) {
        console.warn("Google Search API Error (likely billing):", data.error.message);
        return { results: [] }; // Return empty instead of error to keep agent flowing
      }

      if (!data?.items) return { results: [] };
      return {
        results: data.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          description: item.snippet
        }))
      };
    } catch (err) {
      return { results: [] };
    }
  },
  searchYouTube: async (args: { query: string }) => {
    try {
      console.log(`🎬 YouTube Search: "${args.query}"`);
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query + " tutorial")}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const html = await res.text();
      
      // Extract video IDs from the HTML - searching for common patterns in initialData
      const videoIdMatches = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g) || 
                             html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g) || [];
      const seen = new Set<string>();
      const results: any[] = [];
      
      for (const match of videoIdMatches) {
        const id = match.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
        if (id && !seen.has(id) && results.length < 4) {
          seen.add(id);
          results.push({
            title: `YouTube Tutorial: ${args.query}`,
            link: `https://www.youtube.com/watch?v=${id}`,
            description: `Video tutorial about ${args.query}`
          });
        }
      }
      
      // Also extract titles if available
      const titleMatches = html.match(/"title":{"runs":\[{"text":"(.*?)"}/g) || [];
      for (let i = 0; i < Math.min(titleMatches.length, results.length); i++) {
        const matchStr = titleMatches[i];
        if (matchStr) {
          const titleMatch = matchStr.match(/"text":"(.*?)"/);
          if (titleMatch && titleMatch[1]) {
            results[i].title = titleMatch[1];
          }
        }
      }
      
      console.log(`🎬 Found ${results.length} YouTube videos`);
      return { results };
    } catch (err) {
      console.warn("YouTube search failed:", err);
      return { results: [] };
    }
  }
};

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    level: { type: SchemaType.STRING },
    goal: { type: SchemaType.STRING },
    estimatedDuration: { type: SchemaType.STRING },
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
          reasoning: { type: SchemaType.STRING },
          mermaidDiagram: { type: SchemaType.STRING },
          labTemplate: { type: SchemaType.STRING },
          sections: {
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
        required: ["topic", "reasoning", "mermaidDiagram", "labTemplate", "sections", "resources", "quiz", "exercises"]
      }
    }
  },
  required: ["level", "goal", "estimatedDuration", "plan", "content"]
};

export class AgentOrchestrator {
  
  /**
   * Generates a learning plan with Multi-Agent collaboration (Architect + Researcher + Critic)
   */
  static async generateLearningPlan(topic: string, duration?: string) {
    const aiProviders = [
      { name: "gemini-1.5-flash", provider: "gemini" },
      { name: "llama-3.3-70b-versatile", provider: "groq" },
      { name: "llama-3.1-8b-instant", provider: "groq" }
    ];

    let lastError = null;

    // Phase 1: Retrieval-Augmented Generation (RAG)
    console.log(`🧠 Agent [Architect]: Recalling memories for "${topic}"...`);
    const memories = await KnowledgeService.search(topic, 3);
    const contextString = memories.length > 0 
        ? `\nPREVIOUS KNOWLEDGE CONTEXT:\n${memories.map((m: any) => `- ${m.content}`).join("\n")}\n`
        : "";

    const prompt = `
You are an Expert Education Architect AI. Generate a complete, rich learning plan.
TOPIC: "${topic}"
DURATION: ${duration || "UNSPECIFIED (You must propose the optimal duration based on topic complexity - e.g. 2 weeks, 1 month, etc.)"}

You MUST return ONLY a valid JSON object matching this EXACT schema:
{
  "level": "Beginner|Intermediate|Advanced",
  "goal": "One sentence summary of what the learner will achieve",
  "estimatedDuration": "The duration you proposed or the one provided (e.g. 4 weeks)",
  "plan": [
    {
      "week": 1,
      "phase": "Foundation",
      "topics": ["Topic 1 title", "Topic 2 title", "Topic 3 title"]
    },
    {
      "week": 2,
      "phase": "Core Concepts",
      "topics": ["Topic 4 title", "Topic 5 title", "Topic 6 title"]
    },
    {
      "week": 3,
      "phase": "Advanced Practice",
      "topics": ["Topic 7 title", "Topic 8 title"]
    },
    {
      "week": 4,
      "phase": "Mastery & Projects",
      "topics": ["Topic 9 title", "Topic 10 title"]
    }
  ],
  "content": [
    {
      "topic": "Topic 1 title",
      "reasoning": "Why this topic is important and how it fits the learning path",
      "mermaidDiagram": "graph TD\\n  subgraph Core\\n    A((Topic Name)) --> B[Key Concept 1]\\n    A --> C[Key Concept 2]\\n  end\\n  B --> D[(Data Store)]\\n  C --> E{Decision}",
      "labTemplate": "// Starter code or exercise setup for this topic",
      "sections": [
        {
          "title": "Introduction",
          "content": "## Introduction\\n\\nDetailed markdown content with at least 3 paragraphs explaining the concept..."
        },
        {
          "title": "Core Principles",
          "content": "## Core Principles\\n\\nDetailed explanation with examples, code snippets, and key insights..."
        },
        {
          "title": "Practical Examples",
          "content": "## Practical Examples\\n\\nHands-on examples showing real-world application..."
        }
      ],
      "quiz": [
        {
          "question": "What is...?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 0,
          "explanation": "Because..."
        }
      ],
      "exercises": [
        {
          "title": "Exercise 1",
          "description": "Detailed exercise instructions...",
          "type": "coding",
          "solution": "// Solution code here"
        }
      ],
      "resources": [
        {
          "title": "Resource Title",
          "link": "https://en.wikipedia.org/wiki/React_(JavaScript_library)",
          "description": "Official documentation or tutorial"
        }
      ]
    }
  ]
}

CRITICAL RULES:
- The "plan" array MUST cover the entire duration. If duration is ~1 month, use 4 weeks. If it's shorter, adjust accordingly.
- The "content" array MUST have the full content for the FIRST 3 topics of Week 1.
- Each section's "content" field MUST contain at least 200 words of real markdown text.
- The "mermaidDiagram" MUST be a RICH, NON-LINEAR mindmap or technical architecture. Use branching (A-->B, A-->C), subgraphs, and different shapes ( [], (()), [()], { }). Avoid simple vertical lists. Ensure valid syntax without illegal characters in labels.
- RESOURCES: Use REAL URLs from Wikipedia, MDN, official docs, etc. Example: "https://en.wikipedia.org/wiki/React_(JavaScript_library)". Do NOT invent or use placeholder URLs like "https://example.com".
- Return ONLY the JSON object. No explanation. No markdown. No backticks around the JSON.
${contextString}
`;

    for (const modelConfig of aiProviders) {
      try {
        console.log(`🤖 Agent [Architect]: Generating structure with ${modelConfig.name}...`);
        
        let rawData;
        if (modelConfig.provider === "gemini") {
            const model = genAI.getGenerativeModel({ 
                model: modelConfig.name,
                tools: TOOLS as any,
                safetySettings: [
                  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            });

            const chat = model.startChat();
            let result = await this.withRetry(() => chat.sendMessage(prompt));
            let response = result.response;

            // Handle multi-turn function calling
            while (response.functionCalls()) {
                const calls = response.functionCalls();
                if (!calls) break;
                const toolResponses = await Promise.all(calls.map(async (call) => {
                    console.log(`🔍 Agent [Researcher]: Calling ${call.name} for query: ${JSON.stringify(call.args)}`);
                    const tool = toolActions[call.name];
                    const result = tool ? await tool(call.args) : { error: "Tool not found" };
                    console.log(`📡 Tool [${call.name}] returned:`, JSON.stringify(result).substring(0, 50) + "...");
                    return {
                        functionResponse: {
                            name: call.name,
                            response: result
                        }
                    };
                }));
                
                result = await this.withRetry(() => chat.sendMessage(toolResponses));
                response = result.response;
            }

            let responseText = response.text();
            console.log("📄 Raw AI Response received.");
            responseText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            let cleanedJson = jsonMatch ? jsonMatch[0] : responseText;
            
            // Fix invalid multi-line backticks
            cleanedJson = cleanedJson.replace(/:\s*`([\s\S]*?)`/g, (match, p1) => {
                return `: ${JSON.stringify(p1)}`;
            });

            rawData = this.safeParse(cleanedJson);
        } else {
            console.log(`🤖 fallback to Groq (${modelConfig.name})...`);
            if (!groqClient) throw new Error("Groq client not initialized");
            
            // Map our tools to Groq/OpenAI format
            const groqTools = [
              {
                type: "function",
                function: {
                  name: "searchWikipedia",
                  description: "Search Wikipedia for factual info",
                  parameters: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"]
                  }
                }
              },
              {
                type: "function",
                function: {
                  name: "searchGoogle",
                  description: "Search Google for web results",
                  parameters: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"]
                  }
                }
              },
              {
                type: "function",
                function: {
                  name: "searchYouTube",
                  description: "Search YouTube for educational video tutorials. Returns real YouTube video URLs.",
                  parameters: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"]
                  }
                }
              }
            ];

            const messages: any[] = [
                { role: "system", content: "You are an elite Education Architect. You MUST return a JSON object with 'level', 'goal', 'plan' (array of weeks/topics), and 'content' (array of detailed topic objects). Generate internal content for the first topic immediately." },
                { role: "user", content: prompt }
            ];

            let completion = await this.withRetry(() => groqClient!.chat.completions.create({
                model: modelConfig.name,
                messages,
                tools: groqTools as any,
                tool_choice: "auto",
            }));

            let responseMessage = completion.choices[0]?.message;
            if (!responseMessage) throw new Error("No response from Groq");

            // Handle Groq Function Calling
            if (responseMessage.tool_calls) {
                messages.push(responseMessage);
                for (const toolCall of responseMessage.tool_calls as any[]) {
                    const functionName = toolCall.function.name;
                    const functionArgs = this.safeParse(toolCall.function.arguments);
                    console.log(`🔍 Groq [Researcher]: Calling ${functionName}...`);
                    const tool = toolActions[functionName];
                    const result = tool ? await tool(functionArgs) : { error: "Tool not found" };
                    
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool" as const,
                        name: functionName,
                        content: JSON.stringify(result),
                    });
                }
                
                completion = await groqClient.chat.completions.create({
                    model: modelConfig.name,
                    messages,
                    response_format: { type: "json_object" }
                });
            }

            let content = completion.choices[0]?.message?.content || "{}";
            console.log("📄 Raw Groq Response received:", content.substring(0, 100) + "...");
            
            // Heavy Cleaning
            content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            let cleanedJson = jsonMatch ? jsonMatch[0] : content;
            
            // Fix invalid multi-line backticks if AI used them
            cleanedJson = cleanedJson.replace(/:\s*`([\s\S]*?)`/g, (match, p1) => {
                return `: ${JSON.stringify(p1)}`;
            });

            rawData = this.safeParse(cleanedJson);
        }

        // Phase 2: Critic Agent Review
        console.log(`⚖️ Agent [Critic]: Reviewing generated plan...`);
        const reviewedData = await this.reviewContent(rawData, "learning-plan");
        
        const finalData = this.sanitizePlanData(reviewedData);
        
        // Validation: If the plan is empty or lacks topics, it's a failure.
        if (!finalData.plan || finalData.plan.length === 0) {
            throw new Error(`${modelConfig.name} returned an empty plan. Retrying...`);
        }

        console.log("✨ Plan generation cycle complete.");
        return finalData;

      } catch (error: any) {
        console.error(`❌ AgentOrchestrator: ${modelConfig.name} failed:`, error);
        lastError = error;
        continue;
      }
    }

    throw lastError || new Error("All AI models failed.");
  }

  /**
   * Generates full detailed content for a specific sub-topic
   */
  /**
   * Generates full detailed content for a specific sub-topic
   * HYBRID COLLABORATION: Groq (Researcher) + Gemini (Writer)
   */
  static async generateTopicDetails(mainTopic: string, subTopic: string) {
    try {
        console.log(`🤝 Multi-Agent Collaboration Started for [${subTopic}]`);

        // Phase 1: Research with Groq (Fastest for tool calls)
        console.log(`🔍 Agent [Researcher/Groq]: Finding real resources for ${subTopic}...`);
        let researchContext = "";
        if (groqClient) {
            const researchPrompt = `Find 3 real educational resources (Wikipedia, official docs) and 2 YouTube videos for the topic: "${subTopic}". Return a brief summary of what you found.`;
            const groqTools = [
                {
                    type: "function",
                    function: {
                        name: "searchWikipedia",
                        description: "Search Wikipedia",
                        parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "searchYouTube",
                        description: "Search YouTube",
                        parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "searchGoogle",
                        description: "Search Google for latest articles and docs",
                        parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                    }
                }
            ];

            const messages: any[] = [{ role: "user", content: researchPrompt }];
            let completion = await this.withRetry(() => groqClient!.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages,
                tools: groqTools as any,
                tool_choice: "auto"
            }));

            const responseMessage = completion.choices[0]?.message;
            if (!responseMessage) throw new Error("No response from Groq during research phase");
            if (responseMessage.tool_calls) {
                messages.push(responseMessage);
                for (const toolCall of responseMessage.tool_calls as any[]) {
                    const functionName = toolCall.function.name;
                    const functionArgs = this.safeParse(toolCall.function.arguments);
                    const tool = toolActions[functionName];
                    const result = tool ? await tool(functionArgs) : { error: "Tool not found" };
                    messages.push({ tool_call_id: toolCall.id, role: "tool" as const, name: functionName, content: JSON.stringify(result) });
                }
                const finalResearch = await this.withRetry(() => groqClient!.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages
                }));
                researchContext = finalResearch.choices[0]?.message?.content || "";
            }
        }

        // Phase 2: Pedagogical Writing with Gemini (Best for long-form content)
        console.log(`✍️ Agent [Writer/Gemini]: Drafting lesson using research context...`);
        const writingPrompt = `
You are an Expert AI Educator. Generate a HYPER-DETAILED educational module for: "${subTopic}" (Subject: ${mainTopic}).
Use the following RESEARCHED DATA to include real links and videos:
${researchContext}

You MUST return ONLY a valid JSON object matching this EXACT schema:
{
  "topic": "${subTopic}",
  "reasoning": "...",
  "mermaidDiagram": "...",
  "labTemplate": "<!DOCTYPE html><html>... (ONLY if topic is programming/coding related, otherwise null)",
  "sections": [
    { "title": "Introduction", "content": "..." },
    { "title": "Deep Dive", "content": "..." },
    { "title": "Mastery", "content": "..." }
  ],
  "quiz": [
    { "question": "...", "options": ["...", "..."], "answer": "...", "explanation": "..." }
  ],
  "exercises": [
    { "title": "...", "description": "...", "type": "practical", "solution": "..." }
  ],
  "resources": [
    { "title": "...", "link": "...", "description": "..." }
  ]
}

CRITICAL:
- Length: Each section MUST be at least 300 words. Total module > 1000 words.
- Visual: MUST be a unique Mermaid mindmap.
- Lab: The "labTemplate" field MUST be null if the topic is not related to software development, math, or physics (anything not requiring a code playground).
- Resources: Include real URLs found in research context.
- EXTREMELY IMPORTANT: DO NOT RETURN EMPTY SECTIONS.

`;


        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });
        const result = await this.withRetry(() => model.generateContent(writingPrompt));
        let responseText = result.response.text();
        
        responseText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Writer failed to return JSON");
        
        let details = this.safeParse(jsonMatch[0]);
        
        // If Phase 2 returned empty content, force fallback now
        if (!details.sections || details.sections.length === 0) {
            console.warn("⚠️ Phase 2 returned empty sections. Forcing fallback...");
            return this.fallbackGeneration(mainTopic, subTopic);
        }

        // Phase 3: Final Critic Review (Gemini or Groq)
        console.log(`⚖️ Agent [Critic]: Final validation...`);
        details = await this.reviewContent(details, "topic-details");
        details = this.sanitizeTopicDetails(details);

        // Remember in knowledge base
        const combinedContent = details.sections.map((s: any) => s.content).join("\n\n");
        await KnowledgeService.remember(subTopic, combinedContent, "Hybrid-Agent-System");

        return details;

    } catch (error: any) {
        console.error("❌ Hybrid collaboration failed:", error.message);
        // Fallback to simple generation if collaboration fails
        return this.fallbackGeneration(mainTopic, subTopic);
    }
  }

  /**
   * Generates a comprehensive Phase Exam covering multiple topics.
   */
  public static async generatePhaseExam(subject: string, phaseTitle: string, topics: string[]) {
    console.log(`🎓 Generating Phase Exam for: ${phaseTitle} (${subject})...`);
    const prompt = `
You are an Elite Academic Examiner. Create a FINAL EXAM for the following phase: "${phaseTitle}" in the course "${subject}".
The exam must cover these specific topics: ${topics.join(", ")}.

Requirements:
- 10-15 high-quality, challenging multiple-choice questions.
- Each question must test deep understanding, not just surface facts.
- Include a "difficulty" field (Beginner, Intermediate, Advanced).

Return ONLY a valid JSON object matching this schema:
{
  "phase": "${phaseTitle}",
  "examTitle": "Certification Exam: ${phaseTitle}",
  "questions": [
    {
      "question": "...",
      "options": ["...", "..."],
      "answer": "...",
      "explanation": "...",
      "difficulty": "..."
    }
  ]
}
`;

    // Try Gemini first
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });
        const result = await this.withRetry(() => model.generateContent(prompt));
        let text = result.response.text();
        text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const match = text.match(/\{[\s\S]*\}/);
        return this.safeParse(match ? match[0] : text);
    } catch (err) {
        // Fallback to Groq
        if (groqClient) {
            const completion = await this.withRetry(() => groqClient!.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            }));
            return this.safeParse(completion.choices[0]?.message?.content || "{}");
        }
        throw err;
    }
  }

  /**
   * Simple single-model generation as a fallback
   */
  private static async fallbackGeneration(mainTopic: string, subTopic: string) {
    console.log("⚠️ Falling back to multi-provider generation...");
    const fallbackSchema = `
    EXPECTED JSON SCHEMA:
    {
      "topic": "${subTopic}",
      "reasoning": "Why this is important",
      "mermaidDiagram": "graph LR\\nA-->B",
      "labTemplate": "<!DOCTYPE html><html><head><style>/* CSS here */</style></head><body><!-- HTML here --></body></html>",
      "sections": [{ "title": "Section 1", "content": "Detailed text..." }],
      "quiz": [{ "question": "?", "options": ["A", "B"], "answer": "A", "explanation": "..." }],
      "exercises": [{ "title": "Ex 1", "description": "...", "type": "practical", "solution": "..." }],
      "resources": [{ "title": "Doc", "link": "https://...", "description": "..." }]
    }
    CRITICAL: Ensure ALL fields are populated with rich content. Do NOT return empty sections.`;

    // Try Gemini
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });
        const prompt = `Generate a COMPREHENSIVE educational module JSON for topic: "${subTopic}" (Subject: ${mainTopic}). 
        Include Introduction, Core Concepts, and Advanced Deep Dive sections. 
        Each section MUST have at least 300 words of content.
        ${fallbackSchema}
        Return ONLY valid JSON.`;
        const result = await this.withRetry(() => model.generateContent(prompt), 1); // Only 1 retry for fallback to be fast
        let text = result.response.text();
        text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const match = text.match(/\{[\s\S]*\}/);
        return this.sanitizeTopicDetails(this.safeParse(match ? match[0] : text));
    } catch (geminiErr: any) {
        console.warn("❌ Fallback Gemini failed, trying Groq...", geminiErr.message);
        if (groqClient) {
            const completion = await this.withRetry(() => groqClient!.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are an Expert AI Educator. Generate a detailed educational module JSON." },
                    { role: "user", content: `Topic: ${subTopic} (Subject: ${mainTopic})\n\n${fallbackSchema}` }
                ],
                response_format: { type: "json_object" }
            }));
            const text = completion.choices[0]?.message?.content || "{}";
            return this.sanitizeTopicDetails(this.safeParse(text));
        }
        throw geminiErr;
    }
  }

  /**
   * NEW: CRITIC AGENT
   * Reviews and refines AI-generated content to ensure quality and schema adherence.
   */
  private static async reviewContent(data: any, type: "learning-plan" | "topic-details"): Promise<any> {
    const prompt = `
You are an elite QA Critic Agent. I will provide you with AI-generated JSON content for a ${type}.
Your task:
1. Verify fact accuracy and pedagogical flow.
2. ENSURE THE PLAN COVERS THE FULL DURATION (e.g., if it's for 1 month, ensure 4 weeks). DO NOT TRUNCATE.
3. Ensure Mermaid symbols/syntax are correct (no special characters in node names).
4. Ensure no empty sections or placeholder text.
5. If valid, return the JSON. If it has flaws, FIX IT and return the corrected JSON.

CONTENT TO REVIEW:
${JSON.stringify(data)}

Return ONLY valid JSON.
`;

    try {
        // Use 1.5 flash for review
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });
        const result = await this.withRetry(() => model.generateContent(prompt));
        let responseText = result.response.text();
        
        responseText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        return this.safeParse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (err) {
        // Fallback to Groq for Critic
        if (groqClient) {
            console.log("⚖️ Critic Agent: Falling back to Groq...");
            const completion = await this.withRetry(() => groqClient!.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a QA Critic. Verify and fix the provided JSON. Return ONLY the JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            }));
            let text = completion.choices[0]?.message?.content || "{}";
            text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            const match = text.match(/\{[\s\S]*\}/);
            return this.safeParse(match ? match[0] : text);
        }
        console.warn("⚠️ Critic Agent failed completely.");
        return data;
    }
  }

  /**
   * Evaluation and Refinement methods remain unchanged or slightly updated for better performance.
   */
  static async evaluateExercise(topic: string, exercise: any, submission: string): Promise<any> {
    const prompt = `You are an Expert AI Tutor. Evaluate this submission for "${exercise.title}". Return JSON {score, feedback, passed}.`;
    
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });
        const result = await model.generateContent(`${prompt}\n\nSubmission: ${submission}\nContext: ${exercise.description}`);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        return this.safeParse(match ? match[0] : text);
    } catch (err) {
        if (groqClient) {
            const completion = await groqClient.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: `${prompt}\n\nSubmission: ${submission}` }],
                response_format: { type: "json_object" }
            });
            let text = completion.choices[0]?.message?.content || "{}";
            text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            const match = text.match(/\{[\s\S]*\}/);
            return this.safeParse(match ? match[0] : text);
        }
        throw err;
    }
  }

  static async refinePlan(currentPlan: any, userMessage: string): Promise<{ plan: any, explanation: string }> {
    const prompt = `You are an elite Education Architect. Redesign this JSON plan based on user feedback.
You MUST return a JSON object with two fields:
1. "plan": The full updated JSON plan (matching the EXACT schema of the Current Plan).
2. "explanation": A very short, friendly message (1 sentence) explaining exactly what you changed (e.g., "I've added FastAPI to Week 3").

If the feedback is just a greeting or unrelated, return the Current Plan exactly as it is and a friendly greeting in "explanation".

Feedback: ${userMessage}

Current Plan: ${JSON.stringify(currentPlan)}`;
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        let resultData = this.safeParse(match ? match[0] : text);
        
        let updatedPlan = resultData.plan || resultData; // Fallback if AI forgets the wrapper
        const explanation = resultData.explanation || "I've updated your curriculum!";

        if (!updatedPlan.plan || !Array.isArray(updatedPlan.plan) || updatedPlan.plan.length === 0) updatedPlan.plan = currentPlan.plan;
        if (!updatedPlan.content || !Array.isArray(updatedPlan.content)) updatedPlan.content = currentPlan.content;
        
        return { 
            plan: this.sanitizePlanData(updatedPlan), 
            explanation 
        };
    } catch (err) {
        if (groqClient) {
            const completion = await groqClient.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });
            let resultData = this.safeParse(completion.choices[0]?.message?.content || "{}");
            
            let updatedPlan = resultData.plan || resultData;
            const explanation = resultData.explanation || "I've updated your curriculum!";

            if (!updatedPlan.plan || !Array.isArray(updatedPlan.plan) || updatedPlan.plan.length === 0) updatedPlan.plan = currentPlan.plan;
            if (!updatedPlan.content || !Array.isArray(updatedPlan.content)) updatedPlan.content = currentPlan.content;
            
            return { 
                plan: this.sanitizePlanData(updatedPlan), 
                explanation 
            };
        }
        throw err;
    }
  }

  private static sanitizePlanData(data: any): any {
    const sanitized = { ...data };
    sanitized.plan = Array.isArray(sanitized.plan) ? sanitized.plan : [];
    sanitized.content = Array.isArray(sanitized.content) ? sanitized.content : [];
    sanitized.estimatedDuration = String(sanitized.estimatedDuration || "Proposing...");
    
    // Deep sanitize plan items
    sanitized.plan = sanitized.plan.map((phase: any) => ({
      ...phase,
      week: typeof phase.week === 'string' 
        ? parseInt(phase.week.replace(/\D/g, '')) || 1 
        : (phase.week || 1),
      topics: Array.isArray(phase.topics) ? phase.topics : []
    }));
    
    return sanitized;
  }

  private static sanitizeTopicDetails(data: any): any {
    const sanitized = { ...data };
    sanitized.topic = String(sanitized.topic || "Untitled Topic");
    
    // Ensure sections is a non-empty array
    if (!Array.isArray(sanitized.sections) || sanitized.sections.length === 0) {
        sanitized.sections = [{ 
            title: "Introduction", 
            content: typeof sanitized.sections === 'string' ? sanitized.sections : "Course content is being refined. Please try regenerating." 
        }];
    }

    sanitized.quiz = Array.isArray(sanitized.quiz) ? sanitized.quiz : [];
    sanitized.exercises = Array.isArray(sanitized.exercises) ? sanitized.exercises : [];
    sanitized.resources = Array.isArray(sanitized.resources) ? sanitized.resources : [];
    
    // Ensure sections have content
    sanitized.sections = sanitized.sections.map((s: any) => ({
        title: String(s.title || "Untitled Section"),
        content: String(s.content || "Content is being drafted...")
    }));
    
    // Ensure exercises have required fields
    sanitized.exercises = sanitized.exercises.map((ex: any) => ({
        title: ex.title || "Exercise",
        description: ex.description || "No description provided.",
        type: ex.type || "practical",
        solution: ex.solution || ""
    }));

    // Normalize resources: map 'url' to 'link', filter out fake/missing URLs
    sanitized.resources = sanitized.resources
      .map((r: any) => ({
        title: r.title || "Resource",
        link: r.link || r.url || "",
        description: r.description || r.type || "External resource"
      }))
      .filter((r: any) => r.link && r.link.startsWith("http"));

    return sanitized;
  }

  private static async withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const errMsg = err.message || "";
            const isRetryable = 
                errMsg.includes("429") || 
                errMsg.includes("quota") || 
                errMsg.includes("Rate limit") ||
                errMsg.includes("500") || 
                errMsg.includes("502") || 
                errMsg.includes("503") ||
                errMsg.includes("safety") ||
                errMsg.includes("finishReason: SAFETY");

            const isHardLimit = errMsg.includes("limit: 0") || errMsg.includes("requests per day");

            if (isRetryable) {
                if (isHardLimit) {
                    console.warn(`🛑 Hard Quota Limit reached (limit: 0). Skipping retries and switching provider...`);
                    throw err; // Fail fast to trigger fallback
                }
                
                console.warn(`⏳ AI Service issue or limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; 
                continue;
            }
            throw err;
        }
    }
    throw lastError;
  }

  private static safeParse(text: string): any {
    try {
        return JSON.parse(text);
    } catch (err) {
        try {
            console.log("🛠️ Attempting JSON repair...");
            return JSON.parse(jsonrepair(text));
        } catch (repairErr) {
            console.error("❌ JSON repair failed:", text.substring(0, 500));
            throw new Error("Critical JSON failure after repair attempt.");
        }
    }
  }
}

