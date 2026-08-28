# Project Specification: AI-Based Crop Pest Detection System

**Version:** 1.0.0  
**Target Audience:** Farmers, Agricultural Managers, Field Extension Officers, Capstone Review Committee  
**Primary Stack:** Python 3.11+ (FastAPI, SQLAlchemy, Pydantic), React 18 (Vite, Tailwind CSS), Native Java Android Application (Android Studio, Retrofit 2, Material Components)

---

## 1. System Vision & Core Objective

The **AI-Based Crop Pest Detection System** is a crop-agnostic agricultural diagnostic platform designed to help farmers identify crop pests from leaf and field photos, evaluate infestation severity, and receive practical management recommendations.

### Key Architectural Pillars
1. **Target-Crop Agnostic Design:** Dynamic database schema (`crops`, `pests`, `crop_pests`) allowing administrators to add or adjust target crops (e.g., Rice, Corn, Cabbage, Onion) without modifying code.
2. **Pluggable Inference Engine:** Seamless toggle between `mock` mode (for pre-ML development and testing) and `ai` mode (for YOLOv8 / PyTorch inference).
3. **Grounded, Human-Centric UI/UX:** A clean, functional, high-contrast UI tailored for real-world field use—avoiding generic, neon, or overly futuristic "AI wrapper" gimmicks.

---

## 2. User Roles & Capabilities

### 2.1 Farmer / Field User
- **Account Management:** Register and log in securely.
- **Diagnostic Upload & Capture:** Upload specimen photos or capture direct field images via device camera.
- **Context Tagging:** Attach host crop type, weather condition (Sunny, Rainy, Humid, Overcast), and field location tags.
- **Report View:** Review identified pest species, confidence score, bounding box visualization, threat severity rating, and recommended treatment steps.
- **Audio Narration:** Listen to diagnostic recommendations via voice narration.
- **Feedback Loop:** Confirm diagnostic accuracy (`Accurate` / `Inaccurate`) with optional field notes to support future dataset retraining.
- **Inspection History:** Filter and view past diagnostic records.

### 2.2 Agricultural Extension Officer / Administrator
- **Dashboard Analytics:** Monitor system-wide scan volume, pest species frequency, and geographic outbreak heatmaps.
- **Crop Catalog Management:** Add, edit, or disable target host crops and local translations.
- **Pest & Rule Management:** Manage pest species entries, scientific names, descriptions, and recommended biological/chemical treatments.
- **User Directory:** Oversee user accounts and assign roles.
- **Audit Logging:** Audit system actions (scans, feedback submissions, administrative updates) for governance.

---

## 3. UI/UX Design System Specification ("De-AI-ified")

### 3.1 Aesthetic Guidelines
- **Grounded & Trustworthy:** Look like professional agricultural enterprise software (e.g., Climate FieldView, FarmLogs, Plantix) rather than a futuristic "AI hype" tool.
- **No Neon Hype:** Avoid cyan/purple glowing neon effects, artificial "AI bot" icons, or overly dark sci-fi themes.
- **High Outdoor Legibility:** Clean high-contrast slate typography (`slate-900` text on `slate-50` / `white` background) readable under direct sunlight on smartphone screens.
- **Color Palette:**
  - **Primary Base:** Slate (`slate-50`, `slate-100`, `slate-900`, `slate-950`).
  - **Agricultural Accent:** Forest Emerald (`emerald-700` / `emerald-800`), Muted Teal (`teal-700`).
  - **Severity Badges:** High Contrast Muted Badges (Low = Green, Moderate = Amber, High = Orange, Critical = Red).
- **Cards & Borders:** Clean 1px subtle borders (`border-slate-200` / `border-slate-800`), standard rounded corners (`rounded-xl` / `rounded-lg`), clean white/slate card backgrounds without heavy glassmorphism blurs.

---

## 4. Technical Architecture & Endpoints

### 4.1 Backend API Structure (FastAPI)
- `POST /api/v1/auth/register` — Farmer registration.
- `POST /api/v1/auth/login` — Authentication & JWT token generation.
- `GET /api/v1/crops` — Retrieve active host crop catalog.
- `POST /api/v1/detections/detect` — Upload specimen photo & run detection engine.
- `GET /api/v1/detections` — List detection history with pagination and crop filtering.
- `GET /api/v1/detections/{id}` — Get single detailed detection record.
- `POST /api/v1/detections/{id}/feedback` — Submit farmer ground-truth rating.
- `GET /api/v1/dashboard/stats` — Retrieve dashboard analytics and infestation frequency metrics.
- `GET /api/v1/admin/*` — Administrative crop, pest, user, and audit log endpoints.

### 4.2 Database Schema (SQLAlchemy + SQLite/PostgreSQL)
- **Users:** `id`, `email`, `hashed_password`, `full_name`, `role_id`, `created_at`.
- **Roles:** `id`, `name` (`farmer`, `admin`).
- **Crops:** `id`, `name`, `name_tl`, `description`, `is_active`.
- **Pests:** `id`, `name`, `name_tl`, `scientific_name`, `description`, `severity`, `recommended_action`.
- **CropPests:** Relational host mapping between `crop_id` and `pest_id`.
- **Detections:** `id`, `user_id`, `crop_id`, `pest_id`, `image_path`, `confidence_score`, `severity`, `detected_pest_name`, `recommended_action`, `bounding_boxes`, `weather_condition`, `field_location`, `feedback_accurate`, `feedback_notes`, `created_at`.
- **AuditLogs:** `id`, `user_id`, `action`, `details`, `created_at`.

---

## 5. Quality Standards & Verification
- **Frontend Build:** Clean compilation with Vite (`npm run build`).
- **Backend Tests:** Automated API tests in `backend/tests/` using Pytest.
- **Mobile Compatibility:** Native WebView wrapper compatibility in Android Studio (`android/`).
