"""
SILVER LAYER — Nettoyage, normalisation & jointure spatiale
KPI : Accessibilité transport par rue

Entrée  : data/bronze/voies_paris_raw.json
          data/bronze/gares_idf_raw.json

Sortie  : data/silver/voies_clean.geojson
          data/silver/gares_clean.geojson
          data/silver/voies_gares_joined.geojson

Logique silver :
  - Voies  : garder id, nom, longueur, géométrie LineString/MultiLineString
  - Gares  : garder id, nom, modes, coordonnées (Point)
  - Jointure : pour chaque rue, lister les gares à moins de 300 m de la géométrie réelle
"""

import json
import os
import logging
import math
import hashlib
from datetime import datetime
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SILVER] %(levelname)s — %(message)s"
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(__file__)
BRONZE_DIR = os.path.abspath(os.path.join(BASE_DIR, "../bronze"))
SILVER_DIR = os.path.abspath(os.path.join(BASE_DIR, "."))
os.makedirs(SILVER_DIR, exist_ok=True)

RADIUS_M = 300

MODE_WEIGHTS = {
    "RER": 3,
    "TRAIN": 3,
    "METRO": 2,
    "TRAM": 1,
    "VAL": 1,
}


def safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


# ── Utilitaires géospatiaux ───────────────────────────────────────────────────

def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Distance en mètres entre deux points WGS84."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


def lonlat_to_local_xy_m(lon: float, lat: float, ref_lat: float) -> tuple[float, float]:
    """
    Conversion approchée lon/lat → x/y en mètres.
    Suffisant pour des distances locales à l’échelle de Paris.
    """
    R = 6_371_000
    x = math.radians(lon) * R * math.cos(math.radians(ref_lat))
    y = math.radians(lat) * R
    return x, y


def point_segment_distance_m(
    px: float, py: float,
    ax: float, ay: float,
    bx: float, by: float
) -> float:
    """Distance minimale entre un point P et un segment AB en mètres."""
    dx = bx - ax
    dy = by - ay

    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)

    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))

    proj_x = ax + t * dx
    proj_y = ay + t * dy

    return math.hypot(px - proj_x, py - proj_y)


def point_linestring_distance_m(lon: float, lat: float, coords: list) -> float:
    """
    Distance minimale entre un point (gare) et une ligne (rue),
    en parcourant tous les segments de la géométrie.
    """
    if len(coords) < 2:
        return float("inf")

    ref_lat = lat
    px, py = lonlat_to_local_xy_m(lon, lat, ref_lat)

    min_dist = float("inf")

    for i in range(len(coords) - 1):
        lon1, lat1 = coords[i][0], coords[i][1]
        lon2, lat2 = coords[i + 1][0], coords[i + 1][1]

        ax, ay = lonlat_to_local_xy_m(lon1, lat1, ref_lat)
        bx, by = lonlat_to_local_xy_m(lon2, lat2, ref_lat)

        dist = point_segment_distance_m(px, py, ax, ay, bx, by)
        if dist < min_dist:
            min_dist = dist

    return min_dist


def linestring_length_km(coords: list) -> float:
    """Longueur d'une ligne en km."""
    total = 0.0
    for i in range(len(coords) - 1):
        lon1, lat1 = coords[i][0], coords[i][1]
        lon2, lat2 = coords[i + 1][0], coords[i + 1][1]
        total += haversine_m(lon1, lat1, lon2, lat2)
    return total / 1000.0


def centroid_of_linestring(coords: list) -> tuple[float, float]:
    """Centroïde approché d'une ligne par moyenne des sommets."""
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return sum(lons) / len(lons), sum(lats) / len(lats)


def get_all_coords(geometry: dict) -> list:
    """Extrait toutes les coordonnées d'une LineString ou MultiLineString."""
    gtype = geometry.get("type", "")
    if gtype == "LineString":
        return geometry.get("coordinates", [])
    elif gtype == "MultiLineString":
        coords = []
        for part in geometry.get("coordinates", []):
            coords.extend(part)
        return coords
    return []


def compute_bbox(coords: list) -> tuple[float, float, float, float]:
    """Bounding box : min_lon, min_lat, max_lon, max_lat."""
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return min(lons), min(lats), max(lons), max(lats)


def point_in_expanded_bbox(
    lon: float, lat: float,
    bbox: tuple[float, float, float, float],
    expand_m: float
) -> bool:
    """
    Test rapide : la gare est-elle dans une bbox élargie ?
    Sert à éviter de calculer des distances précises inutiles.
    """
    min_lon, min_lat, max_lon, max_lat = bbox

    # Approximation degrés ↔ mètres autour de Paris
    delta_lat = expand_m / 111_320
    delta_lon = expand_m / (111_320 * math.cos(math.radians((min_lat + max_lat) / 2)))

    return (
        (min_lon - delta_lon) <= lon <= (max_lon + delta_lon)
        and (min_lat - delta_lat) <= lat <= (max_lat + delta_lat)
    )


# ── Nettoyage voies ────────────────────────────────────────────────────────────

def stable_voie_id(coords: list) -> str:
    raw = json.dumps(coords[:10], ensure_ascii=False, sort_keys=True)
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def clean_voies(raw_path: str) -> list[dict]:
    logger.info("Nettoyage des voies de Paris...")

    with open(raw_path, encoding="utf-8") as f:
        wrapper = json.load(f)

    features = wrapper.get("data", {}).get("features", [])
    cleaned = []
    skipped = 0

    for feat in features:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})

        if geom.get("type") not in ("LineString", "MultiLineString"):
            skipped += 1
            continue

        coords = get_all_coords(geom)
        if len(coords) < 2:
            skipped += 1
            continue

        length_km = linestring_length_km(coords)
        if length_km <= 0:
            skipped += 1
            continue

        centroid_lon, centroid_lat = centroid_of_linestring(coords)
        bbox = compute_bbox(coords)

        voie_id = (
            safe_str(props.get("idvoie"))
            or safe_str(props.get("id_voie"))
            or safe_str(props.get("gid"))
            or safe_str(props.get("n_sq_vo"))
            or stable_voie_id(coords)
        )

        nom = (
            safe_str(props.get("libelle"))
            or safe_str(props.get("l_voie"))
            or safe_str(props.get("nom_voie"))
            or safe_str(props.get("name"))
            or "Inconnu"
        )

        cleaned.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "voie_id": voie_id,
                "nom": nom,
                "length_km": round(length_km, 4),
                "centroid_lon": round(centroid_lon, 6),
                "centroid_lat": round(centroid_lat, 6),
                "bbox_min_lon": round(bbox[0], 6),
                "bbox_min_lat": round(bbox[1], 6),
                "bbox_max_lon": round(bbox[2], 6),
                "bbox_max_lat": round(bbox[3], 6),
            }
        })

    logger.info(f"✓ Voies nettoyées : {len(cleaned)} retenues, {skipped} ignorées")
    return cleaned


# ── Nettoyage gares ────────────────────────────────────────────────────────────

def parse_modes(props: dict) -> list[str]:
    """
    Extrait les modes de transport depuis les propriétés.
    Gère à la fois des colonnes booléennes et des champs texte.
    """
    modes_found = []

    bool_map = {
        "rer": "RER",
        "train": "TRAIN",
        "metro": "METRO",
        "tram": "TRAM",
        "tramway": "TRAM",
        "val": "VAL",
    }

    for col, mode_name in bool_map.items():
        val = props.get(col, "")
        sval = str(val).strip().lower()
        if sval in ("1", "true", "oui", "yes", mode_name.lower()):
            modes_found.append(mode_name)

    if not modes_found:
        raw_mode = safe_str(props.get("mode")) or safe_str(props.get("modes_transportes"))
        raw_mode_upper = raw_mode.upper()

        if "RER" in raw_mode_upper:
            modes_found.append("RER")
        if "TRAIN" in raw_mode_upper:
            modes_found.append("TRAIN")
        if "METRO" in raw_mode_upper:
            modes_found.append("METRO")
        if "TRAMWAY" in raw_mode_upper or "TRAM" in raw_mode_upper:
            modes_found.append("TRAM")
        if "VAL" in raw_mode_upper:
            modes_found.append("VAL")

    # dédoublonnage
    modes_found = list(dict.fromkeys(modes_found))

    return modes_found if modes_found else ["UNKNOWN"]


def clean_gares(raw_path: str) -> list[dict]:
    logger.info("Nettoyage des gares IDF...")

    with open(raw_path, encoding="utf-8") as f:
        wrapper = json.load(f)

    features = wrapper.get("data", {}).get("features", [])
    cleaned = []
    skipped = 0

    for feat in features:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})

        if geom.get("type") != "Point":
            skipped += 1
            continue

        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            skipped += 1
            continue

        lon = safe_float(coords[0], None)
        lat = safe_float(coords[1], None)

        if lon is None or lat is None:
            skipped += 1
            continue

        # BBox large IDF
        if not (1.4 <= lon <= 3.6 and 48.0 <= lat <= 49.2):
            skipped += 1
            continue

        gare_id = (
            safe_str(props.get("id_gare"))
            or safe_str(props.get("id"))
            or safe_str(props.get("gid"))
            or hashlib.md5(f"{lon},{lat}".encode("utf-8")).hexdigest()
        )

        nom = (
            safe_str(props.get("nom_gare"))
            or safe_str(props.get("nom"))
            or safe_str(props.get("name"))
            or "Gare inconnue"
        )

        modes = parse_modes(props)
        weight = sum(MODE_WEIGHTS.get(m, 0) for m in modes)

        cleaned.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "gare_id": gare_id,
                "nom": nom,
                "modes": modes,
                "weight": weight,
                "lon": lon,
                "lat": lat,
            }
        })

    logger.info(f"✓ Gares nettoyées : {len(cleaned)} retenues, {skipped} ignorées")
    return cleaned


# ── Jointure spatiale voies ↔ gares ───────────────────────────────────────────

def spatial_join(voies: list[dict], gares: list[dict], radius_m: float = RADIUS_M) -> list[dict]:
    """
    Pour chaque voie, cherche les gares à moins de `radius_m` mètres
    de la géométrie réelle de la rue.
    """
    logger.info(f"Jointure spatiale réelle voie ↔ gare (rayon = {radius_m} m)...")

    joined = []
    total = len(voies)

    for i, voie in enumerate(voies, 1):
        if i % 1000 == 0:
            logger.info(f"  ... {i}/{total} voies traitées")

        vp = voie["properties"]
        geom = voie["geometry"]
        coords = get_all_coords(geom)

        bbox = (
            vp["bbox_min_lon"],
            vp["bbox_min_lat"],
            vp["bbox_max_lon"],
            vp["bbox_max_lat"],
        )

        nearby = []
        score_brut = 0

        for gare in gares:
            gp = gare["properties"]
            lon = gp["lon"]
            lat = gp["lat"]

            # filtre rapide bbox élargie
            if not point_in_expanded_bbox(lon, lat, bbox, radius_m):
                continue

            dist = point_linestring_distance_m(lon, lat, coords)

            if dist <= radius_m:
                nearby.append({
                    "gare_id": gp["gare_id"],
                    "nom": gp["nom"],
                    "modes": gp["modes"],
                    "weight": gp["weight"],
                    "dist_m": round(dist, 1),
                })
                score_brut += gp["weight"]

        nearby.sort(key=lambda x: x["dist_m"])

        joined.append({
            "type": "Feature",
            "geometry": voie["geometry"],
            "properties": {
                "voie_id": vp["voie_id"],
                "nom": vp["nom"],
                "length_km": vp["length_km"],
                "centroid_lon": vp["centroid_lon"],
                "centroid_lat": vp["centroid_lat"],
                "nearby_stations": nearby,
                "station_count": len(nearby),
                "score_brut": score_brut,
            }
        })

    logger.info(f"✓ Jointure terminée : {len(joined)} voies enrichies")
    return joined


# ── Sauvegarde ─────────────────────────────────────────────────────────────────

def save_geojson(features: list[dict], path: str, label: str) -> None:
    geojson = {
        "type": "FeatureCollection",
        "_meta": {
            "label": label,
            "processed_at": datetime.utcnow().isoformat() + "Z",
            "count": len(features),
        },
        "features": features
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    logger.info(f"✓ Sauvegardé : {path} ({len(features)} features)")


# ── Main ───────────────────────────────────────────────────────────────────────

def run() -> None:
    voies_path = os.path.join(BRONZE_DIR, "voies_paris_raw.json")
    gares_path = os.path.join(BRONZE_DIR, "gares_idf_raw.json")

    if not os.path.exists(voies_path):
        raise FileNotFoundError(f"Fichier introuvable : {voies_path}")
    if not os.path.exists(gares_path):
        raise FileNotFoundError(f"Fichier introuvable : {gares_path}")

    voies = clean_voies(voies_path)
    gares = clean_gares(gares_path)

    save_geojson(
        voies,
        os.path.join(SILVER_DIR, "voies_clean.geojson"),
        "Voies Paris nettoyées"
    )

    save_geojson(
        gares,
        os.path.join(SILVER_DIR, "gares_clean.geojson"),
        "Gares IDF nettoyées"
    )

    joined = spatial_join(voies, gares, radius_m=RADIUS_M)

    save_geojson(
        joined,
        os.path.join(SILVER_DIR, "voies_gares_joined.geojson"),
        "Jointure spatiale voies-gares"
    )

    logger.info("Silver processing terminé.")


if __name__ == "__main__":
    run()