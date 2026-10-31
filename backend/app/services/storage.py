import os
import uuid
from PIL import Image
from io import BytesIO
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

def validate_and_save_upload(file: UploadFile) -> str:
    """
    Validates uploaded image file (MIME type, size, extension, image corruption)
    and saves it securely to UPLOAD_DIR/detections/.
    Returns relative public web path to the file.
    """
    # 1. Extension check
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # 2. Content Type check
    is_image = (
        file.content_type in settings.ALLOWED_IMAGE_TYPES
        or (file.content_type and file.content_type.startswith("image/"))
        or file.content_type == "application/octet-stream"
    )
    if not is_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported MIME type '{file.content_type}'."
        )

    # 3. Read file contents & check size
    contents = file.file.read()
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )
    
    # 4. Image integrity check using Pillow
    try:
        image = Image.open(BytesIO(contents))
        image.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupt image file."
        )

    # Re-open image stream for saving (verify() renders stream unusable)
    image = Image.open(BytesIO(contents))

    # 5. Create secure unique filename
    filename = f"{uuid.uuid4().hex}{ext}"
    target_dir = os.path.join(settings.UPLOAD_DIR, "detections")
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, filename)

    # 6. Save image to disk
    image.save(file_path)

    # Return web accessible path
    return f"/static/uploads/detections/{filename}"
