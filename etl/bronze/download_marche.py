import os
import json
import requests
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pathlib import Path
 
 
# ============================================================
# CONFIGURATION - CHEMINS
# ============================================================
 
SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
BRONZE_DIR = os.path.join(PROJECT_ROOT, "data", "bronze")
 
API_URL = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/marches-decouverts/records"
 
 
def get_csv_candidates():
    """Retourne les chemins candidats du CSV marchés découverts."""
    return [
        Path(RAW_DIR) / "marches-decouverts.csv",
        PROJECT_ROOT.parent.parent / "marches-decouverts.csv",
    ]
 
 
def find_csv_path():
    """Trouve le premier CSV existant parmi les chemins candidats."""
    for path in get_csv_candidates():
        if path.exists():
            return str(path)
    return None
 
 
def extract_lat_lon(value):
    """Extrait (lat, lon) depuis plusieurs formats possibles."""
    if isinstance(value, dict):
        lat = value.get("lat")
        lon = value.get("lon")
        return lat, lon
 
    if isinstance(value, str):
        v = value.strip()
        if not v:
            return None, None
 
        if v.startswith("{"):
            try:
                data = json.loads(v)
                lat = data.get("lat")
                lon = data.get("lon")
                return lat, lon
            except Exception:
                return None, None
 
        if "," in v:
            parts = [p.strip() for p in v.split(",")]
            if len(parts) >= 2:
                try:
                    lat = float(parts[0])
                    lon = float(parts[1])
                    return lat, lon
                except Exception:
                    return None, None
 
    return None, None
 
 
def load_from_api():
    """Télécharge les marchés découverts via l'API avec pagination."""
    print("🔵 Tentative de téléchargement via l'API marchés découverts...")
 
    all_records = []
    offset = 0
    limit = 100
 
    while True:
        params = {
            "limit": limit,
            "offset": offset,
        }
 
        try:
            response = requests.get(API_URL, params=params, timeout=30)
 
            if response.status_code != 200:
                print(f"⚠️ API retourne {response.status_code} à l'offset {offset}")
                break
 
            data = response.json()
            records = data.get("results", [])
 
            if not records:
                break
 
            all_records.extend(records)
            print(f"   ✅ Page {offset // limit + 1}: {len(records)} enregistrements (total: {len(all_records)})")
 
            if len(records) < limit:
                break
 
            offset += limit
 
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Erreur réseau : {e}")
            break
 
    if not all_records:
        print("⚠️ Aucune donnée récupérée via l'API.")
        return None
 
    df = pd.DataFrame(all_records)
    print(f"🔵 API: {len(df)} marchés récupérés")
 
    geo_col = None
    for col in ["geo_point_2d", "coordonnees", "geo", "geometry"]:
        if col in df.columns:
            geo_col = col
            break
 
    if geo_col is None:
        print("⚠️ Colonne de coordonnées absente dans l'API.")
        return None
 
    coords = df[geo_col].apply(extract_lat_lon)
    df["lat"] = coords.apply(lambda x: x[0])
    df["lon"] = coords.apply(lambda x: x[1])
 
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    df = df.dropna(subset=["lat", "lon"])
 
    print(f"   ✅ {len(df)} marchés géolocalisés")
    return df
 
 
def load_from_csv():
    """Charge les marchés depuis le CSV local avec parsing robuste."""
    print("🔵 Chargement du fichier CSV local...")
 
    csv_path = find_csv_path()
    if not csv_path:
        print("⚠️ CSV introuvable.")
        return None
 
    print(f"🔵 CSV trouvé: {csv_path}")
 
    df = None
    for sep in [";", ","]:
        try:
            candidate = pd.read_csv(csv_path, sep=sep)
            if len(candidate.columns) > 1:
                df = candidate
                print(f"🔵 CSV chargé avec séparateur '{sep}': {len(df)} enregistrements")
                break
        except Exception:
            continue
 
    if df is None:
        print("⚠️ Impossible de lire le CSV.")
        return None
 
    print(f"🔵 Colonnes CSV: {df.columns.tolist()}")
 
    lat_col = None
    lon_col = None
    for col in df.columns:
        col_lower = col.lower()
        if "lat" in col_lower or "latitude" in col_lower:
            lat_col = col
        if "lon" in col_lower or "longitude" in col_lower or "lng" in col_lower:
            lon_col = col
 
    if lat_col and lon_col:
        df["lat"] = pd.to_numeric(df[lat_col], errors="coerce")
        df["lon"] = pd.to_numeric(df[lon_col], errors="coerce")
        df = df.dropna(subset=["lat", "lon"])
        if len(df) > 0:
            print(f"   ✅ {len(df)} marchés géolocalisés depuis colonnes {lat_col}/{lon_col}")
            return df
 
    geo_col = None
    for col in ["geo_point_2d", "coordonnees_geo", "geo", "geometry"]:
        if col in df.columns:
            geo_col = col
            break
 
    if geo_col:
        coords = df[geo_col].apply(extract_lat_lon)
        df["lat"] = coords.apply(lambda x: x[0])
        df["lon"] = coords.apply(lambda x: x[1])
 
        df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
        df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
        df = df.dropna(subset=["lat", "lon"])
 
        if len(df) > 0:
            print(f"   ✅ {len(df)} marchés géolocalisés depuis {geo_col}")
            return df
 
    print("⚠️ Le CSV ne contient pas de coordonnées GPS exploitables.")
    print("   Colonnes disponibles:", df.columns.tolist())
    print("   Exemple de données:", df.head(2).to_dict())
    return None
 
 
def save_as_parquet(df):
    """Convertit en GeoDataFrame et sauvegarde en parquet bronze."""
    print("🔵 Conversion en GeoDataFrame...")
 
    df["geometry"] = df.apply(lambda row: Point(row["lon"], row["lat"]), axis=1)
    gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:4326")
 
    print("🔵 Reprojection en EPSG:2154...")
    gdf = gdf.to_crs(2154)
 
    cols_to_drop = []
    for col in gdf.columns:
        if col == "geometry":
            continue
        sample = gdf[col].dropna().head(1)
        if len(sample) > 0 and isinstance(sample.iloc[0], (dict, list)):
            cols_to_drop.append(col)
 
    if cols_to_drop:
        print(f"   🗑️ Suppression des colonnes complexes : {cols_to_drop}")
        gdf = gdf.drop(columns=cols_to_drop)
 
    keep_cols = ["geometry"]
    for col in [
        "Identifiant marché",
        "Nom court",
        "Nom complet",
        "Produit",
        "Arrondissement",
        "Localisation",
        "Jours de tenue",
        "LUNDI",
        "MARDI",
        "MERCREDI",
        "JEUDI",
        "VENDREDI",
        "SAMEDI",
        "DIMANCHE",
        "Secteur",
        "Gestionnaire",
        "Linéaire commercial",
        "lat",
        "lon",
    ]:
        if col in gdf.columns:
            keep_cols.append(col)
 
    gdf = gdf[[c for c in keep_cols if c in gdf.columns]]
 
    os.makedirs(BRONZE_DIR, exist_ok=True)
    output_path = os.path.join(BRONZE_DIR, "marches_decouverts.parquet")
 
    print("🔵 Sauvegarde du fichier marchés brut...")
    gdf.to_parquet(output_path, index=False)
 
    print(f"✅ Fichier marchés généré : {output_path}")
    print(f"\n📊 Statistiques : {len(gdf)} marchés")
    return gdf
 
 
def main():
    print("=" * 60)
    print("🛒 Téléchargement des marchés découverts")
    print("=" * 60)
 
    df_api = load_from_api()
    df_csv = load_from_csv()
 
    dfs_to_merge = []
 
    if df_api is not None and not df_api.empty:
        dfs_to_merge.append(df_api)
        print(f"✅ API: {len(df_api)} marchés")
 
    if df_csv is not None and not df_csv.empty:
        dfs_to_merge.append(df_csv)
        print(f"✅ CSV: {len(df_csv)} marchés")
 
    if not dfs_to_merge:
        raise Exception("❌ Aucune source marchés disponible (API KO + CSV sans coordonnées).")
 
    if len(dfs_to_merge) == 1:
        print("🔵 Utilisation d'une seule source.")
        df = dfs_to_merge[0]
    else:
        print("🔵 Fusion API + CSV...")
        df = pd.concat(dfs_to_merge, ignore_index=True)
        before = len(df)
        df = df.drop_duplicates(subset=["lat", "lon"])
        print(f"   ✅ {len(df)} marchés après fusion (suppression de {before - len(df)} doublons)")
 
    save_as_parquet(df)
 
 
if __name__ == "__main__":
    main()