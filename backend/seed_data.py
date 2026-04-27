"""
Seed the database with realistic demo data.
Run: python -m seed_data
"""

import json
import uuid
import random
from datetime import datetime, timezone, timedelta

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db
from app.models import User, Volunteer, Need, Assignment, Broadcast


def _uuid():
    return str(uuid.uuid4())


def _random_past(days_max=14):
    return datetime.now(timezone.utc) - timedelta(
        days=random.randint(0, days_max),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


# Mumbai-area coordinates with some variance
def _mumbai_coords():
    return (
        19.0760 + random.uniform(-0.08, 0.08),
        72.8777 + random.uniform(-0.08, 0.08),
    )

# Gujarat-area coordinates
def _gujarat_coords():
    cities = [
        (22.3072, 73.1812),  # Vadodara
        (23.0225, 72.5714),  # Ahmedabad
        (21.1702, 72.8311),  # Surat
        (22.3039, 70.8022),  # Rajkot
        (21.7645, 72.1519),  # Bhavnagar
        (23.2156, 72.6369),  # Gandhinagar
    ]
    base_lat, base_lon = random.choice(cities)
    return (
        base_lat + random.uniform(-0.03, 0.03),
        base_lon + random.uniform(-0.03, 0.03),
    )


SKILLS_POOL = [
    "medical", "first_aid", "nursing", "cooking", "driving",
    "logistics", "construction", "teaching", "counseling",
    "swimming", "cleaning", "it_support", "translation",
    "childcare", "elderly_care", "mental_health",
]

ADDRESSES = [
    "Andheri West, Mumbai",
    "Bandra East, Mumbai", 
    "Dadar, Mumbai",
    "Juhu, Mumbai",
    "Powai, Mumbai",
    "Malad West, Mumbai",
    "Goregaon East, Mumbai",
    "Borivali West, Mumbai",
    "Thane West, Thane",
    "Vashi, Navi Mumbai",
    "Kurla East, Mumbai",
    "Chembur, Mumbai",
    "Ghatkopar West, Mumbai",
    "Vikhroli East, Mumbai",
    "Mulund West, Mumbai",
    "Kalyan West, Kalyan",
    "Panvel, Navi Mumbai",
    "Dombivli East, Dombivli",
    "Airoli, Navi Mumbai",
    "Kharghar, Navi Mumbai",
]

GUJARAT_ADDRESSES = [
    "Alkapuri, Vadodara",
    "Fatehgunj, Vadodara",
    "Sayajigunj, Vadodara",
    "Maninagar, Ahmedabad",
    "Navrangpura, Ahmedabad",
    "Satellite, Ahmedabad",
    "Isanpur, Ahmedabad",
    "Adajan, Surat",
    "Varachha, Surat",
    "Kalavad Road, Rajkot",
    "Gandhinagar Sector 21",
    "Waghawadi Road, Bhavnagar",
]


def seed():
    init_db()
    db = SessionLocal()

    print("Seeding database with demo data...\n")

    # --- ADMIN USER ---
    admin_user = User(
        id=_uuid(),
        email="admin@smartalloc.org",
        name="Priya Sharma (Admin)",
        picture=None,
        role="admin",
        google_id="google_admin_demo_001",
        created_at=_random_past(30),
    )
    db.add(admin_user)
    print(f"  Admin: {admin_user.name} ({admin_user.email})")

    # --- VOLUNTEER USERS + PROFILES ---
    volunteer_names = [
        ("Rahul Verma", "rahul.verma@email.com"),
        ("Anita Desai", "anita.desai@email.com"),
        ("Suresh Kumar", "suresh.kumar@email.com"),
        ("Meena Patel", "meena.patel@email.com"),
        ("Arjun Singh", "arjun.singh@email.com"),
        ("Kavita Reddy", "kavita.reddy@email.com"),
        ("Rohan Mehta", "rohan.mehta@email.com"),
        ("Sneha Joshi", "sneha.joshi@email.com"),
        ("Vikram Rao", "vikram.rao@email.com"),
        ("Pooja Gupta", "pooja.gupta@email.com"),
        ("Amit Tiwari", "amit.tiwari@email.com"),
        ("Deepa Nair", "deepa.nair@email.com"),
        ("Rajesh Khanna", "rajesh.khanna@email.com"),
        ("Sunita Devi", "sunita.devi@email.com"),
        ("Nikhil Jain", "nikhil.jain@email.com"),
    ]

    # Gujarat-based volunteers
    gujarat_volunteer_names = [
        ("Hardik Patel", "hardik.patel@email.com"),
        ("Nisha Shah", "nisha.shah@email.com"),
        ("Kiran Bhatt", "kiran.bhatt@email.com"),
        ("Darshan Modi", "darshan.modi@email.com"),
        ("Riya Desai", "riya.desai@email.com"),
        ("Yash Trivedi", "yash.trivedi@email.com"),
        ("Priyanka Parmar", "priyanka.parmar@email.com"),
        ("Jay Chauhan", "jay.chauhan@email.com"),
    ]

    volunteers = []
    for i, (name, email) in enumerate(volunteer_names):
        user = User(
            id=_uuid(),
            email=email,
            name=name,
            role="volunteer",
            google_id=f"google_vol_demo_{i:03d}",
            created_at=_random_past(20),
        )
        db.add(user)

        lat, lon = _mumbai_coords()
        skills = random.sample(SKILLS_POOL, k=random.randint(2, 5))
        has_vehicle = random.choice([True, False, False])
        avail = random.choices(["available", "busy", "offline"], weights=[60, 20, 20])[0]

        vol = Volunteer(
            id=_uuid(),
            user_id=user.id,
            phone=f"+91-9{random.randint(100000000, 999999999)}",
            skills=json.dumps(skills),
            has_vehicle=has_vehicle,
            vehicle_type=random.choice(["bike", "car"]) if has_vehicle else None,
            latitude=lat,
            longitude=lon,
            address=random.choice(ADDRESSES),
            availability=avail,
            tasks_completed=random.randint(0, 25),
            rating=round(random.uniform(3.0, 5.0), 1),
            total_ratings=random.randint(1, 15),
            created_at=user.created_at,
        )
        db.add(vol)
        volunteers.append(vol)
        print(f"  Volunteer: {name} | Skills: {skills} | {avail}")

    # Gujarat volunteers
    for i, (name, email) in enumerate(gujarat_volunteer_names):
        user = User(
            id=_uuid(),
            email=email,
            name=name,
            role="volunteer",
            google_id=f"google_guj_demo_{i:03d}",
            created_at=_random_past(20),
        )
        db.add(user)

        lat, lon = _gujarat_coords()
        skills = random.sample(SKILLS_POOL, k=random.randint(2, 5))
        has_vehicle = random.choice([True, False, False])
        avail = random.choices(["available", "busy", "offline"], weights=[60, 20, 20])[0]

        vol = Volunteer(
            id=_uuid(),
            user_id=user.id,
            phone=f"+91-9{random.randint(100000000, 999999999)}",
            skills=json.dumps(skills),
            has_vehicle=has_vehicle,
            vehicle_type=random.choice(["bike", "car"]) if has_vehicle else None,
            latitude=lat,
            longitude=lon,
            address=random.choice(GUJARAT_ADDRESSES),
            availability=avail,
            tasks_completed=random.randint(0, 20),
            rating=round(random.uniform(3.0, 5.0), 1),
            total_ratings=random.randint(1, 12),
            created_at=user.created_at,
        )
        db.add(vol)
        volunteers.append(vol)
        print(f"  Volunteer (GJ): {name} | Skills: {skills} | {avail}")

    # --- NEEDS ---
    needs_data = [
        ("5 elderly with fever in Gokuldham", "Multiple elderly residents showing high fever symptoms for 2 days. Need medical checkup and medicine delivery.", "medical", 5, 8),
        ("Food packets needed in Dharavi", "200 families displaced by waterlogging. Urgent food supply needed for 3 days.", "food", 5, 200),
        ("Temporary shelter in Kurla", "30 families lost homes due to building collapse. Need temporary tents and blankets.", "shelter", 4, 120),
        ("Clean water supply in Malad", "Municipal water supply contaminated. 500+ people affected. Need bottled water distribution.", "water", 5, 500),
        ("Flood rescue in Sion", "15 people stranded on rooftops after flash flooding. Need boats and rescue team.", "rescue", 5, 15),
        ("Children tutoring in Andheri", "50 children from migrant worker families need after-school tutoring support.", "education", 2, 50),
        ("Winter clothing drive in Thane", "Street children and homeless need warm clothing for winter season.", "clothing", 3, 80),
        ("Sanitation cleanup in Chembur slum", "Open drainage causing disease spread. Need volunteers for cleanup drive.", "sanitation", 4, 300),
        ("Medical camp needed in Powai", "Senior citizens community requesting free health checkup camp.", "medical", 3, 45),
        ("Food distribution at Borivali station", "Daily wage workers need evening meal distribution near railway station.", "food", 3, 100),
        ("School supplies for tribal children", "Remote village school needs books, notebooks, and stationery for 80 students.", "education", 2, 80),
        ("Emergency blood donors needed in Dadar", "Accident victim at KEM Hospital needs O+ blood donors urgently.", "medical", 5, 1),
        ("Debris clearing after storm in Vashi", "Trees fallen on roads blocking emergency access. Need volunteers with tools.", "rescue", 4, 10),
        ("Water purification tablets distribution", "Post-flood water contamination in low-lying areas of Kalyan.", "water", 4, 250),
        ("Counseling for flood-affected families", "Trauma counseling needed for children and women in relief camp.", "medical", 3, 60),
        ("Blanket distribution in Panvel", "Night temperatures dropping. Homeless families need blankets and mats.", "clothing", 3, 40),
        ("First aid training for community", "Local community requests first-aid training workshop for 30 volunteers.", "education", 1, 30),
        ("Toilet construction in slum area", "Lack of sanitation facilities causing health hazards. 5 toilets needed.", "sanitation", 3, 150),
        ("Ambulance coordination for remote area", "Multiple patients in Aarey Colony need hospital transport.", "rescue", 4, 7),
        ("Meal preparation for relief camp", "300 people in temporary camp need hot meals twice daily.", "food", 4, 300),
    ]

    statuses = ["open", "open", "open", "open", "assigned", "in_progress", "resolved", "open", "open", "open"]
    all_needs = []

    for i, (title, desc, cat, urgency, affected) in enumerate(needs_data):
        lat, lon = _mumbai_coords()
        status_val = statuses[i % len(statuses)]

        need = Need(
            id=_uuid(),
            reported_by=admin_user.id if i % 3 == 0 else volunteers[i % len(volunteers)].user_id,
            title=title,
            description=desc,
            category=cat,
            urgency=urgency,
            status=status_val,
            latitude=lat,
            longitude=lon,
            address=random.choice(ADDRESSES),
            people_affected=affected,
            source=random.choice(["manual", "manual", "manual", "ocr"]),
            created_at=_random_past(10),
        )
        if status_val == "resolved":
            need.resolved_at = need.created_at + timedelta(hours=random.randint(2, 48))

        db.add(need)
        all_needs.append(need)
        print(f"  Need: {title} [{cat}] urgency={urgency} status={status_val}")

    # Gujarat needs
    gujarat_needs_data = [
        ("Medical camp at Vadodara slum", "Free health checkup needed for 100+ families in Tandalja area.", "medical", 3, 100, "Tandalja, Vadodara"),
        ("Food distribution in Ahmedabad flood zone", "Sabarmati riverbank area flooded. 150 families need food packets.", "food", 5, 150, "Sabarmati, Ahmedabad"),
        ("Clean water needed in Surat textile zone", "Workers in Pandesara area reporting contaminated water supply.", "water", 4, 200, "Pandesara, Surat"),
        ("Shelter for displaced families in Rajkot", "20 families displaced due to heavy rains. Temporary shelters needed.", "shelter", 4, 80, "Aji Dam Area, Rajkot"),
        ("School supplies for Gandhinagar children", "Government school needs notebooks and stationery for 60 students.", "education", 2, 60, "Sector 7, Gandhinagar"),
        ("Sanitation drive in Bhavnagar market", "Market area drainage clogged. Risk of water-borne diseases.", "sanitation", 3, 120, "Market Area, Bhavnagar"),
        ("Rescue operation after wall collapse", "Old city wall collapsed in Vadodara. 5 people trapped.", "rescue", 5, 5, "Walled City, Vadodara"),
        ("Clothing drive for Surat migrant workers", "Textile mill workers need winter clothing and blankets.", "clothing", 3, 90, "Udhna, Surat"),
    ]

    for i, (title, desc, cat, urgency, affected, addr) in enumerate(gujarat_needs_data):
        lat, lon = _gujarat_coords()
        status_val = statuses[i % len(statuses)]

        need = Need(
            id=_uuid(),
            reported_by=admin_user.id if i % 2 == 0 else volunteers[len(volunteer_names) + (i % len(gujarat_volunteer_names))].user_id,
            title=title,
            description=desc,
            category=cat,
            urgency=urgency,
            status=status_val,
            latitude=lat,
            longitude=lon,
            address=addr,
            people_affected=affected,
            source=random.choice(["manual", "manual", "ocr"]),
            created_at=_random_past(10),
        )
        if status_val == "resolved":
            need.resolved_at = need.created_at + timedelta(hours=random.randint(2, 48))

        db.add(need)
        all_needs.append(need)
        print(f"  Need (GJ): {title} [{cat}] urgency={urgency} status={status_val}")

    # --- PAN-INDIA NEEDS (for richer map) ---
    pan_india_needs = [
        # Delhi
        ("Emergency medical supplies in Chandni Chowk", "Dengue outbreak — 80+ cases. Medicines and mosquito nets urgently needed.", "medical", 5, 120, 28.6562, 77.2310, "Chandni Chowk, Delhi"),
        ("Food packets for flood-hit Yamuna area", "500 families stranded near Yamuna banks. Need dry ration kits.", "food", 5, 500, 28.6848, 77.2405, "Yamuna Bank, Delhi"),
        ("Shelter needed near Sarai Kale Khan", "Homeless migrants need temporary shelters. Winter approaching.", "shelter", 4, 200, 28.5891, 77.2563, "Sarai Kale Khan, Delhi"),
        ("Water tankers for JJ Colony", "No piped water for 3 days. 1,000 residents affected.", "water", 5, 1000, 28.6289, 77.2065, "Karol Bagh, Delhi"),

        # Bangalore
        ("Medical camp needed in Whitefield", "IT corridor workers need free health checkup camp.", "medical", 2, 150, 12.9698, 77.7500, "Whitefield, Bangalore"),
        ("Flood rescue in Bellandur", "Heavy rains causing flooding. 25 families trapped.", "rescue", 5, 80, 12.9340, 77.6780, "Bellandur, Bangalore"),
        ("Food distribution at Majestic bus stand", "Daily wage workers need meal support.", "food", 3, 200, 12.9770, 77.5710, "Majestic, Bangalore"),

        # Chennai
        ("Cyclone relief in Marina Beach area", "Post-cyclone damage. 300 families need immediate shelter and food.", "shelter", 5, 300, 13.0500, 80.2824, "Marina Beach, Chennai"),
        ("Water purification in Velachery", "Flood-contaminated water supply. Purification tablets needed.", "water", 4, 400, 12.9815, 80.2180, "Velachery, Chennai"),
        ("Clothing drive for fishermen community", "Fishermen lost belongings in cyclone. Need clothes and supplies.", "clothing", 3, 150, 13.1000, 80.2870, "Royapuram, Chennai"),

        # Kolkata
        ("Medical aid in Howrah slums", "Cholera cases reported. Urgent medical response needed.", "medical", 5, 90, 22.5958, 88.2636, "Howrah, Kolkata"),
        ("Food relief in Sundarbans", "Cyclone damaged crops. 200 families without food for 2 days.", "food", 5, 200, 22.1667, 88.8667, "Sundarbans, West Bengal"),
        ("School rebuilding in North 24 Parganas", "Cyclone destroyed 3 schools. Need volunteers for rebuilding.", "education", 3, 500, 22.6188, 88.4273, "Barasat, West Bengal"),

        # Hyderabad
        ("Rescue operation in Musi river area", "Flash floods. 15 people stranded near old bridge.", "rescue", 5, 15, 17.3850, 78.4867, "Musi River, Hyderabad"),
        ("Sanitation drive in Charminar area", "Post-flood cleanup needed. Disease risk high.", "sanitation", 4, 300, 17.3616, 78.4747, "Charminar, Hyderabad"),

        # Jaipur
        ("Heatwave relief camp needed", "Temperatures crossing 48°C. Need cooling stations and ORS distribution.", "medical", 4, 500, 26.9124, 75.7873, "Jaipur, Rajasthan"),
        ("Water distribution in Jodhpur villages", "Severe drought. 5 villages without water for a week.", "water", 5, 800, 26.2389, 73.0243, "Jodhpur, Rajasthan"),

        # Lucknow
        ("Flood relief in Gomti river area", "River overflowing. 100 families displaced.", "shelter", 4, 100, 26.8467, 80.9462, "Gomti Nagar, Lucknow"),
        ("Education kits for rural UP schools", "Post-flood schools reopening. No books or supplies.", "education", 2, 300, 26.8853, 80.9116, "Lucknow, UP"),

        # Pune
        ("Landslide rescue in Lavasa", "Heavy rains caused landslide. 10 people missing.", "rescue", 5, 10, 18.4090, 73.5056, "Lavasa, Pune"),
        ("Food kitchen for Pune migrant workers", "Construction workers stranded without wages or food.", "food", 4, 250, 18.5204, 73.8567, "Hadapsar, Pune"),
    ]

    for i, (title, desc, cat, urgency, affected, lat, lon, addr) in enumerate(pan_india_needs):
        status_val = statuses[i % len(statuses)]
        need = Need(
            id=_uuid(),
            reported_by=admin_user.id if i % 3 == 0 else volunteers[i % len(volunteers)].user_id,
            title=title,
            description=desc,
            category=cat,
            urgency=urgency,
            status=status_val,
            latitude=lat + random.uniform(-0.01, 0.01),
            longitude=lon + random.uniform(-0.01, 0.01),
            address=addr,
            people_affected=affected,
            source=random.choice(["manual", "manual", "ocr"]),
            created_at=_random_past(7),
        )
        if status_val == "resolved":
            need.resolved_at = need.created_at + timedelta(hours=random.randint(2, 48))
        db.add(need)
        all_needs.append(need)
        print(f"  Need (IN): {title} [{cat}] urgency={urgency} status={status_val}")

    # --- ASSIGNMENTS ---
    assigned_needs = [n for n in all_needs if n.status in ("assigned", "in_progress", "resolved")]
    available_vols = [v for v in volunteers if v.availability in ("available", "busy")]

    for need in assigned_needs:
        if available_vols:
            vol = random.choice(available_vols)
            assignment = Assignment(
                id=_uuid(),
                need_id=need.id,
                volunteer_id=vol.id,
                status=need.status if need.status != "open" else "assigned",
                match_score=round(random.uniform(50, 95), 2),
                distance_km=round(random.uniform(0.5, 15), 2),
                assigned_at=need.created_at + timedelta(minutes=random.randint(5, 120)),
            )
            if assignment.status in ("in_progress", "resolved"):
                assignment.accepted_at = assignment.assigned_at + timedelta(minutes=random.randint(5, 30))
            if assignment.status == "resolved":
                assignment.started_at = assignment.accepted_at + timedelta(minutes=random.randint(10, 60))
                assignment.completed_at = assignment.started_at + timedelta(hours=random.randint(1, 24))
                assignment.feedback = random.choice([
                    "Task completed successfully. All supplies delivered.",
                    "Great coordination with the local team.",
                    "Reached in time. People were very grateful.",
                ])
                assignment.rating = random.randint(4, 5)

            need.assigned_volunteer_id = vol.id
            db.add(assignment)
            print(f"  Assignment: {need.title[:40]}... -> Volunteer {vol.id[:8]}...")

    # --- COMMIT ---
    db.commit()
    db.close()

    print(f"\nSeed complete!")
    print(f"   1 Admin + {len(volunteers)} Volunteers")
    print(f"   {len(all_needs)} Needs")
    print(f"   {len(assigned_needs)} Assignments")
    print(f"\n   Start the server: uvicorn app.main:app --reload")
    print(f"   API Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    seed()
