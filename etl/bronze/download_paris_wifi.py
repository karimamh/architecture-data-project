import os
import requests
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pathlib import Path
import json

# ============================================================
# CONFIGURATION
# ============================================================

SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
BRONZE_DIR = os.path.join(PROJECT_ROOT, "data", "bronze")
CSV_PATH = os.path.join(RAW_DIR, "sites-disposant-du-service-paris-wi-fi.csv")

API_URL = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/sites-disposant-du-service-paris-wi-fi/records"


def load_from_api():
    """Télécharge les données Wi-Fi depuis l'API avec pagination"""
    print("🔵 Tentative de téléchargement via l'API Paris Wi-Fi...")
    
    all_records = []
    offset = 0
    limit = 100
    
    while True:
        params = {"limit": limit, "offset": offset}
        
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
    print(f"🔵 API: {len(df)} enregistrements récupérés")
    
    # Chercher la colonne de coordonnées
    geo_col = None
    for col in ['geo_point_2d', 'coordonnees_geo', 'geo', 'geometry']:
        if col in df.columns:
            geo_col = col
            break
    
    if geo_col is None:
        print("⚠️ Colonne de coordonnées absente dans l'API.")
        return None
    
    # Extraire lat/lon (différents formats possibles)
    def extract_lat_lon(val):
        if isinstance(val, dict):
            # Format: {"lon": 2.3, "lat": 48.8}
            return val.get("lat"), val.get("lon")
        elif isinstance(val, str):
            try:
                # Format: "2.3,48.8" ou "{\"lon\":2.3,\"lat\":48.8}"
                if val.startswith('{'):
                    data = json.loads(val)
                    return data.get("lat"), data.get("lon")
                else:
                    parts = val.split(',')
                    if len(parts) == 2:
                        return float(parts[1]), float(parts[0])  # lat, lon
            except:
                pass
        return None, None
    
    coords = df[geo_col].apply(extract_lat_lon)
    df["lat"] = coords.apply(lambda x: x[0])
    df["lon"] = coords.apply(lambda x: x[1])
    
    # Supprimer les lignes sans coordonnées
    df = df.dropna(subset=["lat", "lon"])
    
    print(f"   ✅ {len(df)} points géolocalisés")
    
    # Ajouter une colonne source
    df['source'] = 'API'
    
    return df


def load_from_csv():
    """Charge les données depuis le CSV local (amélioré)"""
    print("🔵 Chargement du fichier CSV local...")

    if not os.path.exists(CSV_PATH):
        print("⚠️ CSV introuvable.")
        return None

    # Essayer différents séparateurs
    for sep in [';', ',']:
        try:
            df = pd.read_csv(CSV_PATH, sep=sep)
            if len(df.columns) > 1:
                print(f"🔵 CSV chargé avec séparateur '{sep}': {len(df)} enregistrements")
                break
        except:
            continue
    else:
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
        if 'lat' in col_lower or 'latitude' in col_lower or 'y' == col_lower:
            lat_col = col
        if 'lon' in col_lower or 'longitude' in col_lower or 'lng' in col_lower or 'x' == col_lower:
            lon_col = col
    
    if lat_col and lon_col:
        df["lat"] = pd.to_numeric(df[lat_col], errors='coerce')
        df["lon"] = pd.to_numeric(df[lon_col], errors='coerce')
        df = df.dropna(subset=["lat", "lon"])
        if len(df) > 0:
            print(f"   ✅ {len(df)} points géolocalisés depuis colonnes {lat_col}/{lon_col}")
            df['source'] = 'CSV'
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
                # Format possible: "48.8566,2.3522" ou "POINT(2.3522 48.8566)"
                if ',' in val:
                    parts = val.split(',')
                    if len(parts) == 2:
                        try:
                            return float(parts[0].strip()), float(parts[1].strip())
                        except:
                            pass
                elif 'POINT' in val:
                    import re
                    match = re.search(r'POINT\(([\d\.\-]+)\s+([\d\.\-]+)\)', val)
                    if match:
                        return float(match.group(2)), float(match.group(1))
            elif isinstance(val, dict):
                return val.get("lat"), val.get("lon")
            return None, None
        
        coords = df[geo_col].apply(extract_from_geo)
        df["lat"] = coords.apply(lambda x: x[0])
        df["lon"] = coords.apply(lambda x: x[1])
        df = df.dropna(subset=["lat", "lon"])
        
        if len(df) > 0:
            print(f"   ✅ {len(df)} points géolocalisés depuis {geo_col}")
            df['source'] = 'CSV'
            return df
    
    # ============================================================
    # STRATÉGIE 3: Utiliser l'adresse (si pas de coordonnées)
    # ============================================================
    print("⚠️ Le CSV ne contient pas de coordonnées GPS exploitables.")
    return None


def save_as_parquet(df):
    """Convertit en GeoDataFrame et sauvegarde"""
    print("🔵 Conversion en GeoDataFrame...")

    df["geometry"] = df.apply(lambda row: Point(row["lon"], row["lat"]), axis=1)
    gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:4326")

    print("🔵 Reprojection en EPSG:2154...")
    gdf = gdf.to_crs(2154)

    # Nettoyer les colonnes pour Parquet
    cols_to_drop = []
    for col in gdf.columns:
        if col == 'geometry':
            continue
        sample = gdf[col].dropna().head(1)
        if len(sample) > 0 and isinstance(sample.iloc[0], (dict, list)):
            cols_to_drop.append(col)
    
    if cols_to_drop:
        print(f"   🗑️ Suppression des colonnes complexes : {cols_to_drop}")
        gdf = gdf.drop(columns=cols_to_drop)
    
    # Garder les colonnes utiles
    keep_cols = ['geometry', 'source']
    for col in ['nom', 'nom_site', 'adresse', 'cp', 'arrondissement', 'id', 'idpw', 'lat', 'lon']:
        if col in gdf.columns:
            keep_cols.append(col)
    
    gdf = gdf[[c for c in keep_cols if c in gdf.columns]]

    os.makedirs(BRONZE_DIR, exist_ok=True)
    #os.makedirs(RAW_DIR, exist_ok=True)
    
    # output_path = os.path.join(RAW_DIR, "paris_wifi.parquet")
    output_path = os.path.join(BRONZE_DIR, "paris_wifi.parquet")

    print("🔵 Sauvegarde du fichier Wi-Fi brut...")
    gdf.to_parquet(output_path, index=False)

    print(f"✅ Fichier Wi-Fi généré : {output_path}")
    
    # Statistiques détaillées
    print(f"\n📊 STATISTIQUES FINALES")
    print(f"   Total hotspots : {len(gdf)}")
    if 'source' in gdf.columns:
        print(f"   - API : {len(gdf[gdf['source'] == 'API'])}")
        print(f"   - CSV : {len(gdf[gdf['source'] == 'CSV'])}")


def main():
    print("=" * 60)
    print("📍 Téléchargement des hotspots Wi-Fi de Paris")
    print("=" * 60)
    
    df_api = load_from_api()
    df_csv = load_from_csv()

    # Fusion intelligente
    dfs_to_merge = []
    
    if df_api is not None and not df_api.empty:
        dfs_to_merge.append(df_api)
        print(f"✅ API: {len(df_api)} hotspots")
    
    if df_csv is not None and not df_csv.empty:
        dfs_to_merge.append(df_csv)
        print(f"✅ CSV: {len(df_csv)} hotspots")
    
    if not dfs_to_merge:
        raise Exception("❌ Aucune source Wi-Fi disponible (API KO + CSV absent ou invalide).")
    
    if len(dfs_to_merge) == 1:
        print("🔵 Utilisation d'une seule source.")
        df = dfs_to_merge[0]
    else:
        print("🔵 Fusion API + CSV...")
        # Concaténer et supprimer les doublons (basé sur lat/lon + nom)
        df = pd.concat(dfs_to_merge, ignore_index=True)
        
        # Supprimer les doublons exacts sur lat/lon
        before = len(df)
        df = df.drop_duplicates(subset=["lat", "lon"])
        after = len(df)
        print(f"   ✅ {after} points après fusion (suppression de {before - after} doublons)")
    
    save_as_parquet(df)


if __name__ == "__main__":
    main()