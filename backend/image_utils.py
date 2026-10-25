import os
import time
import uuid
import shutil
from io import BytesIO
from PIL import Image
from typing import Tuple, List

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VALID_CATEGORIES = {"upper_body", "lower_body", "dresses"}

def validate_image_file(file_bytes: bytes, filename: str, max_mb: int = 10) -> Tuple[bool, str]:
    """Validates file size, extension, and verifies true PIL image structure."""
    if not file_bytes or len(file_bytes) == 0:
        return False, "Uploaded image file is empty."
        
    if len(file_bytes) > max_mb * 1024 * 1024:
        size_mb = len(file_bytes) / (1024 * 1024)
        return False, f"File size ({size_mb:.1f} MB) exceeds maximum limit of {max_mb} MB."
    
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file extension '{ext}'. Allowed extensions: JPG, PNG, WEBP."
    
    try:
        img = Image.open(BytesIO(file_bytes))
        img.verify() # Verify image integrity
        
        # Re-open after verify() to inspect metadata/dimensions
        img = Image.open(BytesIO(file_bytes))
        if img.width < 64 or img.height < 64:
            return False, f"Image dimensions ({img.width}x{img.height}) are too small. Minimum size is 64x64."
    except Exception as e:
        return False, f"Invalid or corrupted image format: {str(e)}"
        
    return True, "Valid"

def sanitize_filename(filename: str) -> str:
    """Strips path characters to prevent path traversal attacks."""
    basename = os.path.basename(filename)
    clean_name = "".join(c for c in basename if c.isalnum() or c in "._-")
    return clean_name if clean_name else "image.png"

def save_upload_bytes(file_bytes: bytes, original_filename: str, target_dir: str, prefix: str = "img") -> Tuple[str, str]:
    """Saves bytes safely in target_dir with unique filename."""
    os.makedirs(target_dir, exist_ok=True)
    clean_name = sanitize_filename(original_filename)
    ext = os.path.splitext(clean_name)[1].lower()
    if not ext:
        ext = ".png"
    unique_name = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(target_dir, unique_name)
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return filepath, unique_name

def cleanup_old_files(directory: str, max_age_hours: int = 1, protected_filenames: set = None):
    """Safely cleans up files older than max_age_hours, leaving .gitkeep and protected files intact."""
    if not os.path.exists(directory):
        return
    now = time.time()
    cutoff = now - (max_age_hours * 3600)
    protected = protected_filenames or set()
    
    for filename in os.listdir(directory):
        if filename == ".gitkeep" or filename in protected:
            continue
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            try:
                if os.path.getmtime(filepath) < cutoff:
                    os.remove(filepath)
            except Exception:
                pass
