# System Architecture & Technical Specifications

## Project: AI-Powered Virtual Try-On and Style Generation Using Image Blending

---

## Overview

A decoupled three-tier full-stack application. Heavy AI diffusion inference runs on a cloud GPU (Google Colab T4), a lightweight FastAPI service orchestrates request validation and Gradio API communication, and a React web UI handles user interaction.

```
┌──────────────────────────────┐
│  React Frontend              │
│  (Vite + Tailwind CSS)       │
│  localhost:5173              │
└──────────────┬───────────────┘
               │ HTTP multipart/form-data
               │ POST /api/tryon
               ▼
┌──────────────────────────────┐
│  FastAPI Backend             │
│  (Uvicorn + Gradio Client)   │
│  localhost:8000              │
└──────────────┬───────────────┘
               │ HTTPS Gradio Client
               │ api_name="/tryon"
               ▼
┌──────────────────────────────┐
│  Google Colab T4 GPU         │
│  IDM-VTON Inference Pipeline │
│  Gradio Public URL           │
└──────────────────────────────┘
```

---

## Communication Pipeline (Detailed)

### 1. User Interface (React — `frontend/`)
- User selects person image and garment image via file upload or drag-and-drop
- Client-side validation: file type (`image/*`), max size (10 MB)
- Sends `multipart/form-data` POST to `http://localhost:8000/api/tryon` via Axios
- Displays loading overlay (`LoadingOverlay.jsx`) while awaiting response
- On success, renders results in `ResultView.jsx` with three display modes:
  - **Interactive Slider**: side-by-side comparison with draggable divider
  - **Side-by-Side**: equal-width panels labeled "Original" and "Virtual Try-On Result"
  - **Pipeline Steps**: shows all three stages (person → garment → result)
- Download button fetches result via Blob URL for reliable cross-origin file download

### 2. FastAPI Backend (`backend/main.py`)
- Receives and logs the multipart request
- Validates category against `VALID_CATEGORIES = {"upper_body", "lower_body", "dresses"}`
- Validates denoise steps range (20–40)
- Validates both images via `image_utils.validate_image_file()`:
  - Empty file check
  - Max size check (configurable via `MAX_UPLOAD_SIZE_MB`, default 10)
  - Extension whitelist: `.jpg`, `.jpeg`, `.png`, `.webp`
  - PIL `Image.verify()` for structural image integrity
  - Minimum dimension check (64×64)
- Generates a unique `job_id = req_{uuid4[:8]}`
- Saves validated images to `backend/uploads/inputs/`
- If `COLAB_GRADIO_URL` is not configured → returns validation mock response (HTTP 200)
- If configured → delegates to `IDMInferenceClient.predict_tryon()`

### 3. Inference Client (`backend/inference_client.py`)
- Establishes Gradio `Client` connection to the Colab endpoint
- Constructs `gr.ImageEditor` payload: `{"background": handle_file(path), "layers": []}`
- Calls `client.predict(api_name="/tryon")` with 7 or 8 parameter fallback:
  - **8-param**: person, garment, description, auto_mask, auto_crop, denoise_steps, seed, category
  - **7-param** (fallback): same without the trailing `category` argument
- Saves returned temp images to `backend/uploads/outputs/` with `{job_id}_result.png`
- Returns `(result_path, mask_path, execution_time)` tuple

### 4. Cloud AI Processing (Google Colab T4)
IDM-VTON runs the following preprocessing and inference pipeline:

| Step | Component | Purpose |
|---|---|---|
| 1 | Human Parser (SCHP) | Segments person into semantic regions |
| 2 | OpenPose | Detects 18-point 2D body keypoints |
| 3 | DensePose | Maps 2D pixels to 3D body surface coordinates (UV maps) |
| 4 | Agnostic Mask | Removes the existing garment from the person image |
| 5 | UNet Denoising | 30-step DDIM diffusion to synthesize garment on person |
| 6 | Output | 768×1024 PNG: try-on result + masked intermediate |

### 5. Result Delivery
- Colab returns two image paths via Gradio API
- FastAPI copies them to `backend/uploads/outputs/`
- Frontend constructs the full URL: `http://localhost:8000/api/results/{filename}`
- `GET /api/results/{filename}` uses `sanitize_filename()` to prevent path traversal

---

## Clothing Category Mapping

| UI Label | API Value | IDM-VTON Target |
|---|---|---|
| Upper Body | `upper_body` | Tops, T-shirts, jackets, shirts, hoodies |
| Lower Body | `lower_body` | Pants, skirts, shorts, jeans |
| Dresses | `dresses` | Full-length dresses, jumpsuits, full outfits |

---

## Error Handling Matrix

| Error Condition | HTTP Code | User-Facing Message |
|---|---|---|
| Invalid file extension | 400 | "Invalid file extension..." |
| File too large | 400 | "File size exceeds 10 MB limit" |
| Corrupted/non-image file | 400 | "Invalid or corrupted image format" |
| Invalid category | 400 | "Invalid category '...'" |
| Colab offline / connection refused | 503 | "Colab Inference Offline: ..." |
| CUDA OOM on T4 | 500 | "Google Colab T4 GPU ran out of VRAM..." |
| Unexpected model error | 500 | "AI Model Error: ..." |

---

## Security Measures

- **Path traversal prevention:** `sanitize_filename()` strips all path characters from result filenames before filesystem access
- **MIME type check:** PIL `Image.verify()` detects mismatched headers (e.g., `.png` with JPEG magic bytes)
- **CORS:** Restricted to `http://localhost:5173` in development
- **Temporary file cleanup:** Files older than 1 hour are deleted automatically on each new request

---

## Backend Configuration (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `COLAB_GRADIO_URL` | placeholder string | Active Gradio public URL from Colab |
| `HOST` | `127.0.0.1` | FastAPI bind address |
| `PORT` | `8000` | FastAPI port |
| `DEBUG` | `True` | Enable Uvicorn debug mode |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum image upload size |
| `FILE_CLEANUP_AGE_HOURS` | `1` | Hours before temp files are deleted |

---

## Automated Test Coverage (`backend/test_backend.py`)

| # | Test Name | Type | What it Verifies |
|---|---|---|---|
| 1 | `test_health_endpoint` | Automated | `/api/health` returns status, colab_endpoint, max_upload_size_mb |
| 2 | `test_inference_client_configuration` | Automated | `is_configured()` correctly detects placeholder vs real URLs |
| 3 | `test_valid_tryon_upload_validation_mode` | Automated | Full upload → validation → result URL → file serve cycle |
| 4 | `test_invalid_file_format_rejection` | Automated | Non-image bytes rejected with 400 and correct error message |
| 5 | `test_oversized_file_rejection` | Automated | 11 MB file rejected with 400 and "exceeds maximum limit" |
| 6 | `test_invalid_category_rejection` | Automated | `footwear` category rejected with 400 |
| 7 | `test_offline_gradio_endpoint_handling` | Automated | Invalid Colab URL returns 503 "Colab Inference Offline" |
