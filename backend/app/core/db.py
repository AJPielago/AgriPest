from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# SQLite compatibility settings
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_compatibility():
    """Ensure newly introduced columns are present in existing database tables."""
    try:
        with engine.begin() as conn:
            from sqlalchemy import text
            if settings.DATABASE_URL.startswith("sqlite"):
                result = conn.execute(text("PRAGMA table_info(detections)"))
                cols = [row[1] for row in result.fetchall()]
                new_cols = [
                    ("disease_id", "INTEGER"),
                    ("detection_type", "VARCHAR(50) DEFAULT 'pest_and_disease'"),
                    ("detected_disease_name", "VARCHAR(150)"),
                    ("disease_confidence_score", "FLOAT"),
                    ("disease_severity", "VARCHAR(50)"),
                    ("disease_recommended_action", "TEXT"),
                    ("disease_details", "JSON")
                ]
                for col_name, col_type in new_cols:
                    if cols and col_name not in cols:
                        conn.execute(text(f"ALTER TABLE detections ADD COLUMN {col_name} {col_type}"))
    except Exception as e:
        print(f"[Schema Migration Compatibility] {e}")
