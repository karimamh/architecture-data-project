import os
import requests
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pathlib import Path
import json

# ============================================================
# CONFIGURATION - CHEMINS
# ============================================================

SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
CSV_PATH = os.path.join(PROJECT_ROOT, "data", "raw", "antennes-relais.csv")

# API ANFR (limit max = 100)
API_URL = "https://opendata.grandparis.fr/api/explore/v2.1/catalog/datasets/antennes-relais/records"

def load_from_api():
    """Télécharge les antennes mobiles depuis l'API ANFR avec pagination"""
    print("🔵 Tentative de téléchargement via l'API ANFR...")

    all_records = []
    offset = 0
    limit = 100

    while True:
        params = {
            "limit": limit,
            "offset": offset,
            "refine": "departement:75"   # Paris uniquement
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
        print("⚠️ Aucune donnée récupérée via l'API ANFR.")
        return None

    df = pd.DataFrame(all_records)
    print(f"🔵 API: {len(df)} antennes récupérées")

    # Chercher la colonne géographique
    geo_col = None
    for col in ['coordonnees', 'geo_point_2d', 'geo', 'geometry']:
        if col in df.columns:
            geo_col = col
            break

    if geo_col is None:
        print("⚠️ Colonne de coordonnées absente dans l'API.")
        return None

    # Extraire lat/lon
    df["lat"] = df[geo_col].apply(lambda x: x.get("lat") if isinstance(x, dict) else None)
    df["lon"] = df[geo_col].apply(lambda x: x.get("lon") if isinstance(x, dict) else None)

    df = df.dropna(subset=["lat", "lon"])
    print(f"   ✅ {len(df)} antennes géolocalisées")

    return df


def load_from_csv():
    """Charge les antennes depuis le CSV local (amélioré)"""
    print("🔵 Chargement du fichier CSV local...")

    if not os.path.exists(CSV_PATH):
        print("⚠️ CSV introuvable.")
        return None

    # Essayer différents séparateurs
    df = None
    for sep in [';', ',']:
        try:
            df = pd.read_csv(CSV_PATH, sep=sep)
            if len(df.columns) > 1:
                print(f"🔵 CSV chargé avec séparateur '{sep}': {len(df)} enregistrements")
                break
        except:
            continue
    
    if df is None:
        print("⚠️ Impossible de lire le CSV.")
        return None
    
    print(f"🔵 Colonnes CSV: {df.columns.tolist()}")
    
    # ============================================================
    # STRATÉGIE 1: Chercher des colonnes lat/lon explicites
    # ============================================================
    lat_col = None
    lon_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        if 'lat' in col_lower or 'latitude' in col_lower:
            lat_col = col
        if 'lon' in col_lower or 'longitude' in col_lower or 'lng' in col_lower:
            lon_col = col
    
    if lat_col and lon_col:
        df["lat"] = pd.to_numeric(df[lat_col], errors='coerce')
        df["lon"] = pd.to_numeric(df[lon_col], errors='coerce')
        df = df.dropna(subset=["lat", "lon"])
        if len(df) > 0:
            print(f"   ✅ {len(df)} antennes géolocalisées depuis colonnes {lat_col}/{lon_col}")
            return df
    
    # ============================================================
    # STRATÉGIE 2: Chercher une colonne geo_point_2d
    # ============================================================
    geo_col = None
    for col in ['geo_point_2d', 'coordonnees_geo', 'geo', 'geometry', 'wkt']:
        if col in df.columns:
            geo_col = col
            break
    
    if geo_col:
        def extract_from_geo(val):
            if isinstance(val, str):
                # Format possible: "48.8566,2.3522" ou "{\"lon\":2.35,\"lat\":48.85}"
                if ',' in val and not val.startswith('{'):
                    parts = val.split(',')
                    if len(parts) == 2:
                        try:
                            return float(parts[0].strip()), float(parts[1].strip())
                        except:
                            pass
                elif val.startswith('{'):
                    try:
                        data = json.loads(val)
                        return data.get("lat"), data.get("lon")
                    except:
                        pass
            elif isinstance(val, dict):
                return val.get("lat"), val.get("lon")
            return None, None
        
        coords = df[geo_col].apply(extract_from_geo)
        df["lat"] = coords.apply(lambda x: x[0])
        df["lon"] = coords.apply(lambda x: x[1])
        df = df.dropna(subset=["lat", "lon"])
        
        if len(df) > 0:
            print(f"   ✅ {len(df)} antennes géolocalisées depuis {geo_col}")
            return df
    
    # ============================================================
    # STRATÉGIE 3: Afficher les colonnes pour diagnostic
    # ============================================================
    print("⚠️ Le CSV ne contient pas de coordonnées GPS exploitables.")
    print("   Colonnes disponibles:", df.columns.tolist())
    print("   Exemple de données:", df.head(2).to_dict())
    
    return None


def save_as_parquet(df, source_name="antennes"):
    """Convertit en GeoDataFrame et sauvegarde"""
    print("🔵 Conversion en GeoDataFrame...")

    df["geometry"] = df.apply(lambda row: Point(row["lon"], row["lat"]), axis=1)
    gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:4326")

    print("🔵 Reprojection en EPSG:2154...")
    gdf = gdf.to_crs(2154)

    # Supprimer colonnes complexes
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

    # Colonnes utiles
    keep_cols = ['geometry']
    for col in ['id', 'nom', 'nom_site', 'adresse', 'operateur', 'systeme', 'technologie', 'lat', 'lon']:
        if col in gdf.columns:
            keep_cols.append(col)

    gdf = gdf[[c for c in keep_cols if c in gdf.columns]]

    os.makedirs(RAW_DIR, exist_ok=True)
    output_path = os.path.join(RAW_DIR, "antennes_mobile.parquet")

    print("🔵 Sauvegarde du fichier ANFR brut...")
    gdf.to_parquet(output_path, index=False)

    print(f"✅ Fichier ANFR généré : {output_path}")
    print(f"\n📊 Statistiques : {len(gdf)} antennes mobiles")
    
    return gdf


def main():
    print("=" * 60)
    print("📡 Téléchargement des antennes mobiles (ANFR)")
    print("=" * 60)

    df_api = load_from_api()
    df_csv = load_from_csv()

    # Gestion des DataFrames vides
    dfs_to_merge = []
    
    if df_api is not None and not df_api.empty:
        dfs_to_merge.append(df_api)
        print(f"✅ API: {len(df_api)} antennes")
    
    if df_csv is not None and not df_csv.empty:
        dfs_to_merge.append(df_csv)
        print(f"✅ CSV: {len(df_csv)} antennes")
    
    if not dfs_to_merge:
        raise Exception("❌ Aucune source ANFR disponible (API KO + CSV sans coordonnées).")
    
    if len(dfs_to_merge) == 1:
        print("🔵 Utilisation d'une seule source.")
        df = dfs_to_merge[0]
    else:
        print("🔵 Fusion API + CSV...")
        df = pd.concat(dfs_to_merge, ignore_index=True)
        before = len(df)
        df = df.drop_duplicates(subset=["lat", "lon"])
        print(f"   ✅ {len(df)} antennes après fusion (suppression de {before - len(df)} doublons)")

    save_as_parquet(df)


if __name__ == "__main__":
    main()