import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal, engine, Base, ensure_schema_compatibility
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.models.crop import Crop
from app.models.pest import Pest
from app.models.crop_pest import CropPest
from app.models.disease import Disease
from app.models.crop_disease import CropDisease
from app.models.disease_recommendation import DiseaseRecommendation
from app.models.recommendation import Recommendation
from app.models.detection import Detection

def seed_db():
    print("[+] Starting database seeding...")
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility()
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

        # 3. Create Target Leafy Green Crops (System strictly revolves around Lettuce, Bok Choy, Mustard Greens)
        crops_data = [
            {
                "name": "Lettuce",
                "name_tl": "Litsugas",
                "scientific_name": "Lactuca sativa",
                "description": "Crisp annual leafy salad vegetable cultivated in soil beds and hydroponic vertical farm systems at Costales Nature Farms.",
                "description_tl": "Luntiang malulutong na gulay na itinatanim sa lupang kamada o sa hydroponics para sa sariwang ensalada sa Costales Nature Farms."
            },
            {
                "name": "Bok Choy",
                "name_tl": "Petsay",
                "scientific_name": "Brassica rapa subsp. chinensis",
                "description": "Fast-growing Asian cruciferous leafy green featuring tender dark-green leaf blades and succulent white petioles, widely grown in Costales open-field plots.",
                "description_tl": "Mabilis tumubong gulay na may mapuputing makatas na tangkay at berdeng dahon, pangunahing gulay sa mga organikong taniman ng Costales."
            },
            {
                "name": "Mustard Greens",
                "name_tl": "Mustasa",
                "scientific_name": "Brassica juncea",
                "description": "Nutrient-dense cruciferous green with mildly peppery, serrated foliage, grown under strict organic integrated pest management.",
                "description_tl": "Masustansyang madahong gulay na may bahagyang maanghang na lasa, kilalang-kilala sa pagbuburo at organiko at natural na pagtatanim."
            }
        ]

        # Purge legacy non-leafy crops (Corn, Rice, Cabbage, etc.) to ensure complete system focus on leafy greens
        allowed_crop_names = [c["name"] for c in crops_data]
        legacy_crops = db.query(Crop).filter(~Crop.name.in_(allowed_crop_names)).all()
        for lc in legacy_crops:
            db.query(CropPest).filter(CropPest.crop_id == lc.id).delete(synchronize_session=False)
            db.query(CropDisease).filter(CropDisease.crop_id == lc.id).delete(synchronize_session=False)
            db.query(Detection).filter(Detection.crop_id == lc.id).delete(synchronize_session=False)
            db.delete(lc)
        db.commit()

        created_crops = {}
        for c in crops_data:
            crop = db.query(Crop).filter(Crop.name == c["name"]).first()
            if not crop:
                crop = Crop(
                    name=c["name"],
                    name_tl=c.get("name_tl"),
                    scientific_name=c["scientific_name"],
                    description=c["description"],
                    description_tl=c.get("description_tl"),
                    status="active"
                )
                db.add(crop)
                db.commit()
                db.refresh(crop)
            created_crops[c["name"]] = crop

        # 4. Create Pests for Leafy Greens
        pests_data = [
            {
                "name": "Diamondback Moth",
                "name_tl": "Uod ng Repolyo at Petsay (Diamondback)",
                "scientific_name": "Plutella xylostella",
                "severity_default": "Moderate",
                "description": "Key lepidopteran pest of crucifers; slender pale green larvae skeletonize brassica foliage.",
                "description_tl": "Maliit na berdeng uod na kumakain sa ilalim ng dahon ng petsay at mustasa.",
                "symptoms": "Window-pane translucent feeding scars on leaf undersides, progressing into shot-holes.",
                "symptoms_tl": "Nipis na parang salaming bintana sa ilalim ng dahon na nagiging maliliit na butas.",
                "recommendations": [
                    {
                        "action_title": "Pheromone Trapping & Bt Spray",
                        "action_title_tl": "Pheromone Trap at Bt Spray",
                        "description": "Deploy sticky pheromone delta traps to monitor adults. Spray selective Bt kurstaki at dusk.",
                        "description_tl": "Maglagay ng pheromone trap para sa gamugamo at mag-spray ng Bt kurstaki sa dapithapon.",
                        "management_type": "Biological"
                    },
                    {
                        "action_title": "Crop Rotation & Intercropping",
                        "action_title_tl": "Pagpapalit at Pagsasama ng Pananim",
                        "description": "Intercrop brassicas with aromatic herbs (coriander, dill) or marigolds to repel ovipositing moths.",
                        "description_tl": "Ihalang ang mababangong halaman tulad ng wansoy o marigold upang itaboy ang gamugamo.",
                        "management_type": "Cultural"
                    }
                ],
                "crops": ["Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Green Peach Aphid",
                "name_tl": "Kuto sa Dahon (Aphids)",
                "scientific_name": "Myzus persicae",
                "severity_default": "Moderate",
                "description": "Prolific sap-sucking insects colonizing the undersides of lettuce and brassica leaves, stunting growth and transmitting plant viruses.",
                "description_tl": "Maliliit na kulisap na sumisipsip ng katas sa ilalim ng mga dahon ng litsugas at petsay, nagdudulot ng panunuklap at virus.",
                "symptoms": "Curling, crinkled leaves, stunted vegetative shoot tips, presence of sticky honeydew exudate and black sooty mold.",
                "symptoms_tl": "Panunuklap at pagkulubot ng mga dahon, pagkabansot ng usbong, at madikit na likido na may itim na amag.",
                "recommendations": [
                    {
                        "action_title": "Potassium Salt & Horticultural Soap Spray",
                        "action_title_tl": "Pag-spray ng Horticultural Soap o Neem",
                        "description": "Wash colonies with 1% potassium salts of fatty acids or cold-pressed neem oil (5ml/L) focusing directly on leaf undersides.",
                        "description_tl": "Hugasan ang ilalim ng dahon gamit ang neem oil solution o sabong pang-agrikultura.",
                        "management_type": "Biological"
                    },
                    {
                        "action_title": "Beneficial Insect Conservation",
                        "action_title_tl": "Pangangalaga sa Kaibigang Insekto",
                        "description": "Release or conserve predatory ladybird beetles (Coccinellidae) and hoverfly larvae in the canopy.",
                        "description_tl": "Hayaang mamalagi ang mga ladybug at hoverfly na kumakain sa mga kuto.",
                        "management_type": "Biological"
                    }
                ],
                "crops": ["Lettuce", "Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Striped Flea Beetle",
                "name_tl": "Flea Beetle (Luya-luyahan)",
                "scientific_name": "Phyllotreta striolata",
                "severity_default": "High",
                "description": "Small, jumping chrysomelid beetles that severely puncture seedlings and young foliage of cruciferous greens.",
                "description_tl": "Maliliit at tumatalong itim na salagubang na bumubutas nang pino sa mga punla at dahon ng petsay at mustasa.",
                "symptoms": "Numerous minute circular shot-holes across outer leaves, giving foliage a sieve-like appearance and stunting young seedlings.",
                "symptoms_tl": "Daan-daang pinong bilog na butas sa dahon na parang nilaslas o sinala, dahilan ng pagkatuyot ng punla.",
                "recommendations": [
                    {
                        "action_title": "Insect Net Barrier & Yellow Sticky Traps",
                        "action_title_tl": "Paggamit ng Kulambo at Yellow Traps",
                        "description": "Install fine 32-mesh insect barrier netting over nursery beds and place yellow sticky cards near soil level.",
                        "description_tl": "Takpan ang kamada ng pinong insect net (kulambo) at maglagay ng dilaw na pandikit na patibong.",
                        "management_type": "Physical"
                    },
                    {
                        "action_title": "Botanical Pyrethrin / Diatomaceous Earth",
                        "action_title_tl": "Pagsabog ng Diatomaceous Earth o Pyrethrin",
                        "description": "Dust food-grade diatomaceous earth around seedling stems or spray natural pyrethrin during peak morning feeding.",
                        "description_tl": "Magbudbod ng diatomaceous earth o mag-spray ng pyrethrin sa bandang umaga.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Cabbage Looper",
                "name_tl": "Uod na Sumusukat (Looper)",
                "scientific_name": "Trichoplusia ni",
                "severity_default": "Moderate",
                "description": "Smooth green caterpillar that arches its back in a looping inchworm motion while devouring leafy greens.",
                "description_tl": "Berdeng uod na sumusukat kung gumapang na masibang ngumangatngat ng dahon ng litsugas at petsay.",
                "symptoms": "Large, ragged irregular chew holes throughout foliage, with coarse greenish-black fecal pellets left in leaf axils.",
                "symptoms_tl": "Malalaki at hindi pantay na butas sa buong dahon na may kasamang maiitim na dumi ng uod sa singit ng tangkay.",
                "recommendations": [
                    {
                        "action_title": "Targeted Bacillus thuringiensis Spray",
                        "action_title_tl": "Pag-spray ng Bt kurstaki",
                        "description": "Apply Bt kurstaki bio-spray thoroughly to both leaf surfaces at twilight when loopers feed most voraciously.",
                        "description_tl": "Mag-spray ng Bt kurstaki sa itaas at ilalim ng dahon sa takipsilim bago kumain ang mga uod.",
                        "management_type": "Biological"
                    }
                ],
                "crops": ["Lettuce", "Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Serpentine Leafminer",
                "name_tl": "Leafminer sa Dahon",
                "scientific_name": "Liriomyza trifolii",
                "severity_default": "Low",
                "description": "Agromyzid fly whose larvae burrow through the mesophyll of salad greens, leaving whitish serpentine trails.",
                "description_tl": "Maliit na langaw na ang uod ay gumagawa ng mapuputing paikot-ikot na lagusan sa loob ng dahon ng gulay.",
                "symptoms": "White to silvery winding serpentine trails etched inside the leaf blade, reducing photosynthesis and commercial market value.",
                "symptoms_tl": "Mapuputi at paliko-likong guhit o minahan sa loob ng dahon na nagpapababa sa halaga sa palengke.",
                "recommendations": [
                    {
                        "action_title": "Sanitation & Manual Leaf Removal",
                        "action_title_tl": "Pagpitas ng Apektadong Dahon",
                        "description": "Prune and dispose of initial leaves bearing fresh mines. Place bright yellow sticky sheets at crop canopy height.",
                        "description_tl": "Pitasin at sirain ang mga unang dahon na may minahan; maglagay ng dilaw na sticky traps.",
                        "management_type": "Cultural"
                    }
                ],
                "crops": ["Lettuce", "Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Common Cutworm",
                "name_tl": "Harabas / Uod Pamutol",
                "scientific_name": "Spodoptera litura",
                "severity_default": "High",
                "description": "Subterranean and surface nocturnal caterpillar that cuts down newly transplanted leafy seedlings at the soil line.",
                "description_tl": "Uod na lumalabas sa gabi at pinuputol ang tangkay ng mga bagong lipat na punla sa bandang ibabaw ng lupa.",
                "symptoms": "Young bok choy and lettuce seedlings found severed cleanly near the soil line; night-time leaf skeletonization.",
                "symptoms_tl": "Mga punla na putol sa puno at nakatumba sa umaga; malubhang pagkain sa mga dahon tuwing gabi.",
                "recommendations": [
                    {
                        "action_title": "Protective Collars & Soil Solarization",
                        "action_title_tl": "Kuwelyo sa Punla at Pag-aararo",
                        "description": "Place cardboard or plastic collar sleeves around transplant bases and till beds thoroughly before planting to expose pupae.",
                        "description_tl": "Lagyan ng protektibong kuwelyo ang puno ng punla at araruhin ang lupa bago magtanim.",
                        "management_type": "Cultural"
                    }
                ],
                "crops": ["Lettuce", "Bok Choy", "Mustard Greens"]
            }
        ]

        # Purge legacy pests not attacking target leafy greens
        allowed_pest_names = [p["name"] for p in pests_data]
        legacy_pests = db.query(Pest).filter(~Pest.name.in_(allowed_pest_names)).all()
        for lp in legacy_pests:
            db.query(Recommendation).filter(Recommendation.pest_id == lp.id).delete(synchronize_session=False)
            db.query(CropPest).filter(CropPest.pest_id == lp.id).delete(synchronize_session=False)
            db.query(Detection).filter(Detection.pest_id == lp.id).delete(synchronize_session=False)
            db.delete(lp)
        db.commit()

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
                db.commit()

            # Link crop-pests
            for crop_name in p["crops"]:
                if crop_name in created_crops:
                    crop_obj = created_crops[crop_name]
                    existing_cp = db.query(CropPest).filter(CropPest.crop_id == crop_obj.id, CropPest.pest_id == pest.id).first()
                    if not existing_cp:
                        db.add(CropPest(crop_id=crop_obj.id, pest_id=pest.id, notes="Primary host crop"))
            db.commit()

        # 5. Create Plant Diseases for Leafy Greens
        diseases_data = [
            {
                "name": "Black Rot of Brassicas",
                "name_tl": "Itim na Bulok sa Petsay at Mustasa",
                "scientific_name": "Xanthomonas campestris pv. campestris",
                "pathogen_type": "Bacterial",
                "severity_default": "Moderate",
                "description": "Most destructive bacterial disease of crucifers, causing characteristic V-shaped marginal chlorosis and blackened veins.",
                "description_tl": "Pangunahing sakit sa petsay at mustasa na lumilikha ng hugis-V na paninilaw mula sa gilid ng dahon at itim na ugat.",
                "symptoms": "Yellow V-shaped lesions on leaf margins pointing toward the leaf midrib; blackened vascular veins visible upon leaf cross-section.",
                "symptoms_tl": "Hugis-V na dilaw na mantsa sa gilid ng dahon at pangingitim ng mga ugat ng dahon.",
                "recommendations": [
                    {
                        "action_title": "Multi-Year Crop Rotation",
                        "action_title_tl": "Pagpapalit-Tanim sa Bukid",
                        "description": "Do not plant crucifers (bok choy, mustard) in the same soil for at least 3 years.",
                        "description_tl": "Huwag magtanim ng petsay o mustasa sa parehong lugar sa loob ng 3 taon.",
                        "management_type": "Cultural"
                    },
                    {
                        "action_title": "Certified Clean Seeds & Copper Spray",
                        "action_title_tl": "Malinis na Binhi at Copper Spray",
                        "description": "Use hot-water treated disease-free seeds and apply preventative copper hydroxide sprays during rainy spells.",
                        "description_tl": "Gumamit ng sertipikadong malinis na binhi at mag-spray ng copper hydroxide tuwing maulang panahon.",
                        "management_type": "Preventative"
                    }
                ],
                "crops": ["Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Downy Mildew of Brassicas",
                "name_tl": "Downy Mildew sa Petsay at Mustasa",
                "scientific_name": "Peronospora parasitica",
                "pathogen_type": "Fungal",
                "severity_default": "Moderate",
                "description": "Oomycete foliar disease producing angular yellow chlorotic patches with fuzzy white downy mold underneath.",
                "description_tl": "Sakit na nagdudulot ng manilaw-nilaw na mantsa sa ibabaw ng dahon at puting parang bulak sa ilalim.",
                "symptoms": "Irregular yellow patches on the upper leaf surface with delicate grayish-white downy fungal growth on the underside.",
                "symptoms_tl": "Maninilaw na mantsa sa ibabaw ng dahon at mabalahibong puting amag sa ilalim ng dahon.",
                "recommendations": [
                    {
                        "action_title": "Targeted Oomycete Spray",
                        "action_title_tl": "Pag-spray laban sa Mildew",
                        "description": "Apply protectant or systemic fungicides such as Metalaxyl-M or Mancozeb on seedlings and developing foliage.",
                        "description_tl": "Mag-spray ng Mancozeb o Metalaxyl sa punla at habang lumalaki ang mga dahon.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Downy Mildew of Lettuce",
                "name_tl": "Downy Mildew sa Litsugas",
                "scientific_name": "Bremia lactucae",
                "pathogen_type": "Fungal",
                "severity_default": "High",
                "description": "Highly aggressive oomycete pathogen attacking lettuce leaves, causing angular yellow patches bordered strictly by leaf veins and white downy sporangiophores underneath.",
                "description_tl": "Mabilis kumalat na amag sa dahon ng litsugas na nagdudulot ng kanto-kantong dilaw na mantsa at puting pulbos sa ilalim.",
                "symptoms": "Pale yellow angular chlorotic spots bounded sharply by veins on upper leaf surfaces; white downy felt-like mold sporulation on corresponding undersides.",
                "symptoms_tl": "Kanto-kantong dilaw na mantsa na pinipigilan ng ugat ng dahon sa ibabaw; puting parang bulak na amag sa ilalim.",
                "recommendations": [
                    {
                        "action_title": "Canopy Aeration & Drip Irrigation",
                        "action_title_tl": "Pahanginan ang Taniman at Drip Irrigation",
                        "description": "Ensure 30cm spacing between lettuce plants and irrigate early morning via drip lines to avoid wetting foliage overnight.",
                        "description_tl": "Panatilihin ang 30cm na pagitan ng mga tanim at magdilig sa maagang umaga upang hindi mabasa ang dahon sa gabi.",
                        "management_type": "Cultural"
                    },
                    {
                        "action_title": "Systemic Phosphonate / Mandipropamid Spray",
                        "action_title_tl": "Pag-spray ng Mandipropamid o Potassium Phosphite",
                        "description": "Spray potassium phosphite or mandipropamid protectant fungicide at rosette formation during cool, humid weather.",
                        "description_tl": "Mag-spray ng potassium phosphite o mandipropamid sa malamig at mahalumigmig na panahon.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Lettuce"]
            },
            {
                "name": "Bottom Rot & Drop of Lettuce",
                "name_tl": "Bulok sa Puno at Pagbagsak ng Litsugas",
                "scientific_name": "Rhizoctonia solani / Sclerotinia sclerotiorum",
                "pathogen_type": "Fungal",
                "severity_default": "High",
                "description": "Soil-borne fungal complex rotting lower wrapper leaves touching moist ground, leading to sudden vascular collapse and wilt of lettuce heads.",
                "description_tl": "Sakit mula sa lupa na nagbubulok sa mga ibabang dahon na nakadikit sa basang lupa, na nauuwi sa biglaang pagkabulok ng buong litsugas.",
                "symptoms": "Rust-brown sunken lesions on midribs of lower wrapper leaves; wet slimy brown collapse of the head with white cottony mycelium and black sclerotia.",
                "symptoms_tl": "Lugmok na kulay-tsokolateng sugat sa ilalim na dahon, mabilis na pagkabulok ng buong puno at puting parang bulak na may itim na butil.",
                "recommendations": [
                    {
                        "action_title": "Raised Bed & Plastic Mulch Culture",
                        "action_title_tl": "Paggamit ng Plastic Mulch sa Matataas na Kamada",
                        "description": "Transplant on elevated 20cm raised beds lined with silver-black plastic mulch to create a clean barrier between soil and lower leaves.",
                        "description_tl": "Itanim sa mataas na kamada na may silver-black plastic mulch upang hindi sumayad ang dahon sa basang lupa.",
                        "management_type": "Physical"
                    },
                    {
                        "action_title": "Iprodione / Fludioxonil Crown Drench",
                        "action_title_tl": "Drenching ng Fungicide sa Puno",
                        "description": "Apply targeted crown spray with iprodione or fludioxonil directed at the plant base at 10 to 14 days after transplanting.",
                        "description_tl": "Magdilig ng fungicide sa mismong puno ng litsugas 10-14 araw pagkatapos itanim.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Lettuce"]
            },
            {
                "name": "Bacterial Soft Rot",
                "name_tl": "Basang Bulok na Bakterya (Soft Rot)",
                "scientific_name": "Pectobacterium carotovorum subsp. carotovorum",
                "pathogen_type": "Bacterial",
                "severity_default": "Critical",
                "description": "Fast-moving bacterial disease that secretes pectolytic enzymes, rapidly turning crisp lettuce heads and bok choy petioles into a watery, foul-smelling mush.",
                "description_tl": "Mabilis na bacterial infection na nagtutunaw sa mga tangkay at puso ng petsay at litsugas na nagiging mabaho at malapot na putik.",
                "symptoms": "Water-soaked translucent glassy lesions on petioles rapidly advancing into slimy, brown-to-black liquefied plant tissue with an offensive odor.",
                "symptoms_tl": "Mala-salaming basang sugat sa tangkay na mabilis natutunaw at nagiging maitim, malabnaw, at napakabahong bulok.",
                "recommendations": [
                    {
                        "action_title": "Field Drainage & Gentle Harvesting",
                        "action_title_tl": "Pag-iwas sa Sugat at Tamang Patubig",
                        "description": "Ensure excellent field drainage; harvest only dry heads and sanitize cutting knives frequently in 10% household bleach solution.",
                        "description_tl": "Huwag mag-ani habang basa ang tanim; disimpektahin ang kutsilyo gamit ang bleach solution.",
                        "management_type": "Cultural"
                    },
                    {
                        "action_title": "Copper Bactericide Field Shield",
                        "action_title_tl": "Pag-spray ng Copper Hydroxide",
                        "description": "Apply protective copper hydroxide bactericide spray before heavy seasonal storms or after pest wounding events.",
                        "description_tl": "Mag-spray ng copper bactericide bago ang malalakas na bagyo o ulan upang hindi makapasok ang mikrobyo.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Lettuce", "Bok Choy", "Mustard Greens"]
            },
            {
                "name": "Alternaria Leaf Spot of Brassicas",
                "name_tl": "Mantsang Alternaria sa Petsay at Mustasa",
                "scientific_name": "Alternaria brassicae",
                "pathogen_type": "Fungal",
                "severity_default": "Moderate",
                "description": "Ubiquitous foliar fungal pathogen of crucifers that produces expanding circular target-pattern lesions with concentric brown rings.",
                "description_tl": "Pangkaraniwang sakit ng petsay at mustasa na nagdudulot ng pabilog na mantsa na may concentric rings na parang target sa darts.",
                "symptoms": "Circular brown-to-black necrotic spots with prominent concentric zonation rings surrounded by distinct yellow chlorotic rings.",
                "symptoms_tl": "Pabilog na mantsa na may guhit-guhit na pabilog sa loob (concentric rings) at may madilaw na paligid.",
                "recommendations": [
                    {
                        "action_title": "Post-Harvest Sanitation & Clean Seed",
                        "action_title_tl": "Paglilinis ng Bukid at Malinis na Binhi",
                        "description": "Collect and deeply bury or compost crop residues immediately after harvest; plant certified hot-water-soaked seeds.",
                        "description_tl": "Linisin at ibaon ang mga tirang dahon pagkaani; gumamit ng mainit na tubig sa pag-isterilisa ng binhi.",
                        "management_type": "Cultural"
                    },
                    {
                        "action_title": "Preventative Mancozeb / Chlorothalonil Spray",
                        "action_title_tl": "Pag-spray ng Mancozeb o Chlorothalonil",
                        "description": "Spray contact protectant Mancozeb 80% WP at 7-day intervals during warm, wet monsoon conditions.",
                        "description_tl": "Mag-spray ng Mancozeb tuwing maulan at mainit upang maiwasan ang pagdami ng mantsa.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Bok Choy", "Mustard Greens"]
            },
            {
                "name": "White Rust of Crucifers",
                "name_tl": "Puting Kalawang sa Mustasa (White Rust)",
                "scientific_name": "Albugo candida",
                "pathogen_type": "Fungal",
                "severity_default": "Moderate",
                "description": "Obligate oomycete organism causing raised porcelain-white chalky blisters on the underside of mustard greens and Asian greens.",
                "description_tl": "Sakit na nagdudulot ng parang yesong puting bukol o paltos sa ilalim ng dahon ng mustasa.",
                "symptoms": "Prominent, raised, chalky-white blister-like pustules (sori) on the underside of leaves; upper leaf surfaces display corresponding pale yellow patches.",
                "symptoms_tl": "Makakapal na puting paltos na parang yeso sa ilalim ng dahon; naninilaw na mantsa sa kabilang ibabaw.",
                "recommendations": [
                    {
                        "action_title": "Weed Host Eradication & Air Circulation",
                        "action_title_tl": "Paggapas ng Damong Ligaw at Wastong Hangin",
                        "description": "Eradicate wild cruciferous weeds (wild mustard, shepherd's purse) nearby that act as green bridges for oospores.",
                        "description_tl": "Tanggalin ang mga damong ligaw sa paligid na maaaring pamahayan ng amag.",
                        "management_type": "Cultural"
                    },
                    {
                        "action_title": "Metalaxyl-M Systemic Treatment",
                        "action_title_tl": "Pag-spray ng Metalaxyl-M",
                        "description": "Apply systemic Metalaxyl-M + Mancozeb formulation early upon noticing first blister symptoms.",
                        "description_tl": "Mag-spray ng Metalaxyl-M + Mancozeb kapag nagsimula ang mga unang puting paltos.",
                        "management_type": "Chemical"
                    }
                ],
                "crops": ["Mustard Greens", "Bok Choy"]
            }
        ]

        # Purge legacy non-leafy green diseases from DB
        allowed_disease_names = [d["name"] for d in diseases_data]
        legacy_diseases = db.query(Disease).filter(~Disease.name.in_(allowed_disease_names)).all()
        for ld in legacy_diseases:
            db.query(DiseaseRecommendation).filter(DiseaseRecommendation.disease_id == ld.id).delete(synchronize_session=False)
            db.query(CropDisease).filter(CropDisease.disease_id == ld.id).delete(synchronize_session=False)
            db.query(Detection).filter(Detection.disease_id == ld.id).delete(synchronize_session=False)
            db.delete(ld)
        db.commit()

        for d in diseases_data:
            disease = db.query(Disease).filter(Disease.name == d["name"]).first()
            if not disease:
                disease = Disease(
                    name=d["name"],
                    name_tl=d.get("name_tl"),
                    scientific_name=d["scientific_name"],
                    pathogen_type=d["pathogen_type"],
                    severity_default=d["severity_default"],
                    description=d["description"],
                    description_tl=d.get("description_tl"),
                    symptoms=d["symptoms"],
                    symptoms_tl=d.get("symptoms_tl")
                )
                db.add(disease)
                db.commit()
                db.refresh(disease)

                for r in d["recommendations"]:
                    rec = DiseaseRecommendation(
                        disease_id=disease.id,
                        action_title=r["action_title"],
                        action_title_tl=r.get("action_title_tl"),
                        description=r["description"],
                        description_tl=r.get("description_tl"),
                        management_type=r["management_type"]
                    )
                    db.add(rec)
                db.commit()

            # Link crop-diseases
            for crop_name in d["crops"]:
                if crop_name in created_crops:
                    crop_obj = created_crops[crop_name]
                    existing_cd = db.query(CropDisease).filter(CropDisease.crop_id == crop_obj.id, CropDisease.disease_id == disease.id).first()
                    if not existing_cd:
                        db.add(CropDisease(crop_id=crop_obj.id, disease_id=disease.id, notes="Primary vulnerable host crop"))
            db.commit()

        # 6. Create realistic mock detection history for Juan Dela Cruz (Farmer)
        farmer = db.query(User).filter(User.email == "farmer@pestdetect.com").first()
        if farmer:
            lettuce_crop = created_crops.get("Lettuce")
            bokchoy_crop = created_crops.get("Bok Choy")
            mustard_crop = created_crops.get("Mustard Greens")

            # Check if detection records for Lettuce already exist
            lettuce_count = db.query(Detection).filter(Detection.crop_id == lettuce_crop.id).count() if lettuce_crop else 0
            if lettuce_crop and lettuce_count == 0:
                aphid_pest = db.query(Pest).filter(Pest.name == "Green Peach Aphid").first()
                downy_lettuce = db.query(Disease).filter(Disease.name == "Downy Mildew of Lettuce").first()
                looper_pest = db.query(Pest).filter(Pest.name == "Cabbage Looper").first()
                soft_rot = db.query(Disease).filter(Disease.name == "Bacterial Soft Rot").first()

                db.add(Detection(
                    user_id=farmer.id,
                    crop_id=lettuce_crop.id,
                    pest_id=aphid_pest.id if aphid_pest else None,
                    disease_id=downy_lettuce.id if downy_lettuce else None,
                    detection_type="pest_and_disease",
                    image_path="/static/uploads/detections/1b6f87eeedb74669861a173420ec0fbd.jpg",
                    confidence_score=0.93,
                    severity="Moderate",
                    detected_pest_name="Green Peach Aphid",
                    recommended_action="Apply neem oil spray (5ml/L) focusing directly on leaf undersides. Conserve ladybug predators.",
                    detected_disease_name="Downy Mildew of Lettuce",
                    disease_confidence_score=0.91,
                    disease_severity="High",
                    disease_recommended_action="Ensure 30cm spacing for canopy aeration and apply protectant potassium phosphite fungicide.",
                    weather_condition="High Humidity / 26°C",
                    field_location="Zone 1: Greenhouse Hydroponics #2, Brgy. Gagalot",
                    disease_details={
                        "name": "Downy Mildew of Lettuce",
                        "scientific_name": "Bremia lactucae",
                        "pathogen_type": "Fungal",
                        "severity": "High",
                        "symptoms": "Pale yellow angular chlorotic spots bounded sharply by veins."
                    },
                    bounding_boxes=[
                        {"x_min": 0.15, "y_min": 0.22, "x_max": 0.48, "y_max": 0.62, "label": "Pest: Green Peach Aphid", "type": "pest", "confidence": 0.93},
                        {"x_min": 0.52, "y_min": 0.30, "x_max": 0.86, "y_max": 0.75, "label": "Disease: Downy Mildew of Lettuce", "type": "disease", "confidence": 0.91}
                    ],
                    status="completed"
                ))

                db.add(Detection(
                    user_id=farmer.id,
                    crop_id=lettuce_crop.id,
                    pest_id=looper_pest.id if looper_pest else None,
                    disease_id=soft_rot.id if soft_rot else None,
                    detection_type="pest_and_disease",
                    image_path="/static/uploads/detections/400e0c0469cb49c986e722d83de6a2ef.jpg",
                    confidence_score=0.89,
                    severity="Moderate",
                    detected_pest_name="Cabbage Looper",
                    recommended_action="Apply Bacillus thuringiensis (Bt) kurstaki at dusk when caterpillars are active.",
                    detected_disease_name="Bacterial Soft Rot",
                    disease_confidence_score=0.95,
                    disease_severity="Critical",
                    disease_recommended_action="Remove and incinerate rotten heads. Disinfect harvesting knives in bleach.",
                    weather_condition="Rainy Spell / 24°C",
                    field_location="Zone 1: Salad Greens Raised Bed #4, Brgy. Gagalot",
                    disease_details={
                        "name": "Bacterial Soft Rot",
                        "scientific_name": "Pectobacterium carotovorum",
                        "pathogen_type": "Bacterial",
                        "severity": "Critical",
                        "symptoms": "Water-soaked lesions on petioles advancing to slimy liquefaction."
                    },
                    bounding_boxes=[
                        {"x_min": 0.20, "y_min": 0.35, "x_max": 0.55, "y_max": 0.70, "label": "Pest: Cabbage Looper", "type": "pest", "confidence": 0.89},
                        {"x_min": 0.58, "y_min": 0.25, "x_max": 0.90, "y_max": 0.82, "label": "Disease: Bacterial Soft Rot", "type": "disease", "confidence": 0.95}
                    ],
                    status="completed"
                ))

            # Check if detection records for Bok Choy already exist
            bokchoy_count = db.query(Detection).filter(Detection.crop_id == bokchoy_crop.id).count() if bokchoy_crop else 0
            if bokchoy_crop and bokchoy_count == 0:
                flea_pest = db.query(Pest).filter(Pest.name == "Striped Flea Beetle").first()
                black_rot = db.query(Disease).filter(Disease.name.like("%Black Rot%")).first()
                d_moth = db.query(Pest).filter(Pest.name == "Diamondback Moth").first()
                alt_leaf = db.query(Disease).filter(Disease.name.like("%Alternaria%")).first()

                db.add(Detection(
                    user_id=farmer.id,
                    crop_id=bokchoy_crop.id,
                    pest_id=flea_pest.id if flea_pest else None,
                    disease_id=black_rot.id if black_rot else None,
                    detection_type="pest_and_disease",
                    image_path="/static/uploads/detections/488a6939037749fa9b64c670693c677c.jpg",
                    confidence_score=0.96,
                    severity="High",
                    detected_pest_name="Striped Flea Beetle",
                    recommended_action="Install 32-mesh insect netting over nursery rows and dust food-grade diatomaceous earth around stems.",
                    detected_disease_name="Black Rot of Brassicas",
                    disease_confidence_score=0.88,
                    disease_severity="Moderate",
                    disease_recommended_action="Practice 3-year rotation with non-brassicas. Spray preventative copper hydroxide during rain.",
                    weather_condition="Warm / Overcast / 28°C",
                    field_location="Zone 2: Pechay Bio-Dynamic Plot, Mt. Banahaw Slope",
                    disease_details={
                        "name": "Black Rot of Brassicas",
                        "scientific_name": "Xanthomonas campestris pv. campestris",
                        "pathogen_type": "Bacterial",
                        "severity": "Moderate",
                        "symptoms": "Yellow V-shaped marginal chlorosis with blackened veins."
                    },
                    bounding_boxes=[
                        {"x_min": 0.12, "y_min": 0.20, "x_max": 0.45, "y_max": 0.58, "label": "Pest: Striped Flea Beetle", "type": "pest", "confidence": 0.96},
                        {"x_min": 0.50, "y_min": 0.35, "x_max": 0.88, "y_max": 0.72, "label": "Disease: Black Rot", "type": "disease", "confidence": 0.88}
                    ],
                    status="completed"
                ))

                db.add(Detection(
                    user_id=farmer.id,
                    crop_id=bokchoy_crop.id,
                    pest_id=d_moth.id if d_moth else None,
                    disease_id=alt_leaf.id if alt_leaf else None,
                    detection_type="pest_and_disease",
                    image_path="/static/uploads/detections/5a1923b0779f47f5b64ba1e33d03f206.jpg",
                    confidence_score=0.92,
                    severity="Moderate",
                    detected_pest_name="Diamondback Moth",
                    recommended_action="Deploy pheromone delta traps to disrupt mating and apply selective Bt spray.",
                    detected_disease_name="Alternaria Leaf Spot of Brassicas",
                    disease_confidence_score=0.90,
                    disease_severity="Moderate",
                    disease_recommended_action="Remove infected outer leaves. Spray contact protectant Mancozeb 80% WP.",
                    weather_condition="Sunny / Humid / 29°C",
                    field_location="Zone 2: Pechay Sector 1, Brgy. Gagalot",
                    disease_details={
                        "name": "Alternaria Leaf Spot of Brassicas",
                        "scientific_name": "Alternaria brassicae",
                        "pathogen_type": "Fungal",
                        "severity": "Moderate",
                        "symptoms": "Concentric target-like circular necrotic lesions with yellow halos."
                    },
                    bounding_boxes=[
                        {"x_min": 0.18, "y_min": 0.28, "x_max": 0.52, "y_max": 0.65, "label": "Pest: Diamondback Moth", "type": "pest", "confidence": 0.92},
                        {"x_min": 0.55, "y_min": 0.32, "x_max": 0.88, "y_max": 0.75, "label": "Disease: Alternaria Leaf Spot", "type": "disease", "confidence": 0.90}
                    ],
                    status="completed"
                ))

            # Check if detection records for Mustard Greens already exist
            mustard_count = db.query(Detection).filter(Detection.crop_id == mustard_crop.id).count() if mustard_crop else 0
            if mustard_crop and mustard_count == 0:
                cutworm = db.query(Pest).filter(Pest.name == "Common Cutworm").first()
                white_rust = db.query(Disease).filter(Disease.name == "White Rust of Crucifers").first()

                db.add(Detection(
                    user_id=farmer.id,
                    crop_id=mustard_crop.id,
                    pest_id=cutworm.id if cutworm else None,
                    disease_id=white_rust.id if white_rust else None,
                    detection_type="pest_and_disease",
                    image_path="/static/uploads/detections/855121b6721b4514aba07a1ca5890977.jpg",
                    confidence_score=0.94,
                    severity="High",
                    detected_pest_name="Common Cutworm",
                    recommended_action="Apply rice bran bait mixed with Bacillus thuringiensis or apply wood ash collars around seedlings.",
                    detected_disease_name="White Rust of Crucifers",
                    disease_confidence_score=0.92,
                    disease_severity="Moderate",
                    disease_recommended_action="Eradicate wild crucifer weed hosts nearby and apply systemic Metalaxyl-M + Mancozeb.",
                    weather_condition="Morning Dew / 25°C",
                    field_location="Zone 2: Mustasa Bed #3, Brgy. Gagalot",
                    disease_details={
                        "name": "White Rust of Crucifers",
                        "scientific_name": "Albugo candida",
                        "pathogen_type": "Fungal",
                        "severity": "Moderate",
                        "symptoms": "Raised chalky-white blisters on leaf undersides with yellow spots above."
                    },
                    bounding_boxes=[
                        {"x_min": 0.14, "y_min": 0.25, "x_max": 0.46, "y_max": 0.60, "label": "Pest: Common Cutworm", "type": "pest", "confidence": 0.94},
                        {"x_min": 0.52, "y_min": 0.30, "x_max": 0.85, "y_max": 0.70, "label": "Disease: White Rust", "type": "disease", "confidence": 0.92}
                    ],
                    status="completed"
                ))

            db.commit()

        print("[SUCCESS] Database seeding completed successfully!")
        print("   Added / Linked Crops: Lettuce, Bok Choy (Petsay), Mustard Greens (Mustasa)")
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
