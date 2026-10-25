# What changed

**Why customization did nothing:** IDM-VTON only accepts person photo, garment photo, text
prompt, category, steps, seed and crop. Colour, size, fit, length, height and measurements
never reached the image. They are now applied by StyleBlend to the generated picture.

## Backend (`backend/`)
- `customizer.py` (new): finds the garment area, then recolours it, changes width/length
  (size, fit, height) and applies finishing (brightness, contrast, saturation, warmth, sharpness).
- `main.py`: `/api/tryon` accepts a `customization` JSON field and returns `result_url` (customized),
  `base_url`, `applied`, `warnings`. New `POST /api/customize` re-applies settings to an existing
  result instantly, without calling Replicate again.
- `requirements.txt`: added `numpy`, `opencv-python-headless`.
- `test_customizer.py` (new): 16 tests. All 30 backend tests pass.

## Frontend (`frontend/src/`)
- Right panel now has **Settings | Customize** tabs (`CustomizePanel.jsx`).
- `services/customization.js` (new), `services/api.js` (`customizeResult`), `App.jsx` (live updates).
- Garment size in the left panel and Profile height/measurements now drive the image.
- Profile modal / panel texts updated to describe what actually happens.

## Run
    pip install -r backend/requirements.txt
    uvicorn backend.main:app --reload --port 8000      # run from the folder that contains backend/
    cd frontend && npm install && npm run dev
