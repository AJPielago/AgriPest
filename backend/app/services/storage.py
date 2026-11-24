import os
import uuid
from io import BytesIO
from typing import Tuple
from PIL import Image, ImageOps
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

READ_CHUNK_BYTES = 64 * 1024  # 64 KB bounded stream chunks


def _read_and_validate_upload(file: UploadFile) -> Tuple[Image.Image, str]:
    """
    Validates extension, MIME type, bounded file size (streaming to avoid memory DoS),
    and image integrity via Pillow. Returns normalized (orientation-fixed, EXIF-stripped)
    PIL Image and normalized extension.
    """
    raw_name = file.filename or "upload.jpg"
    ext = os.path.splitext(raw_name)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

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

    # Bounded chunked read to prevent memory exhaustion on oversized uploads
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    chunks = bytearray()
    while True:
        chunk = file.file.read(READ_CHUNK_BYTES)
        if not chunk:
            break
        chunks.extend(chunk)
        if len(chunks) > max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

    contents = bytes(chunks)
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty."
        )

    # Verify image integrity
    try:
        with Image.open(BytesIO(contents)) as probe:
            probe.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupt image file."
        )

    # Re-open, normalize phone EXIF orientation, and copy pixel buffer (strips EXIF metadata)
    with Image.open(BytesIO(contents)) as img:
        transposed = ImageOps.exif_transpose(img)
        if ext in (".jpg", ".jpeg") and transposed.mode not in ("RGB", "L"):
            clean_image = transposed.convert("RGB")
        else:
            clean_image = transposed.copy()

    return clean_image, ext


def validate_upload_in_memory(file: UploadFile) -> Image.Image:
    """Validates an uploaded frame and returns a clean RGB PIL Image without touching disk."""
    image, _ = _read_and_validate_upload(file)
    return image.convert("RGB") if image.mode != "RGB" else image


def validate_and_save_upload(file: UploadFile) -> str:
    """
    Validates uploaded image file (MIME type, bounded size, extension, corruption),
    normalizes orientation, strips EXIF metadata, and saves securely to UPLOAD_DIR/detections/.
    Returns relative public web path to the file.
    """
    image, ext = _read_and_validate_upload(file)

    filename = f"{uuid.uuid4().hex}{ext}"
    target_dir = os.path.join(settings.UPLOAD_DIR, "detections")
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, filename)

    save_kwargs = {"quality": 90, "optimize": True} if ext in (".jpg", ".jpeg", ".webp") else {}
    image.save(file_path, **save_kwargs)

    return f"/static/uploads/detections/{filename}"
