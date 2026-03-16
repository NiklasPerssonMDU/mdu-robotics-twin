import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Initialize Neo4j Driver pulling from ENV, with fallbacks to local Docker
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "robotics2026")
AUTH = (USERNAME, PASSWORD)

courses = [
    {"code": "MMA122", "name": "Diskret matematik", "credits": 7.5, "year": 1, "period": "HT1", "examinations": "MUN1 4.5 hp, OVN3 2.0 hp, INL1 1.0 hp"},
    {"code": "OAI103", "name": "Ingenjörsvetenskap för robotik och tillförlitliga system", "credits": 7.5, "year": 1, "period": "HT1", "examinations": "SEM1 3.0 hp, INL1 4.5 hp"},
    {"code": "DVA117", "name": "Programmering", "credits": 7.5, "year": 1, "period": "HT2", "examinations": "LAB1 3.0 hp, LAB2 3.0 hp, TEN1 1.5 hp"},
    {"code": "ELA105", "name": "Elektronik grundkurs", "credits": 7.5, "year": 1, "period": "HT2", "examinations": "LAB1 1.0 hp, LAB2 1.0 hp, LAB3 1.0 hp, LAB4 1.0 hp, TEN1 3.5 hp"},
    {"code": "MTA103", "name": "Tillämpad CAD", "credits": 7.5, "year": 1, "period": "VT1", "examinations": "INL1 2.5 hp, INL2 2.0 hp, TEN1 3.0 hp"},
    {"code": "MAA048", "name": "Envariabelkalkyl", "credits": 7.5, "year": 1, "period": "VT1", "examinations": "TEN3 3.5 hp, TEN2 4.0 hp"},
    {"code": "DVA270", "name": "Programmering för inbyggda system", "credits": 7.5, "year": 1, "period": "VT2", "examinations": "LAB1 1.0 hp, LAB2 1.0 hp, LAB3 1.0 hp, LAB4 1.0 hp, TEN1 3.5 hp"},
    {"code": "ELA211", "name": "Elektroniksystem", "credits": 7.5, "year": 1, "period": "VT2", "examinations": "LAB1 1.5 hp, LAB2 1.5 hp, LAB3 1.5 hp, PRO1 3.0 hp"},
    
    {"code": "ELA213", "name": "Mätteknik", "credits": 7.5, "year": 2, "period": "HT1", "examinations": "LAB1 2.5 hp, TEN1 5.0 hp"},
    {"code": "MFY006", "name": "Mekanik I", "credits": 7.5, "year": 2, "period": "VT1", "examinations": "TEN2 5.0 hp, INL1 1.0 hp, LAB1 1.5 hp"},
    {"code": "DVA271", "name": "Arkitektur och kommunikation för inbyggda system", "credits": 7.5, "year": 2, "period": "HT2", "examinations": "LAB1 1.5 hp, LAB2 1.5 hp, LAB3 1.5 hp, TEN1 3.0 hp"},
    {"code": "ELA212", "name": "Elektriska mätsystem", "credits": 7.5, "year": 2, "period": "HT2", "examinations": "LAB1 5.0 hp, TEN1 2.5 hp"},
    {"code": "MAA051", "name": "Vektoralgebra", "credits": 7.5, "year": 2, "period": "HT1", "examinations": "TEN1 3.5 hp, TEN2 4.0 hp"},
    {"code": "ELA209", "name": "Signalbehandling", "credits": 7.5, "year": 2, "period": "VT1", "examinations": "HEM2 4.5 hp, PRO2 3.0 hp"},
    {"code": "MTA200", "name": "CAD fördjupning", "credits": 7.5, "year": 2, "period": "VT2", "examinations": "INL1 2.0 hp, TEN1 5.5 hp"},
    {"code": "DVA272", "name": "Robotiksystem", "credits": 7.5, "year": 2, "period": "VT2", "examinations": "LAB1 1.5 hp, LAB2 1.5 hp, LAB3 1.5 hp, PRO1 3.0 hp"},

    {"code": "DVA493", "name": "Lärande system", "credits": 7.5, "year": 3, "period": "HT1", "examinations": "TEN1 3.5 hp, LAB1 4.0 hp"},
    {"code": "ELA427", "name": "Komplexa elektroniksystem", "credits": 7.5, "year": 3, "period": "HT1", "examinations": "LAB2 1.5 hp, LAB3 1.5 hp, LAB4 1.5 hp, PRO2 3.0 hp"},
    {"code": "MAA056", "name": "Linjär algebra", "credits": 7.5, "year": 3, "period": "HT2", "examinations": "TEN1 7.5 hp"},
    {"code": "FYA018", "name": "Mekanik II", "credits": 7.5, "year": 3, "period": "HT2", "examinations": "TEN1 5.0 hp, INL1 1.0 hp, LAB1 1.5 hp"},
    {"code": "MAA137", "name": "Sannolikhetslära och statistisk teori", "credits": 7.5, "year": 3, "period": "VT1", "examinations": "TEN1 3.5 hp, TEN2 4.0 hp"},
    {"code": "DVA346", "name": "Teknisk projektledning", "credits": 7.5, "year": 3, "period": "VT1", "examinations": "OBN1 0.5 hp, TEN1 7.0 hp"},
    {"code": "DVA513", "name": "Tillämpad artificiell intelligens", "credits": 15, "year": 3, "period": "VT2", "examinations": "INL1 4.0 hp, SEM1 1.0 hp, SEM2 1.0 hp, SEM3 1.0 hp, PRO1 8.0 hp"},

    {"code": "MAA152", "name": "Flervariabelkalkyl", "credits": 7.5, "year": 4, "period": "HT1", "examinations": "TEN3 3.5 hp, TEN4 4.0 hp"},
    {"code": "ELA415", "name": "Reglerteknik", "credits": 7.5, "year": 4, "period": "HT1", "examinations": "TEN1 7.5 hp"},
    {"code": "ELA306", "name": "Mekatronik", "credits": 7.5, "year": 4, "period": "HT2", "examinations": "PRO1 5.0 hp, LAB1 1.5 hp, INL1 1.0 hp"},
    {"code": "ELA417", "name": "Avancerad signalbehandling", "credits": 7.5, "year": 4, "period": "HT2", "examinations": "TEN1 4.5 hp, PRO1 3.0 hp"},
    {"code": "DVA400", "name": "Industrirobotik", "credits": 7.5, "year": 4, "period": "VT1", "examinations": "LAB1 1.5 hp, PRO1 1.5 hp, TEN1 4.5 hp"},
    {"code": "DVA514", "name": "Intelligenta system", "credits": 7.5, "year": 4, "period": "VT1", "examinations": "SEM1 1.0 hp, PRO1 6.5 hp"},
    {"code": "ELA408", "name": "Mobila robotar", "credits": 7.5, "year": 4, "period": "VT2", "examinations": "LAB1 1.5 hp, LAB2 1.5 hp, LAB3 1.5 hp, PRO2 3.0 hp"},
    {"code": "ELA411", "name": "Neuroteknik", "credits": 7.5, "year": 4, "period": "VT2", "examinations": "SEM1 3.0 hp, PRO1 4.5 hp"},

    {"code": "DVA490", "name": "Robotik - projektkurs", "credits": 30, "year": 5, "period": "HT", "examinations": "PRO1 7.5 hp, PRO2 7.5 hp, PRO3 7.5 hp, PRO4 7.5 hp"},
    {"code": "DVA502", "name": "Examensarbete för civilingenjörsexamen i robotik", "credits": 30, "year": 5, "period": "VT", "examinations": "INL1 1.0 hp, PRO1 26.0 hp, SEM2 3.0 hp"},
]

prerequisites = [
    # År 1/2
    ("DVA270", "DVA117"),
    ("ELA211", "ELA105"),
    ("ELA213", "ELA105"),
    ("ELA213", "DVA117"),
    ("ELA213", "MAA048"),
    ("MFY006", "MAA048"),
    ("MFY006", "MAA051"),
    ("DVA271", "DVA117"),
    ("DVA271", "DVA270"),
    ("ELA212", "ELA105"),
    ("ELA212", "MAA048"),
    
    # År 2
    ("ELA209", "ELA211"),
    ("MTA200", "MTA103"),
    ("DVA272", "DVA270"),
    ("DVA272", "ELA211"),
    ("DVA272", "ELA213"),
    ("DVA272", "DVA271"),
    ("DVA272", "ELA212"),
    
    # År 3
    ("DVA493", "DVA117"),
    ("DVA493", "DVA270"),
    ("ELA427", "DVA117"),
    ("ELA427", "ELA211"),
    ("MAA056", "MAA051"),
    ("FYA018", "MFY006"),
    ("FYA018", "MAA051"),
    ("FYA018", "MAA048"),
    ("MAA137", "MAA048"),
    ("DVA513", "DVA493"),
    
    # År 4
    ("MAA152", "MAA048"),
    ("MAA152", "MAA051"),
    ("ELA415", "MAA048"),
    ("ELA415", "DVA117"),
    ("ELA415", "ELA211"),
    ("ELA306", "FYA018"),
    ("ELA306", "ELA211"),
    ("ELA417", "ELA209"),
    ("DVA400", "MAA051"),
    ("DVA400", "FYA018"),
    ("DVA400", "ELA415"),
    ("DVA514", "DVA117"),
    ("ELA408", "MAA056"),
    ("ELA408", "MAA152"),
    ("ELA408", "FYA018"),
    ("ELA408", "ELA415"),
    ("ELA411", "ELA213"),
    ("ELA411", "ELA427"),
    ("ELA411", "DVA493"),
    
    # År 5
    ("DVA490", "ELA209"),
    ("DVA490", "ELA427"),
    ("DVA490", "DVA513"),
    ("DVA490", "DVA514"),
    ("DVA502", "DVA490")
]

def create_graph(tx):
    print("Clearing database...")
    tx.run("MATCH (n) DETACH DELETE n")

    print(f"Adding {len(courses)} courses to graph...")
    for course in courses:
        tx.run('''
            MERGE (c:Course {code: $code})
            SET c.name = $name,
                c.credits = $credits,
                c.year = $year,
                c.period = $period,
                c.examinations = $examinations
        ''', **course)

    print(f"Adding {len(prerequisites)} prerequisites relationships...")
    for dep, req in prerequisites:
        tx.run('''
            MATCH (dependent:Course {code: $dep})
            MATCH (prereq:Course {code: $req})
            MERGE (dependent)-[:REQUIRES]->(prereq)
        ''', dep=dep, req=req)

if __name__ == "__main__":
    print("Connecting to Neo4j...")
    try:
        with GraphDatabase.driver(URI, auth=AUTH) as driver:
            driver.verify_connectivity()
            with driver.session() as session:
                session.execute_write(create_graph)
                print("=========================================")
                print("✅ Graph populated successfully!")
                print("=========================================")
    except Exception as e:
        print(f"❌ Error connecting to or updating Neo4j: {e}")
