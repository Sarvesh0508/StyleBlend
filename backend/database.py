import sqlite3
import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("database")


def get_db_connection(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str):
    """Initializes SQLite schema for persistent saved looks and wardrobe items."""
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Saved looks table (Phase A)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_looks (
                id TEXT PRIMARY KEY,
                result_filename TEXT NOT NULL,
                result_url TEXT NOT NULL,
                original_person TEXT,
                garment_person TEXT,
                category TEXT,
                description TEXT,
                execution_time REAL,
                mode TEXT,
                created_at TEXT NOT NULL
            )
        """)

        # Digital wardrobe items table (Phase B & C)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wardrobe_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                color TEXT,
                style TEXT,
                size TEXT,
                brand TEXT,
                notes TEXT,
                image_filename TEXT NOT NULL,
                image_url TEXT NOT NULL,
                price REAL,
                meas_chest REAL,
                meas_waist REAL,
                meas_hip REAL,
                meas_length REAL,
                meas_unit TEXT DEFAULT 'cm',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                times_used INTEGER DEFAULT 0
            )
        """)
        conn.commit()
    logger.info("Database initialized successfully at %s", db_path)


# ---------------------------------------------------------------------------
# Saved Looks CRUD
# ---------------------------------------------------------------------------

def insert_saved_look(db_path: str, look: Dict[str, Any]) -> Dict[str, Any]:
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO saved_looks (
                id, result_filename, result_url, original_person, garment_person,
                category, description, execution_time, mode, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            look["id"],
            look["result_filename"],
            look["result_url"],
            look.get("original_person"),
            look.get("garment_person"),
            look.get("category"),
            look.get("description"),
            look.get("execution_time"),
            look.get("mode"),
            look["created_at"],
        ))
        conn.commit()
    return look


def get_all_saved_looks(db_path: str) -> List[Dict[str, Any]]:
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM saved_looks ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_saved_look_by_id(db_path: str, look_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM saved_looks WHERE id = ?", (look_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_saved_look(db_path: str, look_id: str) -> Optional[str]:
    """Deletes a saved look and returns its result_filename if found."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT result_filename FROM saved_looks WHERE id = ?", (look_id,))
        row = cursor.fetchone()
        if not row:
            return None
        filename = row["result_filename"]
        cursor.execute("DELETE FROM saved_looks WHERE id = ?", (look_id,))
        conn.commit()
        return filename


# ---------------------------------------------------------------------------
# Digital Wardrobe CRUD
# ---------------------------------------------------------------------------

def insert_wardrobe_item(db_path: str, item: Dict[str, Any]) -> Dict[str, Any]:
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO wardrobe_items (
                id, name, category, color, style, size, brand, notes,
                image_filename, image_url, price,
                meas_chest, meas_waist, meas_hip, meas_length, meas_unit,
                created_at, updated_at, times_used
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["id"],
            item["name"],
            item["category"],
            item.get("color", ""),
            item.get("style", ""),
            item.get("size", "M"),
            item.get("brand", ""),
            item.get("notes", ""),
            item["image_filename"],
            item["image_url"],
            item.get("price"),
            item.get("meas_chest"),
            item.get("meas_waist"),
            item.get("meas_hip"),
            item.get("meas_length"),
            item.get("meas_unit", "cm"),
            item["created_at"],
            item["updated_at"],
            item.get("times_used", 0)
        ))
        conn.commit()
    return item


def get_all_wardrobe_items(db_path: str) -> List[Dict[str, Any]]:
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM wardrobe_items ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_wardrobe_item_by_id(db_path: str, item_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM wardrobe_items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_wardrobe_item(db_path: str, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    allowed_fields = [
        "name", "category", "color", "style", "size", "brand", "notes",
        "image_filename", "image_url", "price",
        "meas_chest", "meas_waist", "meas_hip", "meas_length", "meas_unit",
        "updated_at", "times_used"
    ]
    set_clause = []
    values = []
    for field in allowed_fields:
        if field in updates:
            set_clause.append(f"{field} = ?")
            values.append(updates[field])
            
    if not set_clause:
        return get_wardrobe_item_by_id(db_path, item_id)
        
    values.append(item_id)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE wardrobe_items SET {', '.join(set_clause)} WHERE id = ?", tuple(values))
        conn.commit()
        
    return get_wardrobe_item_by_id(db_path, item_id)


def delete_wardrobe_item(db_path: str, item_id: str) -> Optional[str]:
    """Deletes a wardrobe item and returns its image_filename."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT image_filename FROM wardrobe_items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            return None
        filename = row["image_filename"]
        cursor.execute("DELETE FROM wardrobe_items WHERE id = ?", (item_id,))
        conn.commit()
        return filename


# ---------------------------------------------------------------------------
# Cross-Reference Safety: Protect Images Referenced Elsewhere
# ---------------------------------------------------------------------------

def is_image_referenced_elsewhere(
    db_path: str,
    filename: str,
    exclude_saved_look_id: Optional[str] = None,
    exclude_wardrobe_id: Optional[str] = None
) -> bool:
    """
    Checks whether `filename` is still referenced by any saved look or wardrobe item.
    Prevents accidental deletion of shared/referenced image assets.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Check saved looks
        if exclude_saved_look_id:
            cursor.execute(
                "SELECT COUNT(*) FROM saved_looks WHERE result_filename = ? AND id != ?",
                (filename, exclude_saved_look_id)
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM saved_looks WHERE result_filename = ?", (filename,))
        if cursor.fetchone()[0] > 0:
            return True
            
        # Check wardrobe items
        if exclude_wardrobe_id:
            cursor.execute(
                "SELECT COUNT(*) FROM wardrobe_items WHERE image_filename = ? AND id != ?",
                (filename, exclude_wardrobe_id)
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM wardrobe_items WHERE image_filename = ?", (filename,))
        if cursor.fetchone()[0] > 0:
            return True

    return False


def get_all_protected_filenames(db_path: str) -> set:
    """Returns all filenames currently referenced in saved_looks or wardrobe_items."""
    protected = set()
    if not os.path.exists(db_path):
        return protected
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT result_filename FROM saved_looks")
            for row in cursor.fetchall():
                if row[0]:
                    protected.add(row[0])
            cursor.execute("SELECT image_filename FROM wardrobe_items")
            for row in cursor.fetchall():
                if row[0]:
                    protected.add(row[0])
    except Exception as e:
        logger.error("Error retrieving protected filenames: %s", e)
    return protected
