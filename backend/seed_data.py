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


# City data with coordinates and addresses
CITIES = {
    'Mumbai': {
        'center': (19.0760, 72.8777),
        'addresses': [
            "Andheri West, Mumbai", "Bandra East, Mumbai", "Dadar, Mumbai",
            "Juhu, Mumbai", "Powai, Mumbai", "Malad West, Mumbai",
            "Goregaon East, Mumbai", "Borivali West, Mumbai", "Thane West, Thane",
            "Vashi, Navi Mumbai", "Kurla East, Mumbai", "Chembur, Mumbai",
            "Ghatkopar West, Mumbai", "Vikhroli East, Mumbai", "Mulund West, Mumbai",
            "Kalyan West, Kalyan", "Panvel, Navi Mumbai", "Dombivli East, Dombivli",
            "Airoli, Navi Mumbai", "Kharghar, Navi Mumbai"
        ]
    },
    'Delhi': {
        'center': (28.6139, 77.2090),
        'addresses': [
            "Connaught Place, Delhi", "Karol Bagh, Delhi", "Lajpat Nagar, Delhi",
            "Dwarka, Delhi", "Rohini, Delhi", "Pitampura, Delhi",
            "Shalimar Bagh, Delhi", "Vasant Kunj, Delhi", "Greater Kailash, Delhi",
            "Hauz Khas, Delhi", "Saket, Delhi", "Nehru Place, Delhi",
            "Rajouri Garden, Delhi", "Punjabi Bagh, Delhi", "Janakpuri, Delhi",
            "Uttam Nagar, Delhi", "Najafgarh, Delhi", "Noida Sector 18, Noida",
            "Gurgaon Sector 14, Gurgaon", "Faridabad Sector 21, Faridabad"
        ]
    },
    'Bangalore': {
        'center': (12.9716, 77.5946),
        'addresses': [
            "MG Road, Bangalore", "Brigade Road, Bangalore", "Commercial Street, Bangalore",
            "Koramangala, Bangalore", "HSR Layout, Bangalore", "BTM Layout, Bangalore",
            "Jayanagar, Bangalore", "Rajajinagar, Bangalore", "Malleshwaram, Bangalore",
            "Indiranagar, Bangalore", "Whitefield, Bangalore", "Electronic City, Bangalore",
            "Marathahalli, Bangalore", "Sarjapur Road, Bangalore", "Bannerghatta Road, Bangalore",
            "Hebbal, Bangalore", "Yelahanka, Bangalore", "KR Puram, Bangalore",
            "Bellandur, Bangalore", "Varthur, Bangalore"
        ]
    },
    'Chennai': {
        'center': (13.0827, 80.2707),
        'addresses': [
            "T. Nagar, Chennai", "Anna Nagar, Chennai", "Adyar, Chennai",
            "Velachery, Chennai", "Nungambakkam, Chennai", "Mylapore, Chennai",
            "Royapettah, Chennai", "Kilpauk, Chennai", "Purasawalkam, Chennai",
            "Triplicane, Chennai", "Egmore, Chennai", "George Town, Chennai",
            "Parrys, Chennai", "Washermanpet, Chennai", "Royapuram, Chennai",
            "Tondiarpet, Chennai", "Madhavaram, Chennai", "Ambattur, Chennai",
            "Avadi, Chennai", "Tambaram, Chennai"
        ]
    },
    'Kolkata': {
        'center': (22.5726, 88.3639),
        'addresses': [
            "Salt Lake City, Kolkata", "New Town, Kolkata", "Park Street, Kolkata",
            "Camac Street, Kolkata", "Ballygunge, Kolkata", "Gariahat, Kolkata",
            "Behala, Kolkata", "Jadavpur, Kolkata", "Tollygunge, Kolkata",
            "Alipore, Kolkata", "Bhowanipore, Kolkata", "Kalighat, Kolkata",
            "Bow Bazaar, Kolkata", "Sealdah, Kolkata", "Shyambazar, Kolkata",
            "Bagbazar, Kolkata", "Maniktala, Kolkata", "Ultadanga, Kolkata",
            "Dum Dum, Kolkata", "Baranagar, Kolkata"
        ]
    }
}

def _random_coords(center_lat, center_lng, variance=0.08):
    """Generate random coordinates around a center point."""
    return (
        center_lat + random.uniform(-variance, variance),
        center_lng + random.uniform(-variance, variance),
    )


SKILLS_POOL = [
    "medical", "first_aid", "nursing", "cooking", "driving",
    "logistics", "construction", "teaching", "counseling",
    "swimming", "cleaning", "it_support", "translation",
    "childcare", "elderly_care", "mental_health",
]


def seed():
    init_db()
    db = SessionLocal()

    print("🌱 Seeding database with demo data...\n")

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
    print(f"  👤 Admin: {admin_user.name} ({admin_user.email})")

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

        # Randomly select a city for this volunteer
        city_name = random.choice(list(CITIES.keys()))
        city_data = CITIES[city_name]
        lat, lon = _random_coords(*city_data['center'])
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
            address=random.choice(city_data['addresses']),
            availability=avail,
            tasks_completed=random.randint(0, 25),
            rating=round(random.uniform(3.0, 5.0), 1),
            total_ratings=random.randint(1, 15),
            created_at=user.created_at,
        )
        db.add(vol)
        volunteers.append(vol)
        print(f"  🙋 Volunteer: {name} | City: {city_name} | Skills: {skills} | {avail}")

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
        # Randomly select a city for this need
        city_name = random.choice(list(CITIES.keys()))
        city_data = CITIES[city_name]
        lat, lon = _random_coords(*city_data['center'])
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
            address=random.choice(city_data['addresses']),
            people_affected=affected,
            source=random.choice(["manual", "manual", "manual", "ocr"]),
            created_at=_random_past(10),
        )
        if status_val == "resolved":
            need.resolved_at = need.created_at + timedelta(hours=random.randint(2, 48))

        db.add(need)
        all_needs.append(need)
        emoji = {"medical": "🏥", "food": "🍚", "shelter": "🏠", "water": "💧", "rescue": "🚨", "education": "📚", "clothing": "👕", "sanitation": "🧹"}.get(cat, "📋")
        print(f"  {emoji} Need: {title} [{cat}] | City: {city_name} | urgency={urgency} status={status_val}")

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
            print(f"  🔗 Assignment: {need.title[:40]}... → Volunteer {vol.id[:8]}...")

    # --- COMMIT ---
    db.commit()
    db.close()

    print(f"\n✅ Seed complete!")
    print(f"   👤 1 Admin + {len(volunteers)} Volunteers")
    print(f"   📋 {len(all_needs)} Needs")
    print(f"   🔗 {len(assigned_needs)} Assignments")
    print(f"\n💡 Start the server: uvicorn app.main:app --reload")
    print(f"📖 API Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    seed()
