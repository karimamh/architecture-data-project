import os
import sys
import requests
import geopandas as gpd
import pandas as pd
from shapely.geometry import LineString, Polygon, box
from shapely.ops import unary_union
import zipfile
import tempfile
from pathlib import Path
import json
from time import sleep
import hashlib

# ============================================================
# CONFIGURATION - CHEMINS CORRIGÉS
# ============================================================

SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent.parent  # remonte de etl/bronze/ à racine
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_INTERMEDIATE = PROJECT_ROOT / "data" / "intermediate"
DATA_GOLD = PROJECT_ROOT / "data" / "gold"

# Créer les dossiers
for d in [DATA_RAW, DATA_INTERMEDIATE, DATA_GOLD]:
    d.mkdir(parents=True, exist_ok=True)

print(f"📁 Projet : {PROJECT_ROOT}")
print(f"📁 Dossier raw : {DATA_RAW}")
print(f"📁 Dossier intermediate : {DATA_INTERMEDIATE}")

# ============================================================
# SOURCES DE DONNÉES
# ============================================================

GEOFABRIK_URL = "https://download.geofabrik.de/europe/france/ile-de-france-latest-free.shp.zip"

PARIS_DATA_ARRONDISSEMENTS = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/arrondissements/exports/geojson"

PARIS_DATA_QUARTIERS = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/quartier/exports/geojson"

# Bounding box de Paris (pour le filtrage)
PARIS_BBOX = (2.2241, 48.8155, 2.4698, 48.9021)  # (minx, miny, maxx, maxy)


class DataDownloader:
    """Téléchargeur avec cache et retry automatique"""
    
    def __init__(self):
        self.cache_dir = DATA_RAW / ".cache"
        self.cache_dir.mkdir(exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'UrbanDataExplorer/1.0 (Educational Project)'
        })
    
    def get_cache_path(self, url):
        """Génère un chemin de cache basé sur l'URL"""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return self.cache_dir / f"{url_hash}.cache"
    
    def download_with_cache(self, url, force=False):
        """Télécharge avec mise en cache locale"""
        cache_path = self.get_cache_path(url)
        
        if cache_path.exists() and not force:
            print(f"   📦 Cache : utilisation du fichier local")
            return cache_path
        
        print(f"   🌐 Téléchargement depuis {url[:60]}...")
        
        for attempt in range(3):
            try:
                response = self.session.get(url, timeout=90)
                response.raise_for_status()
                
                with open(cache_path, 'wb') as f:
                    f.write(response.content)
                
                print(f"   ✅ Téléchargement terminé")
                return cache_path
                
            except requests.exceptions.RequestException as e:
                print(f"   ⚠️ Tentative {attempt+1}/3 échouée : {e}")
                sleep(3)
        
        raise Exception(f"Impossible de télécharger {url}")
    
    def download_streets_from_geofabrik(self):
        """Télécharge les rues depuis Geofabrik (fiable et rapide)"""
        print("\n🔵 Téléchargement des rues depuis Geofabrik...")
        
        zip_path = self.download_with_cache(GEOFABRIK_URL)
        
        print("   📦 Extraction du fichier zip...")
        with tempfile.TemporaryDirectory() as tmpdir:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(tmpdir)
            
            # Chercher le fichier shapefile des routes
            shp_files = list(Path(tmpdir).glob("gis_osm_roads_free_1.shp"))
            if not shp_files:
                raise Exception("Fichier shapefile non trouvé")
            
            print("   📖 Lecture du shapefile...")
            gdf = gpd.read_file(shp_files[0])
            print(f"   📊 {len(gdf)} éléments chargés (toute l'Île-de-France)")
            
            # Filtrer pour ne garder que Paris
            print("   🔍 Filtrage des rues de Paris...")
            paris_polygon = box(*PARIS_BBOX)
            
            # Filtrer par intersection avec Paris
            mask = gdf.geometry.intersects(paris_polygon)
            gdf_paris = gdf[mask].copy()
            
            print(f"   ✅ {len(gdf_paris)} rues dans Paris")
            
            # Nettoyer les colonnes
            if 'name' in gdf_paris.columns:
                gdf_paris = gdf_paris.rename(columns={'name': 'nom_rue'})
            if 'fclass' in gdf_paris.columns:
                gdf_paris = gdf_paris.rename(columns={'fclass': 'type_voie'})
            if 'osm_id' in gdf_paris.columns:
                gdf_paris = gdf_paris.rename(columns={'osm_id': 'osm_id'})
            
            return gdf_paris
    
    def download_arrondissements(self):
        """Télécharge les arrondissements depuis Paris Data"""
        print("\n🔵 Téléchargement des arrondissements depuis Paris Data...")
        
        geojson_path = self.download_with_cache(PARIS_DATA_ARRONDISSEMENTS)
        
        print("   📖 Lecture du GeoJSON...")
        gdf = gpd.read_file(geojson_path)
        
        # Standardiser les colonnes
        if 'c_ar' in gdf.columns:
            gdf = gdf.rename(columns={'c_ar': 'num_arrondissement', 'l_ar': 'nom_arrondissement'})
        
        print(f"   ✅ {len(gdf)} arrondissements chargés")
        return gdf


def build_streets_gdf():
    """Fonction principale qui construit le GeoDataFrame des rues"""
    downloader = DataDownloader()
    
    print("=" * 60)
    print("🗺️  Construction des rues et arrondissements de Paris")
    print("=" * 60)
    
    try:
        # 1. Télécharger les rues
        streets = downloader.download_streets_from_geofabrik()
        
        # 2. Télécharger les arrondissements
        arr = downloader.download_arrondissements()
        
        # 3. Reprojection en Lambert-93 pour les calculs métriques
        print("\n🔵 Reprojection en Lambert-93 (EPSG:2154)...")
        streets = streets.to_crs("EPSG:2154")
        arr = arr.to_crs("EPSG:2154")
        
        # 4. Calculer la longueur des rues en mètres
        print("🔵 Calcul des longueurs...")
        streets['longueur_metres'] = streets.geometry.length
        
        # 5. Jointure spatiale (rue → arrondissement)
        print("🔵 Jointure spatiale avec les arrondissements...")
        
        # Vérifier que les CRS sont identiques
        if streets.crs != arr.crs:
            arr = arr.to_crs(streets.crs)
        
        # Réaliser la jointure
        streets_with_arr = gpd.sjoin(
            streets,
            arr,
            how="left",
            predicate="intersects"
        )
        
        # 6. Créer un identifiant unique
        print("🔵 Création des identifiants uniques...")
        streets_with_arr['street_id'] = range(len(streets_with_arr))
        
        # 7. Nettoyer les colonnes
        # Trouver le nom de la colonne arrondissement
        arr_col = None
        for col in ['num_arrondissement', 'nom_arrondissement', 'c_ar', 'l_ar']:
            if col in streets_with_arr.columns:
                arr_col = col
                break
        
        # Garder seulement les colonnes utiles
        cols_to_keep = ['street_id', 'osm_id', 'nom_rue', 'type_voie', 'longueur_metres', 'geometry']
        if arr_col:
            cols_to_keep.append(arr_col)
        
        existing_cols = [c for c in cols_to_keep if c in streets_with_arr.columns]
        result = streets_with_arr[existing_cols].copy()
        
        # Renommer la colonne arrondissement
        if arr_col and arr_col in result.columns:
            result = result.rename(columns={arr_col: 'arrondissement'})
        
        # Renommer les autres colonnes
        if 'nom_rue' in result.columns:
            result = result.rename(columns={'nom_rue': 'name'})
        if 'type_voie' in result.columns:
            result = result.rename(columns={'type_voie': 'highway'})
        
        # 8. Statistiques
        print("\n" + "=" * 60)
        print("📊 STATISTIQUES FINALES")
        print("=" * 60)
        print(f"   Nombre total de rues : {len(result)}")
        print(f"   Longueur totale : {result['longueur_metres'].sum() / 1000:.1f} km")
        print(f"   Rues avec nom : {result['name'].notna().sum()}")
        print(f"   Rues sans nom : {result['name'].isna().sum()}")
        
        # Distribution par type
        if 'highway' in result.columns:
            print("\n   📋 Types de voies :")
            type_counts = result['highway'].value_counts().head(5)
            for t, c in type_counts.items():
                print(f"      - {t}: {c} rues")
        
        # 9. Sauvegarde
        print("\n🔵 Sauvegarde des fichiers...")
        
        # Sauvegarde en Parquet
        output_parquet = DATA_INTERMEDIATE / "streets_base.parquet"
        result.to_parquet(output_parquet, index=False)
        print(f"   ✅ streets_base.parquet : {output_parquet}")
        
        # Sauvegarde en GeoJSON
        output_geojson = DATA_INTERMEDIATE / "streets_base.geojson"
        result.to_file(output_geojson, driver="GeoJSON")
        print(f"   ✅ streets_base.geojson : {output_geojson}")
        
        # Sauvegarde des métadonnées
        metadata = {
            "source": "Geofabrik / OpenStreetMap + Paris Data",
            "date_extraction": pd.Timestamp.now().isoformat(),
            "nombre_rues": len(result),
            "longueur_totale_km": float(result['longueur_metres'].sum() / 1000),
            "projection": "EPSG:2154",
            "licence": "ODbL OpenStreetMap + Open License Paris Data"
        }
        
        metadata_path = DATA_INTERMEDIATE / "streets_metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"   ✅ streets_metadata.json : {metadata_path}")
        
        print("\n🎉 Succès ! Les données sont prêtes pour l'étape Silver.")
        
        return result
        
    except Exception as e:
        print(f"\n❌ ERREUR : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    build_streets_gdf()


if __name__ == "__main__":
    main()