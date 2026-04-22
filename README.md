# Agentic AI Learning Assistant

Welcome to the full-stack AI learning platform!

## Prerequisites
- Node.js (v18+)
- PostgreSQL (or use Docker)
- Gemini API Key

## Setup Backend
1. Go to the `backend` folder: `cd backend`
2. Install dependencies: `npm install`
3. Setup the database using Docker Compose:
   ```bash
   docker-compose up -d
   ```
4. Create a `.env` file based on `.env.example` and insert your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_key_here
   GROQ_API_KEY=your_key_here
   ```
5. Start the backend: `npm run dev`

## Setup Frontend
1. Go to the `frontend` folder: `cd frontend`
2. Install dependencies: `npm install`
3. Check `src/api/client.ts` to ensure the base URL matches your backend (`http://localhost:3000/api`).
4. Start the frontend: `npm run dev`

## Features
- **Frontend Dashboard:** Modern React + Tailwind interface.
- **Backend Orchestration:** Express server communicating with Gemini.
- **Agents Simulated:** Analyst (planning depth), Planner (roadmap), Teacher (markdown lessons), Resource (search mocks), Quiz (assessment json).
