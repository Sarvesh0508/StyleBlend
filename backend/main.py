import os
import uuid
import base64
import shutil
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from backend.config import get_settings
from backend.image_utils import (
    validate_image_file,
    save_upload_bytes,
    cleanup_old_files,
    VALID_CATEGORIES,
    sanitize_filename
)
from backend.inference_client import IDMInferenceClient
from backend.database import (
    init_db,
    insert_saved_look,
    get_all_saved_looks,
    get_saved_look_by_id,
    delete_saved_look,
    insert_wardrobe_item,
    get_all_wardrobe_items,
    get_wardrobe_item_by_id,
    update_wardrobe_item,
    delete_wardrobe_item,
    is_image_referenced_elsewhere,
    get_all_protected_filenames
)
from backend.size_comparison import compare_measurements
from backend.customizer import (
    JOB_ID_RE,
    customization_digest,
    derive_garment_mask,
    render_customization,
    resolve_params,
)
import json
import numpy as np
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

settings = get_settings()

app = FastAPI(
    title="StyleBlend AI Virtual Try-On & Fashion Intelligence Service",
    description="FastAPI Backend for IDM-VTON Virtual Try-On, Persistent Wardrobe, and Size Comparison",
    version="2.1.0"
)

# Enable CORS for React development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure persistent directories exist and initialize database
os.makedirs(settings.INPUT_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
os.makedirs(settings.SAVED_DIR, exist_ok=True)
os.makedirs(settings.WARDROBE_DIR, exist_ok=True)
init_db(settings.DB_PATH)


def _save_data_url_as_file(data_url: str, target_dir: str, prefix: str) -> Optional[str]:
    """Saves a base64 data URL to an image file, returning its saved filename."""
    if not data_url or not data_url.startswith("data:image/"):
        return None
    try:
        header, encoded = data_url.split(",", 1)
        ext = ".png"
        if "jpeg" in header or "jpg" in header:
            ext = ".jpg"
        elif "webp" in header:
            ext = ".webp"
        data_bytes = base64.b64decode(encoded)
        filename = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(target_dir, filename)
        with open(filepath, "wb") as f:
            f.write(data_bytes)
        return filename
    except Exception as e:
        logger.warning("Failed to decode data URL for %s: %s", prefix, e)
        return None


# ---------------------------------------------------------------------------
# Core Try-On & Health Endpoints (Preserved Contracts)
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    """Health check endpoint — reports Replicate configuration & DB status."""
    current_settings = get_settings()
    client = IDMInferenceClient(api_token=current_settings.REPLICATE_API_TOKEN)

    return {
        "status": "online",
        "inference_provider": "replicate",
        "model": "cuuupid/idm-vton",
        "replicate_configured": client.is_configured(),
        "max_upload_size_mb": current_settings.MAX_UPLOAD_SIZE_MB,
        "allowed_categories": sorted(list(VALID_CATEGORIES)),
        "database": "sqlite_connected"
    }


@app.post("/api/tryon")
async def process_tryon(
    person_image:        UploadFile = File(..., description="Photograph of the person"),
    garment_image:       UploadFile = File(..., description="Photograph of the garment"),
    category:            str  = Form("upper_body", description="Clothing category"),
    garment_description: str  = Form("Short Sleeve Round Neck T-shirt", description="Text description of the garment"),
    auto_crop:           bool = Form(False, description="Auto-crop framing toggle"),
    denoise_steps:       int  = Form(30,  description="Denoising steps (20-40)"),
    seed:                int  = Form(42,  description="Random seed"),
    customization:       str  = Form("", description="JSON customization (colour, fit, size, length, profile, finishing)"),
):
    """
    Validates uploaded images and runs IDM-VTON inference via Replicate.
    Returns the result image URL on success, or an HTTP error on failure.
    Never returns the input image as a fake result.
    """
    current_settings = get_settings()

    # 1. Clean up old temporary files, protecting files currently referenced in DB
    protected = get_all_protected_filenames(current_settings.DB_PATH)
    cleanup_old_files(current_settings.INPUT_DIR, current_settings.FILE_CLEANUP_AGE_HOURS, protected)
    cleanup_old_files(current_settings.OUTPUT_DIR, current_settings.FILE_CLEANUP_AGE_HOURS, protected)

    # 2. Validate Category
    clean_category = category.strip().lower()
    if clean_category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Allowed: {', '.join(sorted(list(VALID_CATEGORIES)))}."
        )

    # 3. Validate Denoise Steps
    if not (20 <= denoise_steps <= 40):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid denoise_steps '{denoise_steps}'. Must be between 20 and 40."
        )

    # 3b. Parse customization up-front so bad input fails before GPU time is spent
    try:
        custom_raw = json.loads(customization) if customization.strip() else {}
        resolved = resolve_params(custom_raw, clean_category)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Customization Error: {e}")

    # 4. Read & Validate Person Image
    person_bytes = await person_image.read()
    is_valid, err_msg = validate_image_file(person_bytes, person_image.filename, current_settings.MAX_UPLOAD_SIZE_MB)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Person Image Error: {err_msg}"
        )

    # 5. Read & Validate Garment Image
    garment_bytes = await garment_image.read()
    is_valid, err_msg = validate_image_file(garment_bytes, garment_image.filename, current_settings.MAX_UPLOAD_SIZE_MB)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Garment Image Error: {err_msg}"
        )

    # 6. Generate Job ID & Save Input Files
    job_id = f"req_{uuid.uuid4().hex[:8]}"
    person_path, _ = save_upload_bytes(
        person_bytes, person_image.filename, current_settings.INPUT_DIR, prefix=f"{job_id}_person"
    )
    garment_path, _ = save_upload_bytes(
        garment_bytes, garment_image.filename, current_settings.INPUT_DIR, prefix=f"{job_id}_garment"
    )

    # 7. Require Replicate token — fail fast with a clear error instead of a silent mock
    inference_client = IDMInferenceClient(api_token=current_settings.REPLICATE_API_TOKEN)
    if not inference_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Replicate is not configured: REPLICATE_API_TOKEN is missing from backend/.env. "
                "Set a valid token and restart the server."
            )
        )

    # 8. Execute Real AI Inference via Replicate IDM-VTON
    try:
        res_path, mask_path, exec_time = inference_client.predict_tryon(
            person_file_path=person_path,
            garment_file_path=garment_path,
            garment_description=garment_description,
            category=clean_category,
            auto_mask=True,
            auto_crop=auto_crop,
            denoise_steps=denoise_steps,
            seed=seed,
            output_dir=current_settings.OUTPUT_DIR,
            job_id=job_id
        )

        res_filename  = os.path.basename(res_path)
        mask_filename = os.path.basename(mask_path)

        # Derive the garment mask once; every later customization reuses it.
        mask_available = False
        mask_failure_reason = None
        try:
            garment_mask, mask_failure_reason = derive_garment_mask(
                person_path,
                res_path,
                mask_path,
                cropped=auto_crop,
                category=clean_category,
                return_reason=True,
                job_id=job_id,
                output_dir=current_settings.OUTPUT_DIR,
                debug=current_settings.DEBUG,
            )
            if garment_mask is not None:
                Image.fromarray((garment_mask * 255).astype(np.uint8), "L").save(
                    os.path.join(current_settings.OUTPUT_DIR, f"{job_id}_garmask.png")
                )
                mask_available = True
            else:
                logger.info("Garment mask derivation failed (job=%s): %s", job_id, mask_failure_reason)
                reason_path = os.path.join(current_settings.OUTPUT_DIR, f"{job_id}_mask_reason.txt")
                with open(reason_path, "w", encoding="utf-8") as f:
                    f.write(mask_failure_reason)
        except Exception as e:  # mask is an enhancement; never fail the try-on over it
            mask_failure_reason = str(e)
            logger.warning("Garment mask derivation failed (job=%s): %s", job_id, e)

        custom = _render_custom(job_id, resolved, clean_category, current_settings.OUTPUT_DIR)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "mode": "replicate",
                "message": "Virtual try-on image generated successfully via Replicate IDM-VTON.",
                "job_id": job_id,
                "result_url": custom["result_url"],
                "base_url": f"/api/results/{res_filename}",
                "masked_url": f"/api/results/{mask_filename}",
                "mask_available": mask_available,
                "mask_failure_reason": mask_failure_reason,
                "applied": custom["applied"],
                "warnings": custom["warnings"],
                "execution_time_seconds": exec_time
            }
        )

    except (ValueError, FileNotFoundError, RuntimeError) as e:
        logger.error("Inference error (job=%s): %s", job_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Replicate Inference Error: {str(e)}"
        )
    except Exception as e:
        logger.exception("Unexpected error during try-on (job=%s)", job_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during try-on processing: {str(e)}"
        )


def _render_custom(job_id: str, resolved: Dict[str, Any], category: str, output_dir: str) -> Dict[str, Any]:
    """
    Applies a resolved customization to a job's base result and caches the output file.
    With no customization the base result is returned untouched.
    """
    base_name = f"{job_id}_result.png"
    base_path = os.path.join(output_dir, base_name)
    if not os.path.isfile(base_path):
        raise FileNotFoundError(base_name)

    mask_reason = None
    reason_path = os.path.join(output_dir, f"{job_id}_mask_reason.txt")
    if os.path.isfile(reason_path):
        try:
            with open(reason_path, "r", encoding="utf-8") as rf:
                mask_reason = rf.read().strip()
        except Exception:
            pass

    if resolved["is_noop"]:
        return {"result_url": f"/api/results/{base_name}", "applied": [], "warnings": [], "mask_failure_reason": mask_reason}

    mask = None
    mask_path = os.path.join(output_dir, f"{job_id}_garmask.png")
    if os.path.isfile(mask_path):
        mask = np.array(Image.open(mask_path).convert("L")).astype(np.float32) / 255.0

    out_name = f"{job_id}_custom_{customization_digest(resolved)}.png"
    out_path = os.path.join(output_dir, out_name)

    image, applied, warnings = render_customization(base_path, mask, resolved, mask_failure_reason=mask_reason)
    image.save(out_path)
    return {"result_url": f"/api/results/{out_name}", "applied": applied, "warnings": warnings, "mask_failure_reason": mask_reason}


class CustomizeRequest(BaseModel):
    job_id: str
    category: Optional[str] = "upper_body"
    customization: Dict[str, Any] = {}


@app.post("/api/customize")
def customize_result(req: CustomizeRequest):
    """
    Re-applies customization (colour, size/fit, length, profile, finishing) to an
    existing try-on result WITHOUT re-running the GPU model. Instant live preview.
    """
    current_settings = get_settings()
    if not JOB_ID_RE.match(req.job_id or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job_id.")

    category = (req.category or "upper_body").strip().lower()
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid category '{req.category}'.")

    try:
        resolved = resolve_params(req.customization, category)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Customization Error: {e}")

    try:
        out = _render_custom(req.job_id, resolved, category, current_settings.OUTPUT_DIR)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The base try-on image has expired. Please generate the try-on again.",
        )

    has_mask = os.path.isfile(os.path.join(current_settings.OUTPUT_DIR, f"{req.job_id}_garmask.png"))
    return {
        "status": "success",
        "job_id": req.job_id,
        "result_url": out["result_url"],
        "mask_available": has_mask,
        "mask_failure_reason": out.get("mask_failure_reason"),
        "applied": out["applied"],
        "warnings": out["warnings"],
        "summary": resolved["summary"],
        "effective": {"width_scale": resolved["sx"], "length_scale": resolved["sy"], "body_size": resolved["body_size"]},
    }


@app.get("/api/results/{filename}")
def get_result_file(filename: str):
    """
    Safely serves generated output files, preventing path traversal attacks.
    Checks OUTPUT_DIR first, and falls back to SAVED_DIR if saved.
    """
    current_settings = get_settings()
    clean_name = sanitize_filename(filename)
    
    filepath = os.path.join(current_settings.OUTPUT_DIR, clean_name)
    if not os.path.isfile(filepath):
        # Check if preserved in SAVED_DIR
        saved_filepath = os.path.join(current_settings.SAVED_DIR, clean_name)
        if os.path.isfile(saved_filepath):
            filepath = saved_filepath
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Result image file not found or has expired."
            )

    return FileResponse(filepath, media_type="image/png")


# ---------------------------------------------------------------------------
# PHASE A: Persistent Saved Looks & Images
# ---------------------------------------------------------------------------

class SaveLookRequest(BaseModel):
    result_url: str
    original_person: Optional[str] = None
    garment_person: Optional[str] = None
    category: Optional[str] = "upper_body"
    description: Optional[str] = "Virtual Try-On Result"
    execution_time: Optional[float] = None
    mode: Optional[str] = "replicate"


@app.post("/api/saved-looks")
def create_saved_look(req: SaveLookRequest):
    """
    Persists a generated try-on look.
    Copies the result image from OUTPUT_DIR to SAVED_DIR to protect it from cleanup.
    Saves metadata in SQLite and returns the permanent record.
    """
    current_settings = get_settings()
    raw_name = req.result_url.split("/")[-1].split("?")[0]
    clean_res_name = sanitize_filename(raw_name)

    # Source filepath in OUTPUT_DIR or already in SAVED_DIR
    src_path = os.path.join(current_settings.OUTPUT_DIR, clean_res_name)
    if not os.path.isfile(src_path):
        src_path = os.path.join(current_settings.SAVED_DIR, clean_res_name)

    if not os.path.isfile(src_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Result image '{clean_res_name}' does not exist on the server."
        )

    look_id = f"look_{uuid.uuid4().hex[:12]}"
    saved_filename = f"saved_{look_id}_{clean_res_name}"
    dest_path = os.path.join(current_settings.SAVED_DIR, saved_filename)
    
    # Copy file into permanent storage
    try:
        shutil.copyfile(src_path, dest_path)
    except Exception as e:
        logger.error("Failed to copy image to SAVED_DIR: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist saved image: {str(e)}"
        )

    # Store person and garment images: convert base64 to server file if present
    person_img_ref = req.original_person
    if req.original_person and req.original_person.startswith("data:image/"):
        saved_p = _save_data_url_as_file(req.original_person, current_settings.SAVED_DIR, f"{look_id}_person")
        if saved_p:
            person_img_ref = f"/api/saved-images/{saved_p}"

    garment_img_ref = req.garment_person
    if req.garment_person and req.garment_person.startswith("data:image/"):
        saved_g = _save_data_url_as_file(req.garment_person, current_settings.SAVED_DIR, f"{look_id}_garment")
        if saved_g:
            garment_img_ref = f"/api/saved-images/{saved_g}"

    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    look_data = {
        "id": look_id,
        "result_filename": saved_filename,
        "result_url": f"/api/saved-images/{saved_filename}",
        "original_person": person_img_ref,
        "garment_person": garment_img_ref,
        "category": req.category,
        "description": req.description,
        "execution_time": req.execution_time,
        "mode": req.mode,
        "created_at": now_iso
    }

    try:
        inserted = insert_saved_look(current_settings.DB_PATH, look_data)
        return JSONResponse(status_code=status.HTTP_201_CREATED, content=inserted)
    except Exception as e:
        logger.error("Failed to insert saved look: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error saving look: {str(e)}"
        )


@app.get("/api/saved-looks")
def list_saved_looks():
    """Returns all archived saved looks from the SQLite database."""
    current_settings = get_settings()
    try:
        looks = get_all_saved_looks(current_settings.DB_PATH)
        return {"saved_looks": looks, "count": len(looks)}
    except Exception as e:
        logger.error("Failed to retrieve saved looks: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error reading saved looks: {str(e)}"
        )


@app.get("/api/saved-looks/{look_id}")
def retrieve_saved_look(look_id: str):
    """Retrieves a single saved look by ID."""
    current_settings = get_settings()
    look = get_saved_look_by_id(current_settings.DB_PATH, look_id)
    if not look:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Look '{look_id}' not found.")
    return look


@app.delete("/api/saved-looks/{look_id}")
def remove_saved_look(look_id: str):
    """
    Deletes a saved look from the database.
    Deletes the underlying image file only if it is not referenced by any other item.
    """
    current_settings = get_settings()
    look = get_saved_look_by_id(current_settings.DB_PATH, look_id)
    if not look:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Look '{look_id}' not found.")

    res_filename = look.get("result_filename")
    delete_saved_look(current_settings.DB_PATH, look_id)

    # Check if the file is still referenced elsewhere before deleting
    if res_filename and not is_image_referenced_elsewhere(current_settings.DB_PATH, res_filename):
        filepath = os.path.join(current_settings.SAVED_DIR, res_filename)
        if os.path.isfile(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                logger.warning("Could not delete saved image file %s: %s", filepath, e)

    return {"status": "deleted", "id": look_id}


@app.get("/api/saved-images/{filename}")
def get_saved_image(filename: str):
    """Safely serves saved look images from permanent storage."""
    current_settings = get_settings()
    clean_name = sanitize_filename(filename)
    filepath = os.path.join(current_settings.SAVED_DIR, clean_name)

    if not os.path.isfile(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved image file not found."
        )

    ext = os.path.splitext(clean_name)[1].lower()
    media_type = "image/png"
    if ext in (".jpg", ".jpeg"):
        media_type = "image/jpeg"
    elif ext == ".webp":
        media_type = "image/webp"

    return FileResponse(filepath, media_type=media_type)


# ---------------------------------------------------------------------------
# PHASE B: Digital Wardrobe Storage Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/wardrobe")
async def create_wardrobe_item(
    image:       UploadFile = File(..., description="Garment image file"),
    name:        str = Form(..., description="Garment name"),
    category:    str = Form("upper_body", description="Clothing category"),
    color:       str = Form("", description="Color profile"),
    style:       str = Form("", description="Aesthetic style"),
    size:        str = Form("M", description="Garment size (XS, S, M, L, XL, XXL)"),
    brand:       str = Form("", description="Brand or manufacturer"),
    notes:       str = Form("", description="Description or notes"),
    price:       Optional[float] = Form(None, description="Retail or budget price"),
    meas_chest:  Optional[float] = Form(None, description="Garment chest measurement in cm"),
    meas_waist:  Optional[float] = Form(None, description="Garment waist measurement in cm"),
    meas_hip:    Optional[float] = Form(None, description="Garment hip measurement in cm"),
    meas_length: Optional[float] = Form(None, description="Garment length measurement in cm"),
    meas_unit:   str = Form("cm", description="Measurement unit (cm or in)"),
):
    """
    Uploads a garment image to persistent server storage and creates a wardrobe record.
    Prevents large base64 storage in the browser.
    """
    current_settings = get_settings()

    # 1. Validate Category
    clean_category = category.strip().lower()
    if clean_category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Allowed: {', '.join(sorted(list(VALID_CATEGORIES)))}."
        )

    # 2. Read & Validate Garment Image File
    img_bytes = await image.read()
    is_valid, err_msg = validate_image_file(img_bytes, image.filename, current_settings.MAX_UPLOAD_SIZE_MB)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Garment Image Validation Error: {err_msg}"
        )

    # 3. Save to WARDROBE_DIR
    item_id = f"garment_{uuid.uuid4().hex[:10]}"
    _, saved_filename = save_upload_bytes(
        img_bytes, image.filename, current_settings.WARDROBE_DIR, prefix=f"wardrobe_{item_id}"
    )

    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    item_data = {
        "id": item_id,
        "name": name.strip(),
        "category": clean_category,
        "color": color.strip(),
        "style": style.strip(),
        "size": size.strip().upper(),
        "brand": brand.strip(),
        "notes": notes.strip(),
        "image_filename": saved_filename,
        "image_url": f"/api/wardrobe-images/{saved_filename}",
        "price": price,
        "meas_chest": meas_chest,
        "meas_waist": meas_waist,
        "meas_hip": meas_hip,
        "meas_length": meas_length,
        "meas_unit": meas_unit.strip().lower() if meas_unit else "cm",
        "created_at": now_iso,
        "updated_at": now_iso,
        "times_used": 0
    }

    try:
        inserted = insert_wardrobe_item(current_settings.DB_PATH, item_data)
        return JSONResponse(status_code=status.HTTP_201_CREATED, content=inserted)
    except Exception as e:
        logger.error("Failed to insert wardrobe item: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error inserting wardrobe item: {str(e)}"
        )


@app.get("/api/wardrobe")
def list_wardrobe_items():
    """Returns all stored wardrobe garments from the database."""
    current_settings = get_settings()
    try:
        items = get_all_wardrobe_items(current_settings.DB_PATH)
        return {"items": items, "count": len(items)}
    except Exception as e:
        logger.error("Failed to retrieve wardrobe items: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error reading wardrobe items: {str(e)}"
        )


@app.get("/api/wardrobe/{item_id}")
def retrieve_wardrobe_item(item_id: str):
    """Retrieves a single wardrobe item by ID."""
    current_settings = get_settings()
    item = get_wardrobe_item_by_id(current_settings.DB_PATH, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Wardrobe item '{item_id}' not found.")
    return item


@app.put("/api/wardrobe/{item_id}")
async def modify_wardrobe_item(
    item_id:     str,
    name:        Optional[str] = Form(None),
    category:    Optional[str] = Form(None),
    color:       Optional[str] = Form(None),
    style:       Optional[str] = Form(None),
    size:        Optional[str] = Form(None),
    brand:       Optional[str] = Form(None),
    notes:       Optional[str] = Form(None),
    price:       Optional[float] = Form(None),
    meas_chest:  Optional[float] = Form(None),
    meas_waist:  Optional[float] = Form(None),
    meas_hip:    Optional[float] = Form(None),
    meas_length: Optional[float] = Form(None),
    meas_unit:   Optional[str] = Form(None),
    times_used:  Optional[int] = Form(None),
    image:       Optional[UploadFile] = File(None),
):
    """Updates metadata and optionally replaces the garment image."""
    current_settings = get_settings()
    existing = get_wardrobe_item_by_id(current_settings.DB_PATH, item_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Wardrobe item '{item_id}' not found.")

    updates: Dict[str, Any] = {}
    if name is not None:
        updates["name"] = name.strip()
    if category is not None:
        clean_cat = category.strip().lower()
        if clean_cat not in VALID_CATEGORIES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid category '{category}'.")
        updates["category"] = clean_cat
    if color is not None:
        updates["color"] = color.strip()
    if style is not None:
        updates["style"] = style.strip()
    if size is not None:
        updates["size"] = size.strip().upper()
    if brand is not None:
        updates["brand"] = brand.strip()
    if notes is not None:
        updates["notes"] = notes.strip()
    if price is not None:
        updates["price"] = price
    if meas_chest is not None:
        updates["meas_chest"] = meas_chest
    if meas_waist is not None:
        updates["meas_waist"] = meas_waist
    if meas_hip is not None:
        updates["meas_hip"] = meas_hip
    if meas_length is not None:
        updates["meas_length"] = meas_length
    if meas_unit is not None:
        updates["meas_unit"] = meas_unit.strip().lower()
    if times_used is not None:
        updates["times_used"] = times_used

    # If new image provided, validate and save
    if image is not None and image.filename:
        img_bytes = await image.read()
        is_valid, err_msg = validate_image_file(img_bytes, image.filename, current_settings.MAX_UPLOAD_SIZE_MB)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image error: {err_msg}")
        _, saved_filename = save_upload_bytes(
            img_bytes, image.filename, current_settings.WARDROBE_DIR, prefix=f"wardrobe_{item_id}"
        )
        updates["image_filename"] = saved_filename
        updates["image_url"] = f"/api/wardrobe-images/{saved_filename}"

    import datetime
    updates["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        updated = update_wardrobe_item(current_settings.DB_PATH, item_id, updates)
        return updated
    except Exception as e:
        logger.error("Failed to update wardrobe item: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Update failed: {str(e)}")


@app.delete("/api/wardrobe/{item_id}")
def remove_wardrobe_item(item_id: str):
    """
    Deletes a wardrobe item.
    Deletes image file only if it is not referenced by any other item or saved look.
    """
    current_settings = get_settings()
    existing = get_wardrobe_item_by_id(current_settings.DB_PATH, item_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Wardrobe item '{item_id}' not found.")

    image_filename = existing.get("image_filename")
    delete_wardrobe_item(current_settings.DB_PATH, item_id)

    # Check cross-reference safety before file removal
    if image_filename and not is_image_referenced_elsewhere(current_settings.DB_PATH, image_filename):
        filepath = os.path.join(current_settings.WARDROBE_DIR, image_filename)
        if os.path.isfile(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                logger.warning("Could not delete wardrobe image file %s: %s", filepath, e)

    return {"status": "deleted", "id": item_id}


@app.get("/api/wardrobe-images/{filename}")
def get_wardrobe_image(filename: str):
    """Safely serves wardrobe garment images from persistent storage."""
    current_settings = get_settings()
    clean_name = sanitize_filename(filename)
    filepath = os.path.join(current_settings.WARDROBE_DIR, clean_name)

    if not os.path.isfile(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wardrobe image file not found."
        )

    ext = os.path.splitext(clean_name)[1].lower()
    media_type = "image/png"
    if ext in (".jpg", ".jpeg"):
        media_type = "image/jpeg"
    elif ext == ".webp":
        media_type = "image/webp"

    return FileResponse(filepath, media_type=media_type)


# ---------------------------------------------------------------------------
# PHASE C: Clothing Size Comparison Endpoint
# ---------------------------------------------------------------------------

class SizeComparisonRequest(BaseModel):
    customer_measurements: Dict[str, Any]
    garment_measurements: Dict[str, Any]
    garment_category: Optional[str] = "upper_body"
    garment_size: Optional[str] = "M"
    customer_height: Optional[Dict[str, Any]] = None


@app.post("/api/size-comparison")
def compare_sizes_endpoint(req: SizeComparisonRequest):
    """
    Performs transparent dimensional comparison between customer body measurements
    and garment physical measurements.
    Reports inconclusive if insufficient measurements are provided.
    Never guarantees fit or claims IDM-VTON neural inference is affected.
    """
    result = compare_measurements(
        customer_measurements=req.customer_measurements,
        garment_measurements=req.garment_measurements,
        garment_category=req.garment_category or "upper_body",
        garment_size=req.garment_size,
        customer_height=req.customer_height,
    )
    return result
