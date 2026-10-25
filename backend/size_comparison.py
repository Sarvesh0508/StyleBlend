"""
Size Comparison Module
Provides honest, transparent dimensional comparison between customer body measurements
and garment physical measurements.

DISCLAIMER:
- Compares supplied dimensional measurements only.
- Does NOT guarantee fit or replace professional tailoring.
- Does NOT influence IDM-VTON neural virtual try-on inference.
- Customer height is displayed as visual context only and is NEVER treated as a substitute for body girth measurements.
"""

from typing import Dict, Any, Optional, List


def to_cm(val: Optional[float], unit: str) -> Optional[float]:
    """Converts a measurement to centimeters."""
    if val is None:
        return None
    try:
        f = float(val)
        if f <= 0:
            return None
        if unit.lower() in ("in", "inch", "inches"):
            return round(f * 2.54, 1)
        return round(f, 1)
    except (ValueError, TypeError):
        return None


def classify_ease(delta_cm: float) -> Dict[str, str]:
    """
    Classifies the ease (garment measurement - body measurement in cm).
    Positive delta means garment is larger than the body (ease).
    Negative delta means garment is smaller than the body (compression/undersized).
    """
    if delta_cm < -2.0:
        return {
            "status": "tight",
            "label": "Tight / Restrictive",
            "description": f"Garment is {abs(delta_cm):.1f} cm smaller than body measurement. May feel tight."
        }
    elif -2.0 <= delta_cm < 0.0:
        return {
            "status": "snug",
            "label": "Snug / Compressive",
            "description": f"Garment is {abs(delta_cm):.1f} cm smaller than body measurement. Very close body-con fit."
        }
    elif 0.0 <= delta_cm < 3.0:
        return {
            "status": "fitted",
            "label": "Fitted / Minimal Ease",
            "description": f"+{delta_cm:.1f} cm ease. Tailored silhouette with minimal extra room."
        }
    elif 3.0 <= delta_cm <= 8.0:
        return {
            "status": "regular",
            "label": "Regular / Standard Fit",
            "description": f"+{delta_cm:.1f} cm ease. Standard comfortable ease allowing normal movement."
        }
    elif 8.0 < delta_cm <= 15.0:
        return {
            "status": "relaxed",
            "label": "Relaxed / Easy Fit",
            "description": f"+{delta_cm:.1f} cm ease. Generous ease with roomier drape."
        }
    else:
        return {
            "status": "oversized",
            "label": "Oversized / Voluminous",
            "description": f"+{delta_cm:.1f} cm ease. Distinctly oversized proportion."
        }


def compare_measurements(
    customer_measurements: Dict[str, Any],
    garment_measurements: Dict[str, Any],
    garment_category: str = "upper_body",
    garment_size: Optional[str] = None,
    customer_height: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Compares customer body measurements with garment measurements.
    Returns conclusive analysis if at least one key dimension can be matched,
    or clearly reports inconclusive if measurements are missing.
    """
    cust_unit = customer_measurements.get("unit", "cm")
    garm_unit = garment_measurements.get("unit", "cm")

    cust_chest = to_cm(customer_measurements.get("chest"), cust_unit)
    cust_waist = to_cm(customer_measurements.get("waist"), cust_unit)
    cust_hip   = to_cm(customer_measurements.get("hip"), cust_unit)

    garm_chest  = to_cm(garment_measurements.get("chest"), garm_unit)
    garm_waist  = to_cm(garment_measurements.get("waist"), garm_unit)
    garm_hip    = to_cm(garment_measurements.get("hip"), garm_unit)
    garm_length = to_cm(garment_measurements.get("length"), garm_unit)

    comparisons: List[Dict[str, Any]] = []

    # 1. Chest Comparison (Primary for upper_body and dresses)
    if cust_chest is not None and garm_chest is not None:
        delta = round(garm_chest - cust_chest, 1)
        ease = classify_ease(delta)
        comparisons.append({
            "dimension": "Chest / Bust",
            "customer_cm": cust_chest,
            "garment_cm": garm_chest,
            "delta_cm": delta,
            "status": ease["status"],
            "label": ease["label"],
            "description": ease["description"]
        })

    # 2. Waist Comparison (Relevant for upper_body, lower_body, dresses)
    if cust_waist is not None and garm_waist is not None:
        delta = round(garm_waist - cust_waist, 1)
        ease = classify_ease(delta)
        comparisons.append({
            "dimension": "Waist",
            "customer_cm": cust_waist,
            "garment_cm": garm_waist,
            "delta_cm": delta,
            "status": ease["status"],
            "label": ease["label"],
            "description": ease["description"]
        })

    # 3. Hip Comparison (Relevant for lower_body and dresses)
    if cust_hip is not None and garm_hip is not None:
        delta = round(garm_hip - cust_hip, 1)
        ease = classify_ease(delta)
        comparisons.append({
            "dimension": "Hips",
            "customer_cm": cust_hip,
            "garment_cm": garm_hip,
            "delta_cm": delta,
            "status": ease["status"],
            "label": ease["label"],
            "description": ease["description"]
        })

    # Length context (garment length alone cannot be subtracted from body circumference)
    length_info = None
    if garm_length is not None:
        length_info = {
            "garment_length_cm": garm_length,
            "notes": "Garment vertical length from shoulder/waist. Compare with personal torso/leg length preferences."
        }

    # Height context note
    height_display = None
    if customer_height and customer_height.get("value"):
        h_unit = customer_height.get("unit", "cm")
        height_display = f"{customer_height['value']} {h_unit}"

    is_conclusive = len(comparisons) > 0

    if not is_conclusive:
        missing = []
        if cust_chest is None and garm_chest is None:
            missing.append("chest/bust")
        if cust_waist is None and garm_waist is None:
            missing.append("waist")
        if cust_hip is None and garm_hip is None:
            missing.append("hip")
        summary = (
            "Comparison inconclusive: Insufficient matching measurement data. "
            "Please supply both customer body measurements and garment dimensions."
        )
    else:
        # Determine overall ease summary
        statuses = [c["status"] for c in comparisons]
        if any(s in ("tight", "snug") for s in statuses):
            summary = "Close fit alert: One or more garment dimensions are snug or smaller than your measurements."
        elif all(s == "regular" for s in statuses):
            summary = "Balanced regular fit: Garment measurements provide standard comfortable ease across compared areas."
        elif any(s in ("relaxed", "oversized") for s in statuses):
            summary = "Relaxed fit: Garment measurements provide generous ease."
        else:
            summary = "Measurements compared successfully. Review individual dimensions for detailed ease."

    return {
        "conclusive": is_conclusive,
        "summary": summary,
        "comparisons": comparisons,
        "length_info": length_info,
        "garment_size": garment_size,
        "garment_category": garment_category,
        "customer_height_context": height_display,
        "disclaimer": (
            "This size comparison evaluates provided physical dimensions only. "
            "It does not guarantee fit or alter IDM-VTON neural try-on inference. "
            "Height is visual context and not a substitute for body circumference."
        )
    }
