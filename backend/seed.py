import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.models.crop import Crop
from app.models.pest import Pest
from app.models.crop_pest import CropPest
from app.models.recommendation import Recommendation
from app.models.detection import Detection

def seed_db():
    print("[+] Starting database seeding...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Create Roles
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin", description="System Administrator")
            db.add(admin_role)

        farmer_role = db.query(Role).filter(Role.name == "farmer").first()
        if not farmer_role:
            farmer_role = Role(name="farmer", description="Farmer User")
            db.add(farmer_role)

        db.commit()

        # 2. Create Users
        admin_user = db.query(User).filter(User.email == "admin@pestdetect.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@pestdetect.com",
                password_hash=get_password_hash("admin123"),
                full_name="System Administrator",
                role_id=admin_role.id,
                is_active=True
            )
            db.add(admin_user)

        farmer_user = db.query(User).filter(User.email == "farmer@pestdetect.com").first()
        if not farmer_user:
            farmer_user = User(
                email="farmer@pestdetect.com",
                password_hash=get_password_hash("farmer123"),
                full_name="Juan Dela Cruz (Farmer)",
                role_id=farmer_role.id,
                is_active=True
            )
            db.add(farmer_user)

        db.commit()

        # 3. Create Sample Configurable Crops
        crops_data = [
            {"name": "Corn", "name_tl": "Mais", "scientific_name": "Zea mays", "description": "Cereal grain widely cultivated for grain and forage.", "description_tl": "Halamang cereal na malawakang itinatanim para sa binhi at pagkain."},
            {"name": "Rice", "name_tl": "Palay", "scientific_name": "Oryza sativa", "description": "Staple food crop cultivated in flooded paddies or drylands.", "description_tl": "Pangunahing pagkain na itinatanim sa tubigan o tuyong lupain."},
            {"name": "Cabbage", "name_tl": "Repolyo", "scientific_name": "Brassica oleracea var. capitata", "description": "Leafy green or purple vegetable crop.", "description_tl": "Halamang gulay na may luntiang o kulay-ubeng mga dahon."}
        ]

        created_crops = {}
        for c in crops_data:
            crop = db.query(Crop).filter(Crop.name == c["name"]).first()
            if not crop:
                crop = Crop(name=c["name"], name_tl=c.get("name_tl"), scientific_name=c["scientific_name"], description=c["description"], description_tl=c.get("description_tl"), status="active")
                db.add(crop)
                db.commit()
                db.refresh(crop)
            created_crops[c["name"]] = crop

        # 4. Create Sample Pests
        pests_data = [
            {
                "name": "Fall Armyworm",
                "name_tl": "Uod na Harabas",
                "scientific_name": "Spodoptera frugiperda",
                "severity_default": "High",
                "description": "Destructive pest that attacks foliage, stems, and growing points.",
                "description_tl": "Mapinsalang peste na umatake sa mga dahon, tangkay, at mga usbong ng halaman.",
                "symptoms": "Ragged holes on leaves, whorl damage, frass presence.",
                "symptoms_tl": "Mapanirang butas sa dahon, pinsala sa gitnang puso ng halaman, at dumi ng uod.",
                "recommendations": [
                    {
                        "action_title": "Biological Control",
                        "action_title_tl": "Biyolohikal na Pagsugpo",
                        "description": "Apply Bacillus thuringiensis (Bt) or neem-based formulations in early larval stages.",
                        "description_tl": "Mag-spray ng Bacillus thuringiensis (Bt) o Neem-based solution sa maagang yugto ng uod.",
                        "management_type": "Biological"
                    },
                    {
                        "action_title": "Field Inspection",
                        "action_title_tl": "Pagsusuri sa Bukid",
                        "description": "Inspect 20 plants per location twice weekly. Handpick larvae when localized.",
                        "description_tl": "Suriin ang 20 halaman sa bawat lugar dalawang beses sa isang linggo. Pulutin ang uod kapag kakaunti pa.",
                        "management_type": "Cultural"
                    }
                ],
                "crops": ["Corn", "Rice"]
            },
            {
                "name": "Rice Blast",
                "name_tl": "Mantsa sa Palay (Blast)",
                "scientific_name": "Magnaporthe oryzae",
                "severity_default": "Critical",
                "description": "Fungal pathogen causing diamond-shaped leaf lesions and neck rot.",
                "description_tl": "Sakit na dulot ng fungus na nagiging sanhi ng hugis-brilyanteng sugat sa dahon at pagkasira ng leeg ng palay.",
                "symptoms": "Spindle-shaped spots with grey or white centers and reddish-brown borders.",
                "symptoms_tl": "Hugis-pabilog o mantsang may abuhin/puting gitna at pulang-tsokolateng gilid.",
                "recommendations": [
                    {
                        "action_title": "Water Management",
                        "action_title_tl": "Pamamahala ng Tubig",
                        "description": "Maintain continuous shallow flooding in paddies to reduce disease severity.",
                        "description_tl": "Panatilihin ang mababaw na tubig sa tubigan upang mabawasan ang paglala ng sakit.",
                        "management_type": "Cultural"
                    },
                    {
                        "action_title": "Fungicide Spray",
                        "action_title_tl": "Pag-spray ng Fungicide",
                        "description": "Apply systemic fungicides (e.g. Tricyclazole) at seedbed or early tillering if outbreak occurs.",
                        "description_tl": "Mag-spray ng systemic fungicide (gaya ng Tricyclazole) sa punlaan o sa maagang pag-uusbong kapag may banta.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Rice"]
            },
            {
                "name": "Diamondback Moth",
                "name_tl": "Uod ng Repolyo (Diamondback)",
                "scientific_name": "Plutella xylostella",
                "severity_default": "Moderate",
                "description": "Small caterpillar pest feeding on brassica leaves.",
                "description_tl": "Maliit na uod na kumakain sa ilalim ng dahon ng repolyo at katulad na gulay.",
                "symptoms": "Window-pane damage on leaf undersides, shot holes.",
                "symptoms_tl": "Nipis na parang bintana sa ilalim ng dahon at maliliit na butas.",
                "recommendations": [
                    {
                        "action_title": "Intercropping",
                        "action_title_tl": "Pagsasama ng Ibang Tanim",
                        "description": "Intercrop with mustard or tomato to repel adult moths.",
                        "description_tl": "Ihalang ang kamatis o mustasa upang mabawasan ang mga gamugamo.",
                        "management_type": "Preventative"
                    }
                ],
                "crops": ["Cabbage"]
            }
        ]

        for p in pests_data:
            pest = db.query(Pest).filter(Pest.name == p["name"]).first()
            if not pest:
                pest = Pest(
                    name=p["name"],
                    name_tl=p.get("name_tl"),
                    scientific_name=p["scientific_name"],
                    severity_default=p["severity_default"],
                    description=p["description"],
                    description_tl=p.get("description_tl"),
                    symptoms=p["symptoms"],
                    symptoms_tl=p.get("symptoms_tl")
                )
                db.add(pest)
                db.commit()
                db.refresh(pest)

                # Add recommendations
                for r in p["recommendations"]:
                    rec = Recommendation(
                        pest_id=pest.id,
                        action_title=r["action_title"],
                        action_title_tl=r.get("action_title_tl"),
                        description=r["description"],
                        description_tl=r.get("description_tl"),
                        management_type=r["management_type"]
                    )
                    db.add(rec)

                # Link crop-pests
                for crop_name in p["crops"]:
                    if crop_name in created_crops:
                        cp = CropPest(crop_id=created_crops[crop_name].id, pest_id=pest.id, notes="Primary host crop")
                        db.add(cp)
                
                db.commit()

        # 5. Create initial mock detection history for Juan Dela Cruz (Farmer)
        farmer = db.query(User).filter(User.email == "farmer@pestdetect.com").first()
        if farmer and db.query(Detection).filter(Detection.user_id == farmer.id).count() == 0:
            corn = created_crops.get("Corn")
            faw = db.query(Pest).filter(Pest.name == "Fall Armyworm").first()

            mock_detection = Detection(
                user_id=farmer.id,
                crop_id=corn.id if corn else None,
                pest_id=faw.id if faw else None,
                image_path="/static/uploads/detections/sample_pest.jpg",
                confidence_score=0.94,
                severity="High",
                detected_pest_name="Fall Armyworm",
                recommended_action="Inspect plant whorls immediately. Apply biological control (Bacillus thuringiensis).",
                bounding_boxes=[{"x_min": 0.2, "y_min": 0.25, "x_max": 0.7, "y_max": 0.75, "label": "Fall Armyworm", "confidence": 0.94}],
                status="completed"
            )
            db.add(mock_detection)
            db.commit()

        print("[SUCCESS] Database seeding completed successfully!")
        print("   Admin Account:  admin@pestdetect.com / admin123")
        print("   Farmer Account: farmer@pestdetect.com / farmer123")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during DB seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
