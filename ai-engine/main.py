"""
DevPilot AI Engine
FastAPI + LangChain + Powered by DevPilot AIpowered AI backend
"""
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import uvicorn

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DevPilot AI Engine",
    description="AI-powered project management assistant using Ollama",
    version="1.0.0"
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── AI Client ────────────────────────────────────────────────────────
AI_API_KEY = os.getenv("AI_API_KEY", "ollama")
MODEL = os.getenv("AI_MODEL", "llama3:8b")
BASE_URL = os.getenv("AI_BASE_URL", "http://localhost:11434/v1")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "4096"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.7"))

llm = ChatOpenAI(
    api_key=AI_API_KEY,
    model=MODEL,
    max_tokens=MAX_TOKENS,
    temperature=TEMPERATURE,
    base_url=BASE_URL,
    default_headers={
        "Bypass-Tunnel-Reminder": "true",
        "ngrok-skip-browser-warning": "true"
    }
)

# ─── Pydantic Models ──────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    project_context: Optional[str] = None
    context_type: Optional[str] = "general"  # general | sprint_planning | code_review | documentation | analysis

class SprintPlanRequest(BaseModel):
    project_name: str
    backlog_items: List[str]
    team_size: int = 3
    sprint_duration_weeks: int = 2
    team_velocity: Optional[int] = None

class DocumentRequest(BaseModel):
    project_name: str
    project_description: str
    doc_type: str  # srs | api_docs | readme | deployment | technical
    additional_context: Optional[str] = None

class TaskBreakdownRequest(BaseModel):
    feature_description: str
    project_name: Optional[str] = None
    tech_stack: Optional[str] = None

class CodeReviewRequest(BaseModel):
    code: str
    language: str = "javascript"
    context: Optional[str] = None

class TaskEnhanceRequest(BaseModel):
    title: str

class GenerateSubtasksRequest(BaseModel):
    title: str
    description: Optional[str] = None

# ─── System Prompts ───────────────────────────────────────────────────────────
SYSTEM_PROMPTS = {
    "general": """IMPORTANT INSTRUCTION: Your name is Dev Copilot (or DevPilot AI). You were created by the DevPilot team. You must NEVER mention LLaMA, Groq, Meta, OpenAI, or any underlying model architecture. If asked about your identity, you must strictly identify as Dev Copilot.

You are DevPilot AI, an expert software project management and development assistant.
You help development teams with:
- Sprint planning and task management
- Code reviews and architecture decisions  
- Project documentation generation
- Technical guidance and best practices
- Risk assessment and timeline estimation
- Team collaboration and agile methodologies

Be concise, practical, and actionable. Use markdown formatting for structured responses.
Always provide specific, implementable advice rather than generic suggestions.""",

    "sprint_planning": """IMPORTANT INSTRUCTION: Your name is Dev Copilot. NEVER mention LLaMA, Groq, Meta, OpenAI, Ollama, or any underlying models.
    
You are a senior Scrum Master and Agile coach AI assistant.
You specialize in:
- Sprint planning and backlog grooming
- Story point estimation using Fibonacci sequence
- Risk identification and mitigation
- Team velocity calculation and capacity planning
- Sprint goal definition

Provide structured sprint plans with clear goals, task breakdowns, and story point estimates.""",

    "code_review": """IMPORTANT INSTRUCTION: Your name is Dev Copilot. NEVER mention LLaMA, Groq, Meta, OpenAI, Ollama, or any underlying models.
    
You are a senior software engineer AI performing code reviews.
Focus on:
- Code quality, readability, and maintainability
- Security vulnerabilities and best practices
- Performance optimization opportunities
- Design patterns and architecture
- Test coverage recommendations

Provide specific line-by-line feedback when relevant.""",

    "documentation": """IMPORTANT INSTRUCTION: Your name is Dev Copilot. NEVER mention LLaMA, Groq, Meta, OpenAI, Ollama, or any underlying models.
    
You are a technical writer AI specializing in software documentation.
Create clear, comprehensive, and well-structured documentation including:
- Software Requirements Specifications (SRS)
- API documentation
- README files
- Deployment guides
- Technical specifications

CRITICAL INSTRUCTION: DO NOT generate generic templates or "boring" placeholder text. You MUST deeply analyze the provided project description and tech stack, and generate a highly specific document tailored exactly to the project. If certain details are missing, make logical and reasonable assumptions based on standard software engineering practices for the described type of project.
Use proper markdown formatting with tables, code blocks, and clear sections.""",

    "analysis": """IMPORTANT INSTRUCTION: Your name is Dev Copilot. NEVER mention LLaMA, Groq, Meta, OpenAI, Ollama, or any underlying models.
    
You are a data analytics AI specialized in software project analysis.
Analyze:
- Project progress and completion rates
- Team performance metrics
- Risk factors and technical debt
- Timeline adherence and bottlenecks
- Resource allocation efficiency

Provide data-driven insights with actionable recommendations.""",
}

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "DevPilot AI Engine",
        "status": "running",
        "model": MODEL,
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL}

# ─── Chat Endpoint ────────────────────────────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        context_type = req.context_type or "general"
        system_prompt = SYSTEM_PROMPTS.get(context_type, SYSTEM_PROMPTS["general"])
        
        # Add project context if provided
        if req.project_context:
            system_prompt += f"\n\n**Current Project Context:**\n{req.project_context}"

        # Build LangChain messages
        lc_messages = [SystemMessage(content=system_prompt)]
        for msg in req.messages:
            if msg.role == "user":
                lc_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                lc_messages.append(AIMessage(content=msg.content))

        response = await llm.ainvoke(lc_messages)
        
        return {
            "role": "assistant",
            "content": response.content,
            "model": "DevPilot AI Engine",
            "tokens_used": response.usage_metadata.get("total_tokens", 0) if response.usage_metadata else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")

# ─── Sprint Planning ──────────────────────────────────────────────────────────
@app.post("/sprint/plan")
async def plan_sprint(req: SprintPlanRequest):
    try:
        backlog_str = "\n".join([f"- {item}" for item in req.backlog_items])
        velocity_str = f"Team velocity: ~{req.team_velocity} story points/sprint" if req.team_velocity else "No previous velocity data"
        
        prompt = f"""Create a detailed sprint plan for the following:

**Project:** {req.project_name}
**Team Size:** {req.team_size} developers
**Sprint Duration:** {req.sprint_duration_weeks} weeks
**{velocity_str}**

**Backlog Items:**
{backlog_str}

Please provide:
1. **Sprint Goal** - A clear, measurable objective
2. **Selected Tasks** - Which backlog items to include with story point estimates
3. **Task Breakdown** - Sub-tasks for complex items
4. **Capacity Planning** - Hours per person, total capacity
5. **Risk Assessment** - Potential blockers and mitigation
6. **Definition of Done** - Clear completion criteria
7. **Team Recommendations** - Who should work on what

Format as a structured sprint plan with clear sections."""

        messages = [
            SystemMessage(content=SYSTEM_PROMPTS["sprint_planning"]),
            HumanMessage(content=prompt)
        ]
        
        response = await llm.ainvoke(messages)
        
        return {
            "sprint_plan": response.content,
            "model": "DevPilot AI Engine",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sprint planning failed: {str(e)}")

# ─── Document Generation ──────────────────────────────────────────────────────
@app.post("/documents/generate")
async def generate_document(req: DocumentRequest):
    try:
        doc_type_prompts = {
            "srs": f"Write a comprehensive Software Requirements Specification (SRS) for '{req.project_name}'.",
            "readme": f"Write a professional README.md for '{req.project_name}'.",
            "api_docs": f"Write API documentation for '{req.project_name}'.",
            "deployment": f"Write a deployment guide for '{req.project_name}'.",
            "technical": f"Write a technical specification document for '{req.project_name}'.",
        }
        
        base_prompt = doc_type_prompts.get(req.doc_type, f"Write a {req.doc_type} document for '{req.project_name}'.")
        
        prompt = f"""{base_prompt}

**Project Description:** {req.project_description}
{f"**Additional Context (Tech stack, requirements, etc.):** {req.additional_context}" if req.additional_context else ""}

CRITICAL INSTRUCTIONS:
1. Do NOT just output a generic template. The generated document MUST be heavily contextualized using the Project Description provided above.
2. If the project description mentions specific features (e.g., "tracking bird sightings"), then your SRS/Readme/Docs must specifically discuss those features.
3. If technical details are missing, infer a modern, reasonable stack (e.g., React, Node.js, MongoDB) and write the document assuming that stack.
4. Generate a complete, professional document using rich markdown formatting (use headers, bullet points, bold text, and tables where appropriate).
5. Be thorough, creative, and highly specific to this exact project."""

        messages = [
            SystemMessage(content=SYSTEM_PROMPTS["documentation"]),
            HumanMessage(content=prompt)
        ]
        
        response = await llm.ainvoke(messages)
        
        return {
            "document": response.content,
            "doc_type": req.doc_type,
            "title": f"{req.project_name} - {req.doc_type.upper().replace('_', ' ')}",
            "model": "DevPilot AI Engine",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document generation failed: {str(e)}")

# ─── Task Breakdown ───────────────────────────────────────────────────────────
@app.post("/tasks/breakdown")
async def breakdown_task(req: TaskBreakdownRequest):
    try:
        prompt = f"""Break down the following feature into specific, actionable development tasks:

**Feature:** {req.feature_description}
{f"**Project:** {req.project_name}" if req.project_name else ""}
{f"**Tech Stack:** {req.tech_stack}" if req.tech_stack else ""}

Provide:
1. **User Stories** - In "As a user, I want..." format
2. **Technical Tasks** - Specific implementation tasks with story point estimates (1/2/3/5/8/13)
3. **Sub-tasks** - Detailed breakdown for tasks > 5 points
4. **Dependencies** - Which tasks must be done first
5. **Testing Considerations** - What to test
6. **Acceptance Criteria** - How to know it's complete

Format as a structured JSON-like breakdown."""

        messages = [
            SystemMessage(content=SYSTEM_PROMPTS["sprint_planning"]),
            HumanMessage(content=prompt)
        ]
        
        response = await llm.ainvoke(messages)
        
        return {
            "breakdown": response.content,
            "model": "DevPilot AI Engine",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task breakdown failed: {str(e)}")

# ─── Code Review ──────────────────────────────────────────────────────────────
@app.post("/code/review")
async def review_code(req: CodeReviewRequest):
    try:
        prompt = f"""Review the following {req.language} code:

{f"**Context:** {req.context}" if req.context else ""}

```{req.language}
{req.code}
```

Provide a thorough code review covering:
1. **Code Quality** - Readability, naming, structure
2. **Security Issues** - Vulnerabilities, input validation
3. **Performance** - Optimization opportunities
4. **Best Practices** - Design patterns, SOLID principles
5. **Bug Detection** - Potential runtime errors
6. **Testing** - What tests are needed
7. **Summary** - Overall rating and key improvements

Rate each category: ✅ Good / ⚠️ Needs Improvement / ❌ Critical Issue"""

        messages = [
            SystemMessage(content=SYSTEM_PROMPTS["code_review"]),
            HumanMessage(content=prompt)
        ]
        
        response = await llm.ainvoke(messages)
        
        return {
            "review": response.content,
            "language": req.language,
            "model": "DevPilot AI Engine",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Code review failed: {str(e)}")

# ─── Quick Enhance Task ────────────────────────────────────────────────────────
@app.post("/tasks/enhance")
async def enhance_task(req: TaskEnhanceRequest):
    try:
        prompt = f"""
        Analyze this raw task title and enhance it for a Kanban board:
        "{req.title}"

        You must respond with ONLY a valid JSON object matching this schema exactly:
        {{
            "title": "A more professional, actionable version of the title",
            "description": "A 1-2 sentence brief description of what needs to be done",
            "priority": "low" | "medium" | "high" | "critical",
            "story_points": an integer between 1 and 8 (use Fibonacci 1, 2, 3, 5, 8) representing complexity
        }}
        Do not include markdown blocks, just the JSON.
        """
        
        response = await llm.ainvoke([
            SystemMessage(content="You are an expert Agile Product Owner AI. Respond ONLY with valid JSON. Do not add markdown blocks like ```json."),
            HumanMessage(content=prompt)
        ])
        
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        import json
        return json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enhance task: {str(e)}")

# ─── Generate Subtasks ─────────────────────────────────────────────────────────
@app.post("/tasks/generate-subtasks")
async def generate_subtasks(req: GenerateSubtasksRequest):
    try:
        desc_str = f"Description: {req.description}" if req.description else ""
        prompt = f"""
        Break down this task into 3-7 actionable sub-tasks (checklist items):
        Title: {req.title}
        {desc_str}

        You must respond with ONLY a valid JSON array matching this schema exactly:
        [
            {{ "title": "Sub-task 1", "is_done": false }},
            {{ "title": "Sub-task 2", "is_done": false }}
        ]
        Do not include markdown blocks, just the JSON array.
        """
        
        response = await llm.ainvoke([
            SystemMessage(content="You are an expert Agile Developer AI. Respond ONLY with a valid JSON array. Do not add markdown blocks like ```json."),
            HumanMessage(content=prompt)
        ])
        
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        import json
        checklist = json.loads(content)
        return { "checklist": checklist }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to breakdown task: {str(e)}")

# ─── Run ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
