"""Tests for the customization layer (colour / fit / size / length / profile / finishing)."""
import io
import json
import os
import sys

import numpy as np
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
from backend.config import get_settings
from backend.inference_client import IDMInferenceClient
from backend.customizer import (
    derive_garment_mask,
    render_customization,
    resolve_params,
    customization_digest,
)

client = TestClient(app)
W, H = 768, 1024
BOX = (250, 260, 520, 560)  # garment rectangle
NAVY = np.array([20, 30, 60])


def _make_images(dirpath, job="req_aaaaaaaa"):
    """Light background + skin-coloured head, with a dark-navy garment block."""
    person = Image.new("RGB", (W, H), (205, 208, 214))
    d = ImageDraw.Draw(person)
    d.ellipse((330, 90, 440, 230), fill=(224, 172, 140))      # head (skin tone)
    d.rectangle(BOX, fill=(150, 130, 110))                    # original clothes
    result = person.copy()
    ImageDraw.Draw(result).rectangle(BOX, fill=tuple(NAVY))   # new garment
    masked = person.copy()
    ImageDraw.Draw(masked).rectangle(BOX, fill=(128, 128, 128))
    p, r, m = (os.path.join(dirpath, n) for n in (f"{job}_person.png", f"{job}_result.png", f"{job}_masked.png"))
    person.save(p)
    result.save(r)
    masked.save(m)
    return p, r, m


def _inner(arr):
    x0, y0, x1, y1 = BOX
    return arr[y0 + 20:y1 - 20, x0 + 20:x1 - 20]


def _is_navy(arr):
    return np.abs(arr.astype(int) - NAVY).sum(axis=-1) < 40


def _row_width(img_arr, row):
    xs = np.nonzero(_is_navy(img_arr[row]))[0]
    return 0 if len(xs) == 0 else int(xs.max() - xs.min())


def _hem(img_arr):
    ys = np.nonzero(_is_navy(img_arr[:, 385]))[0]
    return int(ys.max())


@pytest.fixture
def job(tmp_path):
    p, r, m = _make_images(str(tmp_path))
    return p, r, m, derive_garment_mask(p, r, m)


# ------------------------------------------------------------------ mask ----

def test_mask_covers_garment_not_head(job):
    _, _, _, mask = job
    assert mask is not None
    x0, y0, x1, y1 = BOX
    assert mask[(y0 + y1) // 2, (x0 + x1) // 2] > 0.9
    assert mask[150, 385] < 0.1   # head
    assert mask[900, 100] < 0.1   # background


def test_mask_none_when_nothing_found(tmp_path):
    img = Image.new("RGB", (W, H), (200, 200, 200))
    p = str(tmp_path / "p.png")
    img.save(p)
    assert derive_garment_mask(p, p, None) is None


def test_mask_with_black_white_mask(tmp_path):
    p, r, _ = _make_images(str(tmp_path), "req_bw")
    bw = Image.new("L", (W, H), 0)
    ImageDraw.Draw(bw).rectangle(BOX, fill=255)
    bw_path = str(tmp_path / "bw.png")
    bw.save(bw_path)

    mask = derive_garment_mask(p, r, bw_path, category="upper_body")
    assert mask is not None
    x0, y0, x1, y1 = BOX
    assert mask[(y0 + y1) // 2, (x0 + x1) // 2] > 0.8
    assert mask[150, 385] < 0.1   # head
    assert mask[900, 100] < 0.1   # background


def test_mask_with_inverted_black_white_mask(tmp_path):
    p, r, _ = _make_images(str(tmp_path), "req_bwinv")
    # Inverted: garment is 0 (black), background is 255 (white)
    bw_inv = Image.new("L", (W, H), 255)
    ImageDraw.Draw(bw_inv).rectangle(BOX, fill=0)
    bw_path = str(tmp_path / "bw_inv.png")
    bw_inv.save(bw_path)

    mask = derive_garment_mask(p, r, bw_path, category="upper_body")
    assert mask is not None
    x0, y0, x1, y1 = BOX
    assert mask[(y0 + y1) // 2, (x0 + x1) // 2] > 0.8
    assert mask[150, 385] < 0.1   # head
    assert mask[900, 100] < 0.1   # background


def test_mask_different_aspect_ratio_person(tmp_path):
    p_orig, r, _ = _make_images(str(tmp_path), "req_diffar")
    # Save person with a 896x1200 resolution (aspect ratio differs from 768x1024)
    p_img = Image.open(p_orig).resize((896, 1200), Image.LANCZOS)
    p_diff_path = str(tmp_path / "person_diff_ar.png")
    p_img.save(p_diff_path)

    # With no masked file, rely on diff signal with direct resize
    mask = derive_garment_mask(p_diff_path, r, None, cropped=False, category="upper_body")
    assert mask is not None
    x0, y0, x1, y1 = BOX
    assert mask[(y0 + y1) // 2, (x0 + x1) // 2] > 0.8
    assert mask[150, 385] < 0.1   # head
    assert mask[900, 100] < 0.1   # background


# ---------------------------------------------------------------- colour ----

def test_colour_changes_garment_only(job):
    _, r, _, mask = job
    out, applied, warnings = render_customization(
        r, mask, resolve_params({"color": {"hex": "#C0392B", "strength": 100}})
    )
    out = np.array(out)
    base = np.array(Image.open(r))
    inner = _inner(out).reshape(-1, 3).mean(axis=0)
    assert inner[0] > inner[2] + 25, "garment should now be red-dominant"
    assert np.array_equal(out[150, 385], base[150, 385]), "head must be untouched"
    assert np.array_equal(out[900, 100], base[900, 100]), "background must be untouched"
    assert applied and not warnings


def test_colour_strength_blends(job):
    _, r, _, mask = job
    full = np.array(render_customization(r, mask, resolve_params({"color": {"hex": "#C0392B", "strength": 100}}))[0])
    half = np.array(render_customization(r, mask, resolve_params({"color": {"hex": "#C0392B", "strength": 50}}))[0])
    base = np.array(Image.open(r))
    c = (400, 385)
    assert abs(int(half[c][0]) - int(base[c][0])) < abs(int(full[c][0]) - int(base[c][0]))


# ------------------------------------------------------------ fit / size ----

def test_fit_changes_width_in_expected_direction(job):
    _, r, _, mask = job
    base_w = _row_width(np.array(Image.open(r)), 400)
    over = np.array(render_customization(r, mask, resolve_params({"fit": "oversized"}))[0])
    slim = np.array(render_customization(r, mask, resolve_params({"fit": "slim"}))[0])
    assert _row_width(over, 400) > base_w * 1.08
    assert _row_width(slim, 400) < base_w * 0.97


def test_garment_size_vs_body_size():
    # default M body wearing XL garment -> wider; XS garment -> narrower
    assert resolve_params({"garment_size": "XL"})["sx"] > 1.05
    assert resolve_params({"garment_size": "XS"})["sx"] < 0.95
    # same XL garment on an XL body (chest 112 cm) with profile on -> true fit
    r = resolve_params({"garment_size": "XL", "use_profile": True, "profile": {"chest_cm": 112}})
    assert r["body_size"] == "XL" and abs(r["sx"] - 1.0) < 0.001


def test_profile_height_scales_length():
    tall = resolve_params({"use_profile": True, "profile": {"height_cm": 190}})
    short = resolve_params({"use_profile": True, "profile": {"height_cm": 155}})
    off = resolve_params({"use_profile": False, "profile": {"height_cm": 190}})
    assert tall["sy"] < 1.0 < short["sy"]
    assert off["sy"] == 1.0 and off["is_noop"]


def test_lower_body_uses_waist():
    r = resolve_params({"garment_size": "M", "use_profile": True, "profile": {"waist_cm": 95}}, "lower_body")
    assert r["body_size"] == "XL"


def test_length_slider_moves_hem(job):
    _, r, _, mask = job
    base_hem = _hem(np.array(Image.open(r)))
    longer = np.array(render_customization(r, mask, resolve_params({"length": 12}))[0])
    shorter = np.array(render_customization(r, mask, resolve_params({"length": -12}))[0])
    assert _hem(longer) > base_hem + 15
    assert _hem(shorter) < base_hem - 15


# -------------------------------------------------------------- finishing ----

def test_finishing_scopes(job):
    _, r, _, mask = job
    base = np.array(Image.open(r)).astype(int)
    g = np.array(render_customization(r, mask, resolve_params({"adjust": {"brightness": 40, "scope": "garment"}}))[0]).astype(int)
    i = np.array(render_customization(r, mask, resolve_params({"adjust": {"brightness": 40, "scope": "image"}}))[0]).astype(int)
    assert g[900, 100].tolist() == base[900, 100].tolist()   # garment scope leaves background alone
    assert i[900, 100].sum() > base[900, 100].sum()          # image scope brightens it
    assert _inner(g).sum() > _inner(base).sum()


def test_no_mask_warns_but_still_applies_global_finishing(job):
    _, r, _, _ = job
    resolved = resolve_params({"color": {"hex": "#00FF00"}, "adjust": {"brightness": 30, "scope": "image"}})
    _, applied, warnings = render_customization(r, None, resolved)
    assert warnings and any("Finishing" in a for a in applied)
    assert not any("Colour" in a for a in applied)


# ------------------------------------------------------------- validation ----

def test_validation_errors():
    with pytest.raises(ValueError):
        resolve_params({"color": {"hex": "red"}})
    with pytest.raises(ValueError):
        resolve_params({"fit": "baggy"})
    r = resolve_params({"length": 9999, "adjust": {"brightness": -999}})
    assert r["params"]["length"] == 15 and r["params"]["adjust"]["brightness"] == -50


def test_noop_and_digest():
    assert resolve_params({})["is_noop"]
    a = customization_digest(resolve_params({"fit": "slim"}))
    b = customization_digest(resolve_params({"fit": "slim"}))
    c = customization_digest(resolve_params({"fit": "relaxed"}))
    assert a == b and a != c


# -------------------------------------------------------------------- API ----

def test_api_tryon_then_live_customize(monkeypatch, tmp_path):
    out_dir = get_settings().OUTPUT_DIR
    person_path, _, _ = _make_images(str(tmp_path), "req_bbbbbbbb")
    pbytes = open(person_path, "rb").read()

    def fake_predict(self, person_file_path, garment_file_path, garment_description, category="upper_body",
                     auto_mask=True, auto_crop=False, denoise_steps=30, seed=42, output_dir="", job_id="x"):
        os.makedirs(output_dir, exist_ok=True)
        _, r, m = _make_images(output_dir, job_id)
        os.remove(os.path.join(output_dir, f"{job_id}_person.png"))
        return r, m, 0.1

    monkeypatch.setattr(IDMInferenceClient, "predict_tryon", fake_predict)
    monkeypatch.setattr(IDMInferenceClient, "is_configured", lambda self: True)

    resp = client.post(
        "/api/tryon",
        files={"person_image": ("p.png", pbytes, "image/png"), "garment_image": ("g.png", pbytes, "image/png")},
        data={"category": "upper_body", "customization": json.dumps({"color": {"hex": "#C0392B"}})},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["mask_available"] is True
    assert "_custom_" in body["result_url"] and body["base_url"].endswith("_result.png")
    assert any("Colour" in a for a in body["applied"])

    job_id = body["job_id"]
    r2 = client.post("/api/customize", json={"job_id": job_id, "category": "upper_body",
                                              "customization": {"fit": "oversized", "length": 8}})
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert j2["result_url"] != body["result_url"] and j2["effective"]["width_scale"] > 1.1
    assert client.get(j2["result_url"]).status_code == 200

    r3 = client.post("/api/customize", json={"job_id": job_id, "customization": {}})
    assert r3.json()["result_url"] == body["base_url"]

    for name in os.listdir(out_dir):   # tidy up
        if name.startswith(job_id):
            os.remove(os.path.join(out_dir, name))


def test_api_customize_errors():
    assert client.post("/api/customize", json={"job_id": "../etc/passwd", "customization": {}}).status_code == 400
    assert client.post("/api/customize", json={"job_id": "req_deadbeef", "customization": {}}).status_code == 404
    assert client.post("/api/customize", json={"job_id": "req_deadbeef", "category": "hats", "customization": {}}).status_code == 400


def test_api_tryon_rejects_bad_customization():
    buf = io.BytesIO()
    Image.new("RGB", (128, 128), (10, 10, 10)).save(buf, "PNG")
    data = buf.getvalue()
    resp = client.post(
        "/api/tryon",
        files={"person_image": ("p.png", data, "image/png"), "garment_image": ("g.png", data, "image/png")},
        data={"customization": '{"fit":"baggy"}'},
    )
    assert resp.status_code == 400 and "Customization Error" in resp.json()["detail"]
