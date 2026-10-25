"""
Customization layer for StyleBlend.

IDM-VTON (cuuupid/idm-vton on Replicate) only accepts: person photo, garment photo,
garment text description, category, steps, seed and crop. It has no inputs for colour,
size, fit, length, height or measurements, so those UI controls can only change the
final picture if we edit the picture ourselves.

This module does that. It works on the *base* try-on result and a garment mask:

  1. derive_garment_mask()  - finds the pixels that belong to the garment
  2. resolve_params()       - turns UI settings + profile data into concrete numbers
  3. render_customization() - recolours / resizes / re-lengths the garment region and
                              applies image finishing (brightness, contrast, ...)

Everything is deterministic, runs on CPU in well under a second, and never calls the
model again - so sliders can update the picture live after one generation.

HONEST LIMITS: these are image-space edits, not a new diffusion pass. Large size or
length changes will look best within the clamped ranges below.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("customizer")

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
SIZE_WIDTH = {"XS": 0.90, "S": 0.95, "M": 1.00, "L": 1.05, "XL": 1.10, "XXL": 1.15}
FIT_WIDTH = {"slim": 0.94, "regular": 1.00, "relaxed": 1.07, "oversized": 1.15}
FIT_LENGTH = {"slim": 1.00, "regular": 1.00, "relaxed": 1.00, "oversized": 1.04}

WIDTH_MIN, WIDTH_MAX = 0.85, 1.25
LENGTH_MIN, LENGTH_MAX = 0.85, 1.15
REFERENCE_HEIGHT_CM = 172.0

# Body-measurement (cm) -> size label thresholds (upper bound exclusive).
_CHEST_BANDS = [(88, "XS"), (94, "S"), (102, "M"), (110, "L"), (118, "XL")]
_WAIST_BANDS = [(70, "XS"), (77, "S"), (85, "M"), (93, "L"), (101, "XL")]

HEX_RE = re.compile(r"^#?([0-9a-fA-F]{6})$")
JOB_ID_RE = re.compile(r"^req_[0-9a-f]{8}$")


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def _clamp(v: Any, lo: float, hi: float, default: float = 0.0) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    if f != f:  # NaN
        return default
    return max(lo, min(hi, f))


def _size_from_bands(value_cm: Optional[float], bands) -> Optional[str]:
    if value_cm is None or value_cm <= 0:
        return None
    for upper, label in bands:
        if value_cm < upper:
            return label
    return "XXL"


def _norm_size(s: Any) -> Optional[str]:
    if not s:
        return None
    s = str(s).strip().upper()
    return s if s in SIZE_WIDTH else None


def _hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    m = HEX_RE.match(hex_str.strip())
    if not m:
        raise ValueError(f"Invalid colour '{hex_str}'")
    h = m.group(1)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


# ---------------------------------------------------------------------------
# 1. Garment mask
# ---------------------------------------------------------------------------

def _largest_components(binary: np.ndarray, keep_ratio: float = 0.15) -> np.ndarray:
    """Keep the largest blob plus any blob that is at least keep_ratio of its size."""
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary.astype(np.uint8), 8)
    if n <= 1:
        return binary
    areas = stats[1:, cv2.CC_STAT_AREA]
    biggest = areas.max()
    keep = np.zeros_like(binary, dtype=bool)
    for i, a in enumerate(areas, start=1):
        if a >= biggest * keep_ratio:
            keep |= labels == i
    return keep


def _skin_probability(rgb: np.ndarray) -> np.ndarray:
    ycrcb = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb)
    cr, cb = ycrcb[..., 1], ycrcb[..., 2]
    return ((cr >= 135) & (cr <= 173) & (cb >= 77) & (cb <= 127)).astype(np.float32)


def _remove_skin_peripheral(
    binary: np.ndarray,
    result_rgb: np.ndarray,
    category: str = "upper_body",
) -> np.ndarray:
    """
    Remove skin pixels ONLY from head/neck and hand/wrist peripheral zones,
    preventing beige sleeves or khaki pants in the garment body from being eaten.
    """
    if not binary.any():
        return binary

    h, w = binary.shape
    skin = _skin_probability(result_rgb)

    skin_zone = np.zeros((h, w), dtype=bool)
    if category == "lower_body":
        # For lower body: head/neck is far above; hands near hips; ankles/feet at bottom
        skin_zone[:int(0.45 * h), :] = True
        skin_zone[:, :int(0.18 * w)] = True
        skin_zone[:, int(0.82 * w):] = True
        skin_zone[int(0.92 * h):, :] = True
    else:  # upper_body and dresses
        # Head and neck area
        skin_zone[:int(0.32 * h), :] = True
        # Lower region where hands hang (below waist)
        skin_zone[int(0.68 * h):, :] = True
        # Peripheral outer lateral sides (resting hands/arms)
        skin_zone[:, :int(0.18 * w)] = True
        skin_zone[:, int(0.82 * w):] = True

    garment_skin_share = skin[binary].mean()
    if garment_skin_share < 0.5:
        skin_clean = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
        skin_to_remove = skin_clean & skin_zone
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        binary = binary & ~skin_to_remove
        binary = cv2.morphologyEx(binary.astype(np.uint8), cv2.MORPH_OPEN, k).astype(bool)

    return binary


def _pick_binary_candidate(
    cand_white: np.ndarray,
    cand_black: np.ndarray,
    category: str = "upper_body",
) -> Tuple[Optional[np.ndarray], str]:
    h, w = cand_white.shape
    y_lo, y_hi = int(0.20 * h), int(0.75 * h)
    x_lo, x_hi = int(0.15 * w), int(0.85 * w)

    def _eval(cand: np.ndarray) -> Tuple[float, float, bool]:
        cov = float(cand.mean())
        if not (0.03 <= cov <= 0.60):
            return cov, 0.0, False
        if category == "upper_body":
            tot = cand.sum()
            in_torso = cand[y_lo:y_hi, x_lo:x_hi].sum()
            frac = (in_torso / tot) if tot > 0 else 0.0
            return cov, frac, (frac >= 0.45)
        return cov, 1.0, True

    cov_w, frac_w, ok_w = _eval(cand_white)
    cov_b, frac_b, ok_b = _eval(cand_black)

    if ok_w and ok_b:
        return (cand_white, f"white_candidate (cov={cov_w:.3f}, torso_frac={frac_w:.3f})") if frac_w >= frac_b else (cand_black, f"black_candidate (cov={cov_b:.3f}, torso_frac={frac_b:.3f})")
    elif ok_w:
        return cand_white, f"white_candidate (cov={cov_w:.3f}, torso_frac={frac_w:.3f})"
    elif ok_b:
        return cand_black, f"black_candidate (cov={cov_b:.3f}, torso_frac={frac_b:.3f})"
    else:
        in_range_w = (0.03 <= cov_w <= 0.60)
        in_range_b = (0.03 <= cov_b <= 0.60)
        if in_range_w and in_range_b:
            return (cand_white, f"white_candidate (cov={cov_w:.3f})") if frac_w >= frac_b else (cand_black, f"black_candidate (cov={cov_b:.3f})")
        if in_range_w:
            return cand_white, f"white_candidate (cov={cov_w:.3f})"
        if in_range_b:
            return cand_black, f"black_candidate (cov={cov_b:.3f})"
        return None, "neither_candidate_valid"


def _grabcut_fallback(
    result_rgb: np.ndarray,
    category: str = "upper_body",
) -> Tuple[Optional[np.ndarray], str]:
    h, w = result_rgb.shape[:2]
    if category == "lower_body":
        rect = (int(0.25 * w), int(0.50 * h), int(0.50 * w), int(0.45 * h))
    elif category == "dresses":
        rect = (int(0.20 * w), int(0.30 * h), int(0.60 * w), int(0.60 * h))
    else:  # upper_body: central ~35-75% height, ~20-80% width
        rect = (int(0.20 * w), int(0.35 * h), int(0.60 * w), int(0.40 * h))

    rx, ry, rw, rh = rect
    if rw <= 10 or rh <= 10:
        return None, "invalid_rect"

    gc_mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(result_rgb, gc_mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        fg = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 1, 0).astype(bool)

        fg = _remove_skin_peripheral(fg, result_rgb, category)
        fg = _largest_components(fg)
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, k)
        fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))).astype(bool)

        cov = float(fg.mean())
        if 0.03 <= cov <= 0.50:
            return fg, f"grabcut_ok (cov={cov:.3f})"
        else:
            return None, f"grabcut_cov_out_of_bounds (cov={cov:.3f})"
    except Exception as e:
        return None, f"grabcut_exception: {e}"


def derive_garment_mask(
    person_path: str,
    result_path: str,
    masked_path: Optional[str] = None,
    cropped: bool = False,
    category: str = "upper_body",
    return_reason: bool = False,
    job_id: Optional[str] = None,
    output_dir: Optional[str] = None,
    debug: Optional[bool] = None,
) -> Union[Optional[np.ndarray], Tuple[Optional[np.ndarray], str]]:
    """
    Returns a float32 mask in [0,1] (H x W, same size as the result) or None if the
    garment region cannot be isolated reliably.
    """
    # 0. Context & Paths
    if output_dir is None:
        try:
            from backend.config import get_settings
            output_dir = get_settings().OUTPUT_DIR
        except Exception:
            output_dir = os.path.dirname(result_path) or "."
    if debug is None:
        try:
            from backend.config import get_settings
            debug = bool(get_settings().DEBUG)
        except Exception:
            debug = True
    if job_id is None:
        base_name = os.path.basename(result_path)
        m = re.search(r"(req_[0-9a-f]{8})", base_name)
        job_id = m.group(1) if m else os.path.splitext(base_name)[0]

    result = np.array(Image.open(result_path).convert("RGB"))
    h, w = result.shape[:2]

    person_size = None
    if os.path.isfile(person_path):
        try:
            with Image.open(person_path) as p_img:
                person_size = p_img.size
        except Exception:
            pass

    masked_size = None
    masked_mode = None
    m_min = m_max = 0
    m_mean = 0.0
    m_unique = 0
    frac_128 = 0.0
    is_bw = False
    frac_bw = 0.0

    bw_zone = None
    grey_zone = None
    masked_candidate = None

    # 1. Masked image inspection & candidates (Black/White and 128-grey)
    if masked_path and os.path.isfile(masked_path):
        try:
            with Image.open(masked_path) as m_img:
                masked_size = m_img.size
                masked_mode = m_img.mode
                m_raw = m_img.copy()

            m_arr = np.array(m_raw)
            m_min = int(m_arr.min())
            m_max = int(m_arr.max())
            m_mean = round(float(m_arr.mean()), 2)
            m_unique = len(np.unique(m_arr))

            # Fraction with |v - 128| <= 6
            if m_arr.ndim == 3:
                frac_128 = round(float((np.abs(m_arr.astype(np.int16) - 128) <= 6).all(axis=-1).mean()), 4)
            else:
                frac_128 = round(float((np.abs(m_arr.astype(np.int16) - 128) <= 6).mean()), 4)

            # Check if effectively binary (>90% within 10 of 0 or 255)
            m_gray_full = np.array(m_raw.convert("L"))
            frac_bw = float(((m_gray_full <= 10) | (m_gray_full >= 245)).mean())
            is_bw = frac_bw > 0.90

            # Log masked image stats
            logger.info(
                "[derive_garment_mask] job=%s | result_size=%s, person_size=%s, masked_file_size=%s, masked_mode=%s",
                job_id, (w, h), person_size, masked_size, masked_mode
            )
            logger.info(
                "[derive_garment_mask] job=%s | masked_stats: min=%d, max=%d, mean=%.2f, unique=%d, frac_128=%.4f, is_bw=%s (frac_bw=%.4f)",
                job_id, m_min, m_max, m_mean, m_unique, frac_128, is_bw, frac_bw
            )

            # Step 2: Handle Black/White Masks
            if is_bw:
                m_gray_res = np.array(m_raw.convert("L").resize((w, h), Image.NEAREST))
                cand_white = m_gray_res >= 200
                cand_black = m_gray_res <= 55
                bw_zone, bw_reason = _pick_binary_candidate(cand_white, cand_black, category)
                logger.info("[derive_garment_mask] Binary mask candidate selection: %s", bw_reason)
                if bw_zone is not None:
                    masked_candidate = bw_zone

            # 128-grey candidate (keep existing logic as another candidate)
            # Check if masked file is simply a duplicate of result image
            m_rgb_res = np.array(m_raw.convert("RGB").resize((w, h), Image.NEAREST))
            is_duplicate_of_result = (np.abs(m_rgb_res.astype(np.int16) - result.astype(np.int16)).mean() < 3.0)

            if not is_duplicate_of_result and not is_bw:
                gz_cand = (np.abs(m_rgb_res.astype(np.int16) - 128) <= 6).all(axis=2)
                frac_gz = float(gz_cand.mean())
                if 0.02 <= frac_gz <= 0.70:
                    grey_zone = gz_cand
                    logger.info("[derive_garment_mask] 128-grey zone accepted with coverage=%.4f", frac_gz)
                    if masked_candidate is None:
                        masked_candidate = grey_zone
                else:
                    logger.info("[derive_garment_mask] 128-grey zone rejected (coverage=%.4f)", frac_gz)

        except Exception as e:
            logger.warning("[derive_garment_mask] Failed to inspect masked file: %s", e)
    else:
        logger.info(
            "[derive_garment_mask] job=%s | result_size=%s, person_size=%s, masked_file=None",
            job_id, (w, h), person_size
        )

    # Step 3: Fix the diff fallback
    diff_zone = None
    if not cropped and os.path.isfile(person_path):
        try:
            with Image.open(person_path) as p_img:
                w_p, h_p = p_img.size
                ar_p = w_p / h_p
                ar_r = w / h
                # Direct resize the same way IDM-VTON does when crop=False
                p_resized = p_img.convert("RGB").resize((w, h), Image.LANCZOS)
                person_arr = np.array(p_resized)

            d_raw = np.abs(result.astype(np.int16) - person_arr.astype(np.int16)).max(axis=2)

            # Alignment check on peripheral regions (head/top 12% and side 5% margins)
            align_mask = np.zeros((h, w), dtype=bool)
            align_mask[:int(0.12 * h), :] = True
            align_mask[:, :int(0.05 * w)] = True
            align_mask[:, int(0.95 * w):] = True
            align_error = float(d_raw[align_mask].mean())

            logger.info(
                "[derive_garment_mask] Diff alignment check: ar_p=%.4f, ar_r=%.4f, align_error=%.2f",
                ar_p, ar_r, align_error
            )

            # If background/head does not align, skip diff signal
            if align_error > 25.0:
                logger.info("[derive_garment_mask] Person image does not align with result (align_error=%.2f > 25.0); skipping diff signal", align_error)
            else:
                d = cv2.GaussianBlur(d_raw.astype(np.float32), (0, 0), 3)
                dz = d > 18
                dz_cov = float(dz.mean())
                if 0.015 <= dz_cov <= 0.70:
                    diff_zone = dz
                    logger.info("[derive_garment_mask] Diff zone accepted with coverage=%.4f", dz_cov)
                else:
                    logger.info("[derive_garment_mask] Diff zone rejected: coverage=%.4f out of [0.015, 0.70]", dz_cov)
        except Exception as e:
            logger.warning("[derive_garment_mask] Failed to compute diff zone: %s", e)

    # Combine signals
    binary = None
    if masked_candidate is not None and diff_zone is not None:
        dilated_diff = cv2.dilate(diff_zone.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
        comb = masked_candidate & dilated_diff
        if comb.mean() >= 0.01:
            binary = comb
        else:
            binary = masked_candidate
    elif masked_candidate is not None:
        binary = masked_candidate
    elif diff_zone is not None:
        binary = diff_zone

    branch_hit = None
    if binary is not None:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        binary = cv2.morphologyEx(binary.astype(np.uint8), cv2.MORPH_OPEN, k)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        binary = _largest_components(binary.astype(bool))

        # Step 5: Loosen skin removal (only head/neck/hand peripheral areas)
        binary = _remove_skin_peripheral(binary, result, category)

        cov = float(binary.mean())
        if cov < 0.015 or cov > 0.70:
            branch_hit = f"primary_signals_cov_out_of_bounds ({cov:.4f})"
            binary = None
        else:
            branch_hit = "primary_signals_succeeded"

    # Step 4: Add last-resort fallback (GrabCut)
    if binary is None:
        logger.info("[derive_garment_mask] Primary signals yielded no valid mask. Invoking GrabCut last-resort fallback...")
        gc_mask, gc_reason = _grabcut_fallback(result, category)
        if gc_mask is not None:
            binary = gc_mask
            branch_hit = "grabcut_fallback_succeeded"
        else:
            branch_hit = f"grabcut_fallback_failed ({gc_reason})"

    # Fractions for reporting
    grey_zone_frac = float(grey_zone.mean()) if grey_zone is not None else (float(bw_zone.mean()) if bw_zone is not None else None)
    diff_zone_frac = float(diff_zone.mean()) if diff_zone is not None else None
    final_coverage = round(float(binary.mean()), 4) if binary is not None else 0.0

    # Save debug images when DEBUG is True
    if debug and output_dir and os.path.isdir(output_dir):
        try:
            # dbg_grey
            dbg_grey_arr = (grey_zone * 255).astype(np.uint8) if grey_zone is not None else (
                (bw_zone * 255).astype(np.uint8) if bw_zone is not None else np.zeros((h, w), dtype=np.uint8)
            )
            Image.fromarray(dbg_grey_arr, "L").save(os.path.join(output_dir, f"{job_id}_dbg_grey.png"))

            # dbg_diff
            dbg_diff_arr = (diff_zone * 255).astype(np.uint8) if diff_zone is not None else np.zeros((h, w), dtype=np.uint8)
            Image.fromarray(dbg_diff_arr, "L").save(os.path.join(output_dir, f"{job_id}_dbg_diff.png"))

            # dbg_final
            dbg_final_arr = (binary * 255).astype(np.uint8) if binary is not None else np.zeros((h, w), dtype=np.uint8)
            Image.fromarray(dbg_final_arr, "L").save(os.path.join(output_dir, f"{job_id}_dbg_final.png"))
        except Exception as dbg_err:
            logger.warning("[derive_garment_mask] Failed to save debug images: %s", dbg_err)

    logger.info(
        "[derive_garment_mask] job=%s | signals: grey_zone_frac=%s, diff_zone_frac=%s, final_coverage=%.4f, branch_hit=%s",
        job_id,
        f"{grey_zone_frac:.4f}" if grey_zone_frac is not None else "None",
        f"{diff_zone_frac:.4f}" if diff_zone_frac is not None else "None",
        final_coverage,
        branch_hit
    )

    if binary is None:
        failure_reason = branch_hit or "unable to isolate garment region"
        if return_reason:
            return None, failure_reason
        return None

    binary = cv2.erode(binary.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    soft = cv2.GaussianBlur(binary.astype(np.float32), (0, 0), 1.6)
    out_mask = np.clip(soft, 0.0, 1.0)

    if return_reason:
        return out_mask, "success"
    return out_mask


# ---------------------------------------------------------------------------
# 2. Parameter resolution
# ---------------------------------------------------------------------------

def default_customization() -> Dict[str, Any]:
    return {
        "color": {"hex": None, "strength": 100},
        "fit": "regular",
        "garment_size": None,
        "length": 0,
        "use_profile": False,
        "profile": {},
        "adjust": {
            "brightness": 0, "contrast": 0, "saturation": 0,
            "warmth": 0, "sharpness": 0, "scope": "garment",
        },
    }


def resolve_params(raw: Optional[Dict[str, Any]], category: str = "upper_body") -> Dict[str, Any]:
    """
    Validates & clamps a customization dict and computes the effective geometry.
    Returns a dict containing the cleaned params plus 'sx', 'sy' and 'summary'.
    """
    base = default_customization()
    raw = raw or {}

    color_raw = raw.get("color") or {}
    hex_val = color_raw.get("hex")
    if hex_val:
        if not HEX_RE.match(str(hex_val).strip()):
            raise ValueError(f"Invalid colour '{hex_val}'. Use a hex value like #C0392B.")
        hex_val = "#" + HEX_RE.match(str(hex_val).strip()).group(1).upper()
    else:
        hex_val = None
    color = {"hex": hex_val, "strength": _clamp(color_raw.get("strength", 100), 0, 100, 100)}

    fit = str(raw.get("fit") or "regular").lower()
    if fit not in FIT_WIDTH:
        raise ValueError(f"Invalid fit '{fit}'. Allowed: {', '.join(FIT_WIDTH)}.")

    garment_size = _norm_size(raw.get("garment_size"))
    length = _clamp(raw.get("length", 0), -15, 15, 0)

    adj_raw = raw.get("adjust") or {}
    scope = str(adj_raw.get("scope") or "garment").lower()
    if scope not in ("garment", "image"):
        scope = "garment"
    adjust = {
        "brightness": _clamp(adj_raw.get("brightness", 0), -50, 50),
        "contrast": _clamp(adj_raw.get("contrast", 0), -50, 50),
        "saturation": _clamp(adj_raw.get("saturation", 0), -100, 100),
        "warmth": _clamp(adj_raw.get("warmth", 0), -50, 50),
        "sharpness": _clamp(adj_raw.get("sharpness", 0), 0, 100),
        "scope": scope,
    }

    use_profile = bool(raw.get("use_profile", False))
    prof_raw = raw.get("profile") or {}
    profile = {
        "height_cm": _clamp(prof_raw.get("height_cm", 0), 0, 260, 0) or None,
        "chest_cm": _clamp(prof_raw.get("chest_cm", 0), 0, 250, 0) or None,
        "waist_cm": _clamp(prof_raw.get("waist_cm", 0), 0, 250, 0) or None,
        "hip_cm": _clamp(prof_raw.get("hip_cm", 0), 0, 250, 0) or None,
        "preferred_size": _norm_size(prof_raw.get("preferred_size")),
    }

    summary: List[str] = []

    # --- body size (the size this person actually is) -------------------------
    body_size = None
    body_src = ""
    if use_profile:
        if category == "lower_body":
            body_size = _size_from_bands(profile["waist_cm"], _WAIST_BANDS)
            body_src = f"waist {profile['waist_cm']:g} cm" if body_size else ""
        else:
            body_size = _size_from_bands(profile["chest_cm"], _CHEST_BANDS)
            body_src = f"chest {profile['chest_cm']:g} cm" if body_size else ""
        if body_size is None and profile["preferred_size"]:
            body_size, body_src = profile["preferred_size"], "preferred size"
    if body_size is None:
        body_size = "M"
        body_src = "default M"

    # --- width ----------------------------------------------------------------
    size_ratio = 1.0
    if garment_size:
        size_ratio = SIZE_WIDTH[garment_size] / SIZE_WIDTH[body_size]
        if abs(size_ratio - 1.0) > 0.001:
            summary.append(f"Size {garment_size} garment on {body_size} body ({body_src}): width ×{size_ratio:.2f}")
    sx = size_ratio * FIT_WIDTH[fit]
    if fit != "regular":
        summary.append(f"{fit.capitalize()} fit: width ×{FIT_WIDTH[fit]:.2f}")
    sx = max(WIDTH_MIN, min(WIDTH_MAX, sx))

    # --- length ---------------------------------------------------------------
    height_factor = 1.0
    if use_profile and profile["height_cm"]:
        height_factor = max(0.92, min(1.08, REFERENCE_HEIGHT_CM / profile["height_cm"]))
        if abs(height_factor - 1.0) > 0.002:
            summary.append(f"Height {profile['height_cm']:g} cm: length ×{height_factor:.2f}")
    sy = (1.0 + length / 100.0) * height_factor * FIT_LENGTH[fit]
    if length:
        summary.append(f"Length {length:+g}%")
    sy = max(LENGTH_MIN, min(LENGTH_MAX, sy))

    if color["hex"]:
        summary.append(f"Colour {color['hex']} at {color['strength']:g}%")
    for key, label in (("brightness", "Brightness"), ("contrast", "Contrast"),
                       ("saturation", "Saturation"), ("warmth", "Warmth"),
                       ("sharpness", "Sharpness")):
        if adjust[key]:
            summary.append(f"{label} {adjust[key]:+g} ({adjust['scope']})")

    cleaned = {
        "color": color, "fit": fit, "garment_size": garment_size, "length": length,
        "use_profile": use_profile, "profile": profile, "adjust": adjust,
    }
    return {
        "params": cleaned,
        "sx": round(sx, 4),
        "sy": round(sy, 4),
        "body_size": body_size,
        "summary": summary,
        "is_noop": (not summary),
        "needs_mask": bool(color["hex"] or abs(sx - 1) > 0.004 or abs(sy - 1) > 0.004
                           or (adjust["scope"] == "garment" and any(
                               adjust[k] for k in ("brightness", "contrast", "saturation", "warmth", "sharpness")))),
    }


def customization_digest(resolved: Dict[str, Any]) -> str:
    blob = json.dumps(resolved["params"], sort_keys=True, default=str)
    return hashlib.sha1(blob.encode()).hexdigest()[:10]


# ---------------------------------------------------------------------------
# 3. Rendering
# ---------------------------------------------------------------------------

def _warp_garment(img: np.ndarray, mask: np.ndarray, sx: float, sy: float) -> Tuple[np.ndarray, np.ndarray]:
    """Scale the garment layer about its horizontal centre / top edge and composite."""
    h, w = mask.shape
    ys, xs = np.nonzero(mask > 0.5)
    if len(xs) == 0:
        return img, mask
    cx = float(xs.mean())
    top = float(ys.min())
    # anchor slightly below the top edge so shoulders / waistband stay put
    y0 = top + 0.05 * (ys.max() - top)

    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    map_x = (cx + (gx - cx) / sx).astype(np.float32)
    map_y = (y0 + (gy - y0) / sy).astype(np.float32)

    layer = (img.astype(np.float32) * mask[..., None])
    layer_w = cv2.remap(layer, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    mask_w = cv2.remap(mask.astype(np.float32), map_x, map_y, cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    mask_w = np.clip(mask_w, 0, 1)

    # Fill whatever the garment used to cover but no longer does. Inpaint the WHOLE old
    # garment region from pixels outside it (background / skin / other clothing) so dark
    # garment edges never smear into the exposed strips; the new garment is drawn on top.
    exposed = np.clip(mask - mask_w, 0, 1)
    base = img
    if (exposed > 0.08).any():
        unknown = cv2.dilate((mask > 0.03).astype(np.uint8), np.ones((9, 9), np.uint8))
        base = cv2.inpaint(img, unknown * 255, 8, cv2.INPAINT_TELEA)

    out = base.astype(np.float32) * (1 - mask_w[..., None]) + layer_w
    return np.clip(out, 0, 255).astype(np.uint8), mask_w


def _colorize(img: np.ndarray, mask: np.ndarray, hex_color: str, strength: float) -> np.ndarray:
    r, g, b = _hex_to_rgb(hex_color)
    t_hsv = cv2.cvtColor(np.array([[[r, g, b]]], dtype=np.uint8), cv2.COLOR_RGB2HSV)[0, 0].astype(np.float32)
    t_h, t_s, t_v = t_hsv[0], t_hsv[1] / 255.0, t_hsv[2] / 255.0

    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV).astype(np.float32)
    v = hsv[..., 2] / 255.0
    s = hsv[..., 1] / 255.0

    sel = mask > 0.5
    med_v = float(np.median(v[sel])) if sel.any() else 0.5

    # Preserve shading (folds, shadows) but move the garment's overall brightness to the
    # target's. Black tees become dark-but-visibly-coloured, white tees take on the tint.
    target_v = float(np.clip(t_v, 0.18, 0.95))
    ratio = (v + 0.05) / (med_v + 0.05)          # +0.05 damps sensor/JPEG noise in dark fabric
    v_new = np.clip(target_v * np.power(ratio, 0.6), 0, 1)

    s_new = np.full_like(s, t_s)
    s_new = s_new * (1.0 - 0.55 * np.clip((v_new - 0.85) / 0.15, 0, 1))  # keep highlights bright

    out_hsv = np.stack([np.full_like(v, t_h), s_new * 255.0, v_new * 255.0], axis=-1)
    recol = cv2.cvtColor(np.clip(out_hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB)

    # Keep prints / logos / trims: pixels whose colour is far from the garment's base fabric
    # colour are only lightly recoloured.
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB).astype(np.float32)
    base_lab = np.median(lab[sel], axis=0) if sel.any() else lab.reshape(-1, 3).mean(axis=0)
    d = np.sqrt((0.6 * (lab[..., 0] - base_lab[0]) * 100.0 / 255.0) ** 2
                + (lab[..., 1] - base_lab[1]) ** 2 + (lab[..., 2] - base_lab[2]) ** 2)
    t = np.clip((d - 22.0) / 30.0, 0, 1)
    keep_print = t * t * (3 - 2 * t)  # smoothstep
    alpha = (mask * (strength / 100.0) * (1.0 - 0.9 * keep_print))[..., None]
    return np.clip(img.astype(np.float32) * (1 - alpha) + recol.astype(np.float32) * alpha, 0, 255).astype(np.uint8)


def _finish(img: np.ndarray, adj: Dict[str, Any]) -> np.ndarray:
    out = img.astype(np.float32)

    if adj["brightness"]:
        out *= 1.0 + adj["brightness"] / 100.0
    if adj["contrast"]:
        out = (out - 128.0) * (1.0 + adj["contrast"] / 100.0) + 128.0
    out = np.clip(out, 0, 255)

    if adj["saturation"]:
        hsv = cv2.cvtColor(out.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[..., 1] = np.clip(hsv[..., 1] * (1.0 + adj["saturation"] / 100.0), 0, 255)
        out = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)

    if adj["warmth"]:
        shift = adj["warmth"] * 0.4
        out[..., 0] += shift
        out[..., 2] -= shift
        out = np.clip(out, 0, 255)

    if adj["sharpness"]:
        amount = adj["sharpness"] / 100.0 * 1.6
        blur = cv2.GaussianBlur(out, (0, 0), 1.4)
        out = np.clip(out + (out - blur) * amount, 0, 255)

    return out.astype(np.uint8)


def render_customization(
    base_path: str,
    mask: Optional[np.ndarray],
    resolved: Dict[str, Any],
    mask_failure_reason: Optional[str] = None,
) -> Tuple[Image.Image, List[str], List[str]]:
    """
    Applies a resolved customization to the base result.
    Returns (image, applied_labels, warnings).
    """
    img = np.array(Image.open(base_path).convert("RGB"))
    p = resolved["params"]
    applied: List[str] = []
    warnings: List[str] = []

    if mask is not None and mask.shape != img.shape[:2]:
        mask = cv2.resize(mask, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)

    garment_ops_requested = resolved["needs_mask"]
    if garment_ops_requested and mask is None:
        reason_msg = f" ({mask_failure_reason})" if mask_failure_reason else ""
        warnings.append(
            f"The garment area could not be isolated{reason_msg}, so colour, fit and "
            "garment-only adjustments were skipped. Try again with a clearer full-body photo."
        )

    cur_mask = mask

    # 1. Geometry (size / fit / length)
    sx, sy = resolved["sx"], resolved["sy"]
    if cur_mask is not None and (abs(sx - 1) > 0.004 or abs(sy - 1) > 0.004):
        img, cur_mask = _warp_garment(img, cur_mask, sx, sy)
        applied.append(f"Fit: width ×{sx:.2f}, length ×{sy:.2f}")

    # 2. Colour
    if cur_mask is not None and p["color"]["hex"] and p["color"]["strength"] > 0:
        img = _colorize(img, cur_mask, p["color"]["hex"], p["color"]["strength"])
        applied.append(f"Colour {p['color']['hex']} ({p['color']['strength']:g}%)")

    # 3. Finishing
    adj = p["adjust"]
    if any(adj[k] for k in ("brightness", "contrast", "saturation", "warmth", "sharpness")):
        if adj["scope"] == "image":
            img = _finish(img, adj)
            applied.append("Finishing applied to whole image")
        elif cur_mask is not None:
            finished = _finish(img, adj)
            a = cur_mask[..., None]
            img = np.clip(img.astype(np.float32) * (1 - a) + finished.astype(np.float32) * a, 0, 255).astype(np.uint8)
            applied.append("Finishing applied to garment")

    return Image.fromarray(img), applied, warnings
