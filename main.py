from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

class CourseReplacementPayload(BaseModel):
    old_code: str
    code: str
    name: str
    credits: float
    year: int
    period: str
    examinations: str
    prerequisites: List[str]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "robotics2026")
AUTH = (USERNAME, PASSWORD)
driver = GraphDatabase.driver(URI, auth=AUTH)

# Mount static files correctly at bottom of file

@app.get("/api/graph")
def get_graph():
    with driver.session() as session:
        # Get all courses
        nodes_res = session.run("MATCH (n:Course) RETURN n.code AS id, n.name AS label, n.year AS group, n.credits AS credits, n.period AS period, n.examinations AS examinations")
        nodes = []
        for r in nodes_res:
            nodes.append({
                "id": r["id"],
                "label": f'{r["id"]}\n{r["label"]}',
                "group": r["group"], # For coloring based on year
                "title": f'Credits: {r["credits"]}<br>Period: {r["period"]}',
                "credits": r["credits"],
                "period": r["period"],
                "examinations": r["examinations"],
                "shape": "box",
                "font": {"color": "white"}
            })
            
        # Get all edges
        edges_res = session.run("MATCH (source:Course)-[:REQUIRES]->(target:Course) RETURN source.code AS source, target.code AS target")
        edges = []
        for r in edges_res:
            edges.append({
                "from": r["source"],
                "to": r["target"],
                "arrows": "to"
            })
            
        return {"nodes": nodes, "edges": edges}

@app.get("/api/impact/{course_code}")
def get_impact(course_code: str):
    with driver.session() as session:
        # Find all courses that depend on the given course code
        res = session.run('''
            MATCH (dependent:Course)-[:REQUIRES*1..]->(target:Course {code: $code})
            RETURN DISTINCT dependent.code AS code, dependent.name AS name, dependent.year AS year
        ''', code=course_code)
        
        impacted = [{"code": r["code"], "name": r["name"], "year": r["year"]} for r in res]
        return {"target": course_code, "impacted": impacted}

@app.post("/api/replace_course")
def replace_course(payload: CourseReplacementPayload):
    with driver.session() as session:
        # Backup incoming dependencies
        incoming_res = session.run("MATCH (dep:Course)-[:REQUIRES]->(c:Course {code: $old_code}) RETURN dep.code AS dep_code", old_code=payload.old_code)
        dependent_courses = [r["dep_code"] for r in incoming_res]
        
        # Get period from the old course if not updating it properly in frontend 
        # (Though we expect the frontend to pass it). Let's fetch original year/period just in case payload lacks it.
        # Actually payload has year and period.
        
        # Delete old course
        session.run("MATCH (c:Course {code: $old_code}) DETACH DELETE c", old_code=payload.old_code)
        
        # Create new course (using MERGE to avoid duplicates if double-clicked)
        session.run('''
            MERGE (c:Course {code: $code})
            SET c.name = $name,
                c.credits = $credits,
                c.year = $year,
                c.period = $period,
                c.examinations = $examinations
        ''', code=payload.code, name=payload.name, credits=payload.credits, year=payload.year, period=payload.period, examinations=payload.examinations)
        
        # Connect new prerequisites
        for req in payload.prerequisites:
            session.run('''
                MATCH (c:Course {code: $code})
                MATCH (req:Course {code: $req_code})
                MERGE (c)-[:REQUIRES]->(req)
            ''', code=payload.code, req_code=req)
            
        # Reconnect downstream dependencies
        for dep in dependent_courses:
            session.run('''
                MATCH (dep:Course {code: $dep_code})
                MATCH (new_c:Course {code: $code})
                MERGE (dep)-[:REQUIRES]->(new_c)
            ''', dep_code=dep, code=payload.code)
            
        return {"status": "success"}

@app.delete("/api/course/{course_code}")
def delete_course(course_code: str):
    with driver.session() as session:
        # Check if course exists first
        result = session.run("MATCH (c:Course {code: $code}) RETURN c", code=course_code)
        if not result.single():
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Find all dependent courses NOT including the target itself
        res = session.run('''
            MATCH (dependent:Course)-[:REQUIRES*1..]->(target:Course {code: $code})
            RETURN DISTINCT dependent.code AS code, dependent.name AS name, dependent.year AS year
        ''', code=course_code)
        impacted_courses = [{"code": r["code"], "name": r["name"], "year": r["year"]} for r in res]
        
        # Detach and delete ONLY the target course
        session.run('''
            MATCH (c:Course {code: $code})
            DETACH DELETE c
        ''', code=course_code)
        
    return {"status": "success", "impacted": impacted_courses}

from populate_graph import create_graph

@app.post("/api/reset")
def reset_database():
    with driver.session() as session:
        session.execute_write(create_graph)
    return {"status": "success"}

@app.on_event("shutdown")
def shutdown_event():
    driver.close()

# We mount the public folder at the root path "/" 
# This must be at the END of the file so it doesn't override /api/ routes
app.mount("/", StaticFiles(directory="public", html=True), name="public")
