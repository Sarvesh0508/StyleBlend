"""
Backend unit tests for the Replicate IDM-VTON virtual try-on service.
All tests that would otherwise call Replicate are monkeypatched.
"""
import os
import io
import shutil
import pytest
from PIL import Image
from fastapi.testclient import TestClient

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
from backend.inference_client import IDMInferenceClient

client = TestClient(app)


def create_dummy_image(format="PNG", size=(256, 256), color="blue"):
    """Helper to generate a valid in-memory image."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Test 1: Health Check Endpoint
# ---------------------------------------------------------------------------
def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["inference_provider"] == "replicate"
    assert "replicate_configured" in data
    assert "max_upload_size_mb" in data
    assert "allowed_categories" in data


# ---------------------------------------------------------------------------
# Test 2: IDMInferenceClient configuration check
# ---------------------------------------------------------------------------
def test_inference_client_configuration():
    # No token → not configured
    c_unconfig = IDMInferenceClient(api_token="")
    assert c_unconfig.is_configured() is False

    # Valid token → configured
    c_config = IDMInferenceClient(api_token="r8_faketoken123abc")
    assert c_config.is_configured() is True


# ---------------------------------------------------------------------------
# Test 3: Valid upload with mocked Replicate inference
# ---------------------------------------------------------------------------
def test_valid_tryon_upload_mocked(monkeypatch, tmp_path):
    """Verify the happy-path response shape when inference is mocked."""
    dummy_img_bytes = create_dummy_image(color="blue")

    def mock_predict_tryon(
        self,
        person_file_path,
        garment_file_path,
        garment_description,
        category,
        auto_mask,
        auto_crop,
        denoise_steps,
        seed,
        output_dir,
        job_id,
    ):
        # Write dummy output files so /api/results/<file> can serve them
        res_p  = os.path.join(output_dir, f"{job_id}_result.png")
        mask_p = os.path.join(output_dir, f"{job_id}_masked.png")
        for p in (res_p, mask_p):
            Image.new("RGB", (256, 256), color="blue").save(p)
        return res_p, mask_p, 45.2

    monkeypatch.setattr(IDMInferenceClient, "predict_tryon", mock_predict_tryon)
    monkeypatch.setattr(IDMInferenceClient, "is_configured", lambda self: True)

    person_bytes  = create_dummy_image(format="JPEG", color="red")
    garment_bytes = create_dummy_image(format="PNG",  color="blue")

    files = {
        "person_image":  ("person.jpg",  person_bytes,  "image/jpeg"),
        "garment_image": ("garment.png", garment_bytes, "image/png"),
    }
    data = {
        "category":            "upper_body",
        "garment_description": "Blue Cotton T-Shirt",
        "auto_crop":           "false",
        "denoise_steps":       "30",
        "seed":                "42",
    }

    response = client.post("/api/tryon", files=files, data=data)
    assert response.status_code == 200

    res = response.json()
    assert res["status"] == "success"
    assert res["mode"] == "replicate"
    assert "job_id" in res
    assert res["result_url"].startswith("/api/results/")
    assert res["masked_url"].startswith("/api/results/")
    assert res["execution_time_seconds"] == 45.2

    # Verify the file-serving endpoint works
    file_resp = client.get(res["result_url"])
    assert file_resp.status_code == 200
    assert file_resp.headers["content-type"] == "image/png"


# ---------------------------------------------------------------------------
# Test 4: Invalid file format is rejected
# ---------------------------------------------------------------------------
def test_invalid_file_format_rejection():
    invalid_text_bytes = b"This is a plain text file, not an image."
    valid_image_bytes  = create_dummy_image()

    files = {
        "person_image":  ("script.txt",  invalid_text_bytes, "text/plain"),
        "garment_image": ("garment.png", valid_image_bytes,  "image/png"),
    }

    response = client.post("/api/tryon", files=files)
    assert response.status_code == 400
    assert "Person Image Error" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Test 5: Oversized file is rejected
# ---------------------------------------------------------------------------
def test_oversized_file_rejection():
    oversized_bytes = b"0" * (11 * 1024 * 1024)
    valid_bytes     = create_dummy_image()

    files = {
        "person_image":  ("huge_person.png", oversized_bytes, "image/png"),
        "garment_image": ("garment.png",     valid_bytes,     "image/png"),
    }

    response = client.post("/api/tryon", files=files)
    assert response.status_code == 400
    assert "exceeds maximum limit" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Test 6: Invalid category is rejected
# ---------------------------------------------------------------------------
def test_invalid_category_rejection():
    person_bytes  = create_dummy_image()
    garment_bytes = create_dummy_image()

    files = {
        "person_image":  ("person.png",  person_bytes,  "image/png"),
        "garment_image": ("garment.png", garment_bytes, "image/png"),
    }

    response = client.post("/api/tryon", files=files, data={"category": "footwear"})
    assert response.status_code == 400
    assert "Invalid category 'footwear'" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Test 7: Replicate inference failure returns HTTP 500, never a fake result
# ---------------------------------------------------------------------------
def test_replicate_inference_failure_returns_http_error(monkeypatch):
    """If Replicate throws, the endpoint must return an HTTP error — not a fake image."""
    def mock_predict_tryon(self, *args, **kwargs):
        raise RuntimeError("Replicate API connection refused")

    monkeypatch.setattr(IDMInferenceClient, "predict_tryon", mock_predict_tryon)
    monkeypatch.setattr(IDMInferenceClient, "is_configured", lambda self: True)

    person_bytes  = create_dummy_image()
    garment_bytes = create_dummy_image()

    files = {
        "person_image":  ("person.png",  person_bytes,  "image/png"),
        "garment_image": ("garment.png", garment_bytes, "image/png"),
    }

    response = client.post("/api/tryon", files=files)
    assert response.status_code in (500, 503)
    data = response.json()
    assert "detail" in data
    # The person image must NOT be silently returned as a result
    assert "status" not in data or data.get("status") != "success"


# ---------------------------------------------------------------------------
# Test 8: Missing Replicate token returns HTTP 503
# ---------------------------------------------------------------------------
def test_missing_replicate_token_returns_503(monkeypatch):
    """Without a token, /api/tryon must return 503 — not a mock result."""
    monkeypatch.setattr(IDMInferenceClient, "is_configured", lambda self: False)

    person_bytes  = create_dummy_image()
    garment_bytes = create_dummy_image()

    files = {
        "person_image":  ("person.png",  person_bytes,  "image/png"),
        "garment_image": ("garment.png", garment_bytes, "image/png"),
    }

    response = client.post("/api/tryon", files=files)
    assert response.status_code == 503
    assert "REPLICATE_API_TOKEN" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Test 9: Saved Looks Persistence & File Serving (Phase A)
# ---------------------------------------------------------------------------
def test_saved_looks_crud_and_persistence(tmp_path):
    from backend.config import get_settings
    settings = get_settings()

    # Create dummy output file
    dummy_res_filename = "test_req_result.png"
    dummy_res_path = os.path.join(settings.OUTPUT_DIR, dummy_res_filename)
    Image.new("RGB", (128, 128), color="green").save(dummy_res_path)

    # 1. Save look
    save_payload = {
        "result_url": f"/api/results/{dummy_res_filename}",
        "original_person": None,
        "garment_person": None,
        "category": "upper_body",
        "description": "Green Crewneck Fit",
        "execution_time": 32.5,
        "mode": "replicate"
    }
    post_resp = client.post("/api/saved-looks", json=save_payload)
    assert post_resp.status_code == 201
    saved_data = post_resp.json()
    assert "id" in saved_data
    assert saved_data["result_url"].startswith("/api/saved-images/")
    look_id = saved_data["id"]
    saved_filename = saved_data["result_filename"]

    # Verify file was copied to SAVED_DIR
    saved_file_on_disk = os.path.join(settings.SAVED_DIR, saved_filename)
    assert os.path.isfile(saved_file_on_disk)

    # 2. Retrieve via GET /api/saved-images/{filename}
    img_resp = client.get(saved_data["result_url"])
    assert img_resp.status_code == 200
    assert img_resp.headers["content-type"] == "image/png"

    # 3. List saved looks
    list_resp = client.get("/api/saved-looks")
    assert list_resp.status_code == 200
    looks = list_resp.json()["saved_looks"]
    assert any(l["id"] == look_id for l in looks)

    # 4. Get single saved look
    get_resp = client.get(f"/api/saved-looks/{look_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == look_id

    # 5. Delete saved look
    del_resp = client.delete(f"/api/saved-looks/{look_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # Verify deletion from DB and disk
    assert not os.path.isfile(saved_file_on_disk)
    get_after_del = client.get(f"/api/saved-looks/{look_id}")
    assert get_after_del.status_code == 404


# ---------------------------------------------------------------------------
# Test 10: Cleanup does not delete protected files (Phase A)
# ---------------------------------------------------------------------------
def test_cleanup_protects_referenced_files(monkeypatch):
    from backend.image_utils import cleanup_old_files
    from backend.config import get_settings
    settings = get_settings()

    test_dir = os.path.join(settings.UPLOAD_DIR, "test_cleanup")
    os.makedirs(test_dir, exist_ok=True)

    unprotected_file = os.path.join(test_dir, "old_unprotected.png")
    protected_file = os.path.join(test_dir, "saved_look_protected.png")

    Image.new("RGB", (64, 64), color="red").save(unprotected_file)
    Image.new("RGB", (64, 64), color="blue").save(protected_file)

    # Backdate modification time by 2 hours
    old_mtime = os.path.getmtime(unprotected_file) - 7200
    os.utime(unprotected_file, (old_mtime, old_mtime))
    os.utime(protected_file, (old_mtime, old_mtime))

    protected_set = {"saved_look_protected.png"}
    cleanup_old_files(test_dir, max_age_hours=1, protected_filenames=protected_set)

    # Unprotected should be removed, protected must survive
    assert not os.path.exists(unprotected_file)
    assert os.path.exists(protected_file)

    # Clean up test dir
    shutil.rmtree(test_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Test 11: Wardrobe Server-Side Storage & Metadata CRUD (Phase B)
# ---------------------------------------------------------------------------
def test_wardrobe_storage_crud():
    garment_bytes = create_dummy_image(format="PNG", color="black")

    # 1. Create wardrobe item
    files = {"image": ("streetwear_hoodie.png", garment_bytes, "image/png")}
    data = {
        "name": "Heavyweight Black Hoodie",
        "category": "upper_body",
        "color": "Black",
        "style": "Streetwear",
        "size": "L",
        "brand": "Atelier Noir",
        "notes": "450gsm French terry cotton hoodie",
        "price": "89.00",
        "meas_chest": "112.0",
        "meas_waist": "108.0",
        "meas_length": "72.0",
        "meas_unit": "cm",
    }
    create_resp = client.post("/api/wardrobe", files=files, data=data)
    assert create_resp.status_code == 201
    item = create_resp.json()
    assert item["name"] == "Heavyweight Black Hoodie"
    assert item["category"] == "upper_body"
    assert item["size"] == "L"
    assert item["meas_chest"] == 112.0
    assert item["image_url"].startswith("/api/wardrobe-images/")
    item_id = item["id"]

    # 2. Serve image
    img_resp = client.get(item["image_url"])
    assert img_resp.status_code == 200
    assert img_resp.headers["content-type"] == "image/png"

    # 3. List wardrobe
    list_resp = client.get("/api/wardrobe")
    assert list_resp.status_code == 200
    items = list_resp.json()["items"]
    assert any(i["id"] == item_id for i in items)

    # 4. Modify wardrobe item
    update_resp = client.put(f"/api/wardrobe/{item_id}", data={"notes": "Updated notes: ultra-soft wash", "times_used": "2"})
    assert update_resp.status_code == 200
    updated_item = update_resp.json()
    assert updated_item["notes"] == "Updated notes: ultra-soft wash"
    assert updated_item["times_used"] == 2

    # 5. Delete wardrobe item
    del_resp = client.delete(f"/api/wardrobe/{item_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # Verify not found after delete
    get_after = client.get(f"/api/wardrobe/{item_id}")
    assert get_after.status_code == 404


# ---------------------------------------------------------------------------
# Test 12: Wardrobe Image Validation (Phase B)
# ---------------------------------------------------------------------------
def test_wardrobe_invalid_file_rejected():
    files = {"image": ("bad.txt", b"plain text", "text/plain")}
    data = {"name": "Invalid Item", "category": "upper_body"}
    resp = client.post("/api/wardrobe", files=files, data=data)
    assert resp.status_code == 400
    assert "Garment Image Validation Error" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 13: Clothing Size Comparison (Phase C)
# ---------------------------------------------------------------------------
def test_size_comparison_conclusive():
    payload = {
        "customer_measurements": {"chest": 96.0, "waist": 82.0, "hip": 98.0, "unit": "cm"},
        "garment_measurements": {"chest": 102.0, "waist": 88.0, "length": 70.0, "unit": "cm"},
        "garment_category": "upper_body",
        "garment_size": "M",
        "customer_height": {"value": "178", "unit": "cm"}
    }
    resp = client.post("/api/size-comparison", json=payload)
    assert resp.status_code == 200
    res = resp.json()
    assert res["conclusive"] is True
    assert len(res["comparisons"]) >= 2
    # Chest delta: 102 - 96 = +6.0cm (regular fit)
    chest_cmp = next(c for c in res["comparisons"] if "Chest" in c["dimension"])
    assert chest_cmp["delta_cm"] == 6.0
    assert chest_cmp["status"] == "regular"
    assert res["customer_height_context"] == "178 cm"
    assert "disclaimer" in res


def test_size_comparison_inconclusive():
    payload = {
        "customer_measurements": {"unit": "cm"},
        "garment_measurements": {"unit": "cm"},
        "garment_category": "upper_body",
        "garment_size": "M",
    }
    resp = client.post("/api/size-comparison", json=payload)
    assert resp.status_code == 200
    res = resp.json()
    assert res["conclusive"] is False
    assert "inconclusive" in res["summary"].lower()
    assert len(res["comparisons"]) == 0
