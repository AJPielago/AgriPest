# Agent Guidelines & Developer Instructions

This document specifies operational standards for AI coding agents and developers working on the **AI-Based Crop Pest Detection System Capstone**.

---

## 1. Core Operating Principles

1. **Grounded Agricultural Design (NO "AI HYPE" UI):**
   - Build interfaces that look like real-world, professional agricultural software (e.g., John Deere, Climate FieldView, FarmLogs, Plantix).
   - **DO NOT** use generic AI SaaS aesthetics (neon glows, purple/cyan gradients, "SMART AI BOT" badges, artificial robot icons, or glowing glassmorphism).
   - Use clean, high-contrast, functional UI components with clear typography, solid white/slate card backgrounds, and forest green accents.

2. **Crop-Agnostic Integrity:**
   - Never hardcode crop species or pest names directly into business logic.
   - Always query the database (`crops`, `pests`, `crop_pests` tables) or retrieve config mappings via backend endpoints.

3. **Pluggable Detection Architecture:**
   - Keep `MockDetectionService` and `AIDetectionService` behind the `get_detection_service()` factory pattern in `backend/app/services/detection/factory.py`.
   - Ensure switching `DETECTION_MODE=mock` to `DETECTION_MODE=ai` in `.env` requires zero changes to API routes or frontend code.

4. **Security & Input Validation:**
   - Validate image uploads by checking both file extensions and MIME types (`image/jpeg`, `image/png`, `image/webp`).
   - Restrict administrative routes to users with `admin` role (`RequireAdmin` guard in React, `get_current_admin_user` in FastAPI).
   - Never expose raw passwords or secrets in codebase or API responses.

---

## 2. Coding Standards & File Organization

### 2.1 Backend (Python / FastAPI)
- Use Pydantic v2 schemas (`model_validate`, `BaseModel`) for request/response serialization.
- Structure endpoints in `backend/app/api/v1/endpoints/`.
- Handle DB sessions cleanly using FastAPI dependency injection (`db: Session = Depends(get_db)`).

### 2.2 Frontend (React / Tailwind CSS)
- Write modular, readable components inside `frontend/src/components/`.
- Use Tailwind CSS with clean utility classes. Keep colors focused on `emerald-800`/`emerald-700` accents, `slate-50` backgrounds, and `slate-900` text.
- Maintain multi-language capability by adding Tagalog (`tl`) and English (`en`) keys in `LanguageContext.jsx`.

---

## 3. Quality Assurance & Commit Checklist
Before completing any task:
1. Verify `npm run build` passes cleanly in `frontend/`.
2. Ensure FastAPI backend initializes without schema or model errors.
3. Check that both light mode and dark mode maintain strong contrast and readability under daylight conditions.
