# AI-Powered Virtual Try-On and Style Generation Using Image Blending

A full-stack, academic computer science project demonstrating AI-driven virtual try-on using the IDM-VTON deep learning model. Garments are synthesized onto person photographs while preserving clothing texture, folds, and body geometry.

---

## System Architecture

```
[ React + Tailwind CSS ]  <--->  [ FastAPI Backend ]  <--->  [ Google Colab T4 GPU ]
        :5173                          :8000                   IDM-VTON Diffusion Model
```

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v3, Lucide Icons, Axios |
| **Backend** | Python FastAPI, Uvicorn, Gradio Client, Pillow |
| **AI Engine** | IDM-VTON (Diffusion + DensePose + Human Parsing + OpenPose) |
| **Inference Host** | Google Colab T4 GPU (free tier) via Gradio public URL |

---

## Project Structure

```
virtual-try-on/
├── frontend/                        # Web UI (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── App.jsx                  # Root application state and logic
│   │   ├── services/api.js          # Axios API client configuration
│   │   └── components/
│   │       ├── Navbar.jsx
│   │       ├── UploadPanel.jsx      # Image upload, drag-and-drop, settings
│   │       ├── ResultView.jsx       # Slider, side-by-side, pipeline views + download
│   │       ├── LoadingOverlay.jsx
│   │       ├── ImagePreview.jsx
│   │       └── Footer.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                         # REST API Service (FastAPI + Gradio Client)
│   ├── main.py                      # API routes: /api/health, /api/tryon, /api/results/{file}
│   ├── config.py                    # Pydantic settings (reads from .env)
│   ├── image_utils.py               # Image validation (PIL), sanitization, temp cleanup
│   ├── inference_client.py          # Gradio client connector to Colab IDM-VTON
│   ├── test_backend.py              # Automated pytest test suite (7 tests)
│   ├── requirements.txt
│   ├── .env                         # Local config (not committed to git)
│   └── .env.example                 # Template for .env setup
│
├── docs/
│   └── architecture.md              # System architecture documentation
├── pytest.ini                       # Pytest configuration
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Python** 3.10 or higher
- **Node.js** 18 or higher + npm
- **Google Colab** account (for live AI inference — free T4 GPU)
- A Google account to access Colab

---

## Installation & Setup

### Step 1 — Clone or locate the project

```powershell
cd "c:\Users\SARVESH\OneDrive\Desktop\virtual-try-on"
```

### Step 2 — Backend Setup (FastAPI)

Run from the **project root** (`virtual-try-on/`), not from inside `backend/`:

```powershell
# Install Python dependencies
python -m pip install -r backend/requirements.txt

# Run the automated test suite (7 tests, all should pass)
python -m pytest backend/test_backend.py -v

# Start the FastAPI server
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

> **API Health Check:** http://localhost:8000/api/health  
> **Interactive API Docs (Swagger):** http://localhost:8000/docs

### Step 3 — Frontend Setup (React)

Open a **second terminal** and run:

```powershell
cd "c:\Users\SARVESH\OneDrive\Desktop\virtual-try-on\frontend"

# Install Node packages
npm install

# Start Vite development server
npm run dev
```

> **Web App:** http://localhost:5173

---

## Google Colab AI Service Setup (Required for Real Inference)

Without Colab, the application runs in **Validation Mode** — it validates and accepts your images but returns the person image as a placeholder instead of running AI inference.

To enable real AI inference:

1. Open the notebook `IDM_VTON_Inference_Clean (1).ipynb` in [Google Colab](https://colab.research.google.com/)
2. Select **Runtime → Change runtime type → T4 GPU**
3. Run **Sections 1–7** to set up the environment and load the model
4. In **Section 12**, set `START_GRADIO = True` and run the cell
5. Copy the public URL that appears — it looks like: `https://abc123def.gradio.live`
6. Paste it into `backend/.env`:

```env
COLAB_GRADIO_URL=https://abc123def.gradio.live
```

7. **Restart the FastAPI server** for the new URL to take effect:
   ```powershell
   python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```
8. Confirm the status badge in the UI changes from **"Validation Mode"** to **"Active URL Set"**

---

## How to Perform a Virtual Try-On

1. Open **http://localhost:5173** in your browser
2. In the **Person Photograph** panel: upload a clear, front-facing photo of a person (JPG/PNG/WEBP, max 10 MB)
3. In the **Garment Photograph** panel: upload a photo of the clothing item on a plain background
4. Select the **Clothing Category**: Upper Body, Lower Body, or Dresses
5. Enter a short **Garment Description** (e.g., "Short Sleeve Round Neck T-shirt")
6. Optionally expand **Advanced Inference Settings** to adjust denoising steps (20–40) and random seed
7. Click **Generate Virtual Try-On**
8. Wait 15–25 seconds while the IDM-VTON model processes on the Colab T4 GPU
9. View results using:
   - **Interactive Slider** — drag left/right to compare Original vs Result
   - **Side-by-Side** — both images displayed at equal size with labels
   - **Pipeline Steps** — shows Person Input → Garment → Final Result
10. Click **Download Result** to save the generated image as `virtual_tryon_result_<timestamp>.png`

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns backend status, Colab configuration, and allowed categories |
| `POST` | `/api/tryon` | Accepts `multipart/form-data` with person_image, garment_image, category, garment_description, auto_crop, denoise_steps, seed |
| `GET` | `/api/results/{filename}` | Serves a generated output image file |

---

## Validation Mode vs Real AI Inference

| Feature | Validation Mode | Real Inference Mode |
|---|---|---|
| Image format check | ✅ | ✅ |
| File size check (≤10 MB) | ✅ | ✅ |
| Category validation | ✅ | ✅ |
| AI-generated try-on | ❌ (returns input image) | ✅ (IDM-VTON on T4 GPU) |
| Requires Colab | ❌ | ✅ |
| Response time | ~0.1s | 15–25s |

The mode is shown in the status bar at the top of the web interface and in the health API response.

---

## Running Tests

```powershell
# From the project root
python -m pytest backend/test_backend.py -v
```

Expected output:
```
PASSED  test_health_endpoint
PASSED  test_inference_client_configuration
PASSED  test_valid_tryon_upload_validation_mode
PASSED  test_invalid_file_format_rejection
PASSED  test_oversized_file_rejection
PASSED  test_invalid_category_rejection
PASSED  test_offline_gradio_endpoint_handling
7 passed
```

---

## Known Limitations

1. **Colab session timeout:** Google Colab free-tier sessions disconnect after ~90 minutes of GPU inactivity. If inference fails with a 503 error, re-run Section 12 in Colab and update `COLAB_GRADIO_URL` in `backend/.env`.

2. **Gradio URL expiry:** Each Colab session generates a new temporary `.gradio.live` URL. The `.env` file must be updated every time a new Colab session is started.

3. **Sample image CORS:** Clicking "Use Sample" loads images from Unsplash via external URL. Due to browser CORS restrictions, using a sample image may fail at submission time. Upload your own image files for reliable operation.

4. **Inference time variability:** Cold starts (first request after loading the model) may take 30–60 seconds. Subsequent requests typically complete in 15–25 seconds.

5. **T4 VRAM limit:** Very high-resolution inputs (>2048px) may cause CUDA out-of-memory errors. The recommended input resolution is 768×1024 or similar portrait format.

6. **Category parameter:** The IDM-VTON Gradio API signature may not expose the clothing category parameter depending on which version of the notebook is used. The backend implements automatic fallback between 7- and 8-parameter signatures.

7. **Temporary file cleanup:** Backend input/output files older than 1 hour are automatically deleted. Do not rely on `/api/results/{filename}` URLs after extended periods.

---

## Technology Credits

- **IDM-VTON:** Choi et al., *Improving Diffusion Models for Authentic Virtual Try-On in the Wild* (ECCV 2024)
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Backend:** FastAPI, Uvicorn, Gradio Client, Pillow

---

*Project: AI-Powered Virtual Try-On and Style Generation Using Image Blending — B.Tech Computer Science*
#   m k  
 #   m k  
 #   S t y l e B l e n d  
 #   S t y l e B l e n d  
 #   S t y l e B l e n d  
 #   S t y l e B l e n d  
 