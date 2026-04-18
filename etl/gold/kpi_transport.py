"""
GOLD LAYER — Calcul du KPI Accessibilité Transport
KPI : Accessibilité transport par rue (score 0-100)

Entrée  : data/silver/voies_gares_joined.geojson

Sorties :
  - data/gold/kpi_transport_accessibilite.geojson
  - data/gold/kpi_transport_accessibilite.json
  - data/gold/kpi_transport_summary.json

Formule :
  1. score_brut  = somme des poids des gares dans un rayon de 300 m
  2. densite     = score_brut / sqrt(length_km)
  3. score_final = (densite - min) / (max - min) × 100
"""

import json
import os
import math
import logging
from datetime import datetime
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [GOLD] %(levelname)s — %(message)s"
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(__file__)
SILVER_DIR = os.path.abspath(os.path.join(BASE_DIR, "../silver"))
GOLD_DIR = os.path.abspath(os.path.join(BASE_DIR, "."))
os.makedirs(GOLD_DIR, exist_ok=True)


def safe_float(value: Any, default: float = 0.0) -> float:
    """Convertit une valeur en float de façon sécurisée."""
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def classify(score: float) -> str:
    """Retourne une classe qualitative pour la dataviz."""
    if score >= 80:
        return "Très élevée"
    elif score >= 60:
        return "Élevée"
    elif score >= 40:
        return "Moyenne"
    elif score >= 20:
        return "Faible"
    else:
        return "Très faible"


def percentile(values: list[float], p: float) -> float:
    """
    Calcule un percentile simple par interpolation linéaire.
    p doit être entre 0 et 100.
    """
    if not values:
        return 0.0

    sorted_vals = sorted(values)
    n = len(sorted_vals)

    if n == 1:
        return round(sorted_vals[0], 2)

    pos = (p / 100) * (n - 1)
    lower = int(math.floor(pos))
    upper = int(math.ceil(pos))

    if lower == upper:
        return round(sorted_vals[lower], 2)

    weight = pos - lower
    result = sorted_vals[lower] * (1 - weight) + sorted_vals[upper] * weight
    return round(result, 2)


def compute_kpi(features: list[dict]) -> list[dict]:
    """
    Calcule le KPI transport pour chaque voie.

    Étapes :
      1. densite_accessibilite = score_brut / sqrt(length_km)
      2. score_final = normalisation min-max sur [0, 100]
      3. classe_accessibilite = classe textuelle pour la visualisation
    """
    if not features:
        logger.warning("Aucune feature à traiter dans compute_kpi.")
        return features

    logger.info(f"Calcul KPI sur {len(features)} voies...")

    # ── Étape 1 : calcul de la densité d'accessibilité ────────────────────────
    for feat in features:
        props = feat.get("properties", {})

        score_brut = safe_float(props.get("score_brut", 0), 0.0)
        length_km = safe_float(props.get("length_km", 0), 0.0)

        if length_km > 0:
            densite = score_brut / math.sqrt(length_km)
        else:
            densite = 0.0

        props["score_brut"] = round(score_brut, 4)
        props["length_km"] = round(length_km, 6)
        props["densite_accessibilite"] = round(densite, 4)

        feat["properties"] = props

    densites = [
        safe_float(f.get("properties", {}).get("densite_accessibilite", 0), 0.0)
        for f in features
    ]

    d_min = min(densites) if densites else 0.0
    d_max = max(densites) if densites else 0.0
    d_range = d_max - d_min

    logger.info(
        f"Densité calculée — min={d_min:.4f}, max={d_max:.4f}, range={d_range:.4f}"
    )

    # ── Étape 2 : normalisation min-max ───────────────────────────────────────
    for feat in features:
        props = feat.get("properties", {})
        densite = safe_float(props.get("densite_accessibilite", 0), 0.0)

        if d_range > 0:
            score_final = ((densite - d_min) / d_range) * 100
        else:
            # Cas extrême : toutes les densités identiques
            score_final = 100.0 if densite > 0 else 0.0

        props["score_final"] = round(score_final, 2)
        props["classe_accessibilite"] = classify(score_final)
        feat["properties"] = props

    logger.info("✓ Scores calculés et normalisés")
    return features


def build_stats(features: list[dict]) -> dict:
    """Construit les statistiques globales pour l’API et la documentation."""
    if not features:
        return {
            "total_voies": 0,
            "score_min": 0.0,
            "score_max": 0.0,
            "score_mean": 0.0,
            "score_median": 0.0,
            "p25": 0.0,
            "p75": 0.0,
            "distribution_classes": {},
            "computed_at": datetime.utcnow().isoformat() + "Z",
            "formula": {
                "step1": "score_brut = Σ poids des gares dans rayon 300m",
                "step2": "densite = score_brut / sqrt(length_km)",
                "step3": "score_final = (densite - min) / (max - min) × 100",
                "weights": {"RER": 3, "TRAIN": 3, "METRO": 2, "TRAM": 1, "VAL": 1},
                "radius_m": 300
            }
        }

    scores = [
        safe_float(f.get("properties", {}).get("score_final", 0), 0.0)
        for f in features
    ]

    classes = [
        f.get("properties", {}).get("classe_accessibilite", "Non classée")
        for f in features
    ]

    class_counts = {}
    for c in classes:
        class_counts[c] = class_counts.get(c, 0) + 1

    score_mean = round(sum(scores) / len(scores), 2) if scores else 0.0

    return {
        "total_voies": len(features),
        "score_min": round(min(scores), 2) if scores else 0.0,
        "score_max": round(max(scores), 2) if scores else 0.0,
        "score_mean": score_mean,
        "score_median": percentile(scores, 50),
        "p25": percentile(scores, 25),
        "p75": percentile(scores, 75),
        "distribution_classes": class_counts,
        "computed_at": datetime.utcnow().isoformat() + "Z",
        "formula": {
            "step1": "score_brut = Σ poids des gares dans rayon 300m",
            "step2": "densite = score_brut / sqrt(length_km)",
            "step3": "score_final = (densite - min) / (max - min) × 100",
            "weights": {"RER": 3, "TRAIN": 3, "METRO": 2, "TRAM": 1, "VAL": 1},
            "radius_m": 300
        }
    }


def save_outputs(features: list[dict], stats: dict) -> None:
    """Sauvegarde les sorties Gold."""
    # ── GeoJSON complet avec géométries ───────────────────────────────────────
    geojson_path = os.path.join(GOLD_DIR, "kpi_transport_accessibilite.geojson")
    geojson = {
        "type": "FeatureCollection",
        "_meta": stats,
        "features": features
    }

    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    logger.info(f"✓ GeoJSON gold : {geojson_path}")

    # ── JSON lite sans géométries ─────────────────────────────────────────────
    lite_records = []
    for feat in features:
        p = feat.get("properties", {})
        lite_records.append({
            "voie_id": p.get("voie_id"),
            "nom": p.get("nom"),
            "length_km": p.get("length_km"),
            "station_count": p.get("station_count"),
            "score_brut": p.get("score_brut"),
            "densite_accessibilite": p.get("densite_accessibilite"),
            "score_final": p.get("score_final"),
            "classe_accessibilite": p.get("classe_accessibilite"),
            "nearby_stations": p.get("nearby_stations", []),
        })

    lite_path = os.path.join(GOLD_DIR, "kpi_transport_accessibilite.json")
    output = {
        "_meta": stats,
        "records": lite_records
    }

    with open(lite_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    logger.info(f"✓ JSON lite gold : {lite_path}")

    # ── Summary ────────────────────────────────────────────────────────────────
    summary_path = os.path.join(GOLD_DIR, "kpi_transport_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    logger.info(f"✓ Summary : {summary_path}")


def run() -> None:
    joined_path = os.path.join(SILVER_DIR, "voies_gares_joined.geojson")
    logger.info(f"Chargement silver : {joined_path}")

    if not os.path.exists(joined_path):
        raise FileNotFoundError(f"Fichier silver introuvable : {joined_path}")

    with open(joined_path, encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    logger.info(f"{len(features)} voies chargées")

    if not isinstance(features, list):
        raise ValueError("Le champ 'features' du GeoJSON silver n'est pas une liste.")

    features = compute_kpi(features)
    stats = build_stats(features)

    logger.info(
        f"Stats globales — moyenne: {stats['score_mean']}, "
        f"médiane: {stats['score_median']}, "
        f"p25: {stats['p25']}, "
        f"p75: {stats['p75']}"
    )

    save_outputs(features, stats)
    logger.info("Gold processing terminé. KPI prêt pour l'API.")


if __name__ == "__main__":
    run()