"""
FILE UTILS - Gestion des fichiers
Lecture, écriture, vérification de fichiers
"""

import os
import json
import pandas as pd
import geopandas as gpd
from pathlib import Path


class FileUtils:
    """Utilitaires pour la manipulation de fichiers"""
    
    def __init__(self, base_path=None):
        """
        Initialise le gestionnaire de fichiers
        
        Args:
            base_path: Chemin racine du projet (par défaut: dossier parent)
        """
        if base_path is None:
            # Remonte de utils/ à la racine du projet
            self.base_path = Path(__file__).parent.parent
        else:
            self.base_path = Path(base_path)
    
    def get_data_path(self, subfolder):
        """
        Retourne le chemin absolu vers un dossier dans data/
        
        Args:
            subfolder: 'bronze', 'silver', 'gold', 'raw', 'intermediate'
        
        Returns:
            Path: Chemin absolu
        """
        path = self.base_path / 'data' / subfolder
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    def read_parquet(self, filepath):
        """
        Lit un fichier Parquet
        
        Args:
            filepath: Chemin relatif depuis la racine
        
        Returns:
            pandas.DataFrame
        """
        full_path = self.base_path / filepath
        if not full_path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {full_path}")
        return pd.read_parquet(full_path)
    
    def read_csv(self, filepath, separator=';'):
        """
        Lit un fichier CSV
        
        Args:
            filepath: Chemin relatif depuis la racine
            separator: Séparateur de colonnes (';' ou ',')
        
        Returns:
            pandas.DataFrame
        """
        full_path = self.base_path / filepath
        if not full_path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {full_path}")
        return pd.read_csv(full_path, sep=separator)
    
    def read_geojson(self, filepath):
        """
        Lit un fichier GeoJSON
        
        Args:
            filepath: Chemin relatif depuis la racine
        
        Returns:
            geopandas.GeoDataFrame
        """
        full_path = self.base_path / filepath
        if not full_path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {full_path}")
        return gpd.read_file(full_path)
    
    def write_parquet(self, df, filepath):
        """
        Écrit un DataFrame en Parquet
        
        Args:
            df: pandas.DataFrame
            filepath: Chemin relatif depuis la racine
        """
        full_path = self.base_path / filepath
        full_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(full_path, index=False)
        print(f"✅ Fichier sauvegardé: {full_path}")
    
    def write_csv(self, df, filepath, separator=';'):
        """
        Écrit un DataFrame en CSV
        
        Args:
            df: pandas.DataFrame
            filepath: Chemin relatif depuis la racine
            separator: Séparateur de colonnes
        """
        full_path = self.base_path / filepath
        full_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(full_path, sep=separator, index=False, encoding='utf-8')
        print(f"✅ CSV sauvegardé: {full_path}")
    
    def write_geojson(self, gdf, filepath):
        """
        Écrit un GeoDataFrame en GeoJSON
        
        Args:
            gdf: geopandas.GeoDataFrame
            filepath: Chemin relatif depuis la racine
        """
        full_path = self.base_path / filepath
        full_path.parent.mkdir(parents=True, exist_ok=True)
        gdf.to_file(full_path, driver='GeoJSON')
        print(f"✅ GeoJSON sauvegardé: {full_path}")
    
    def file_exists(self, filepath):
        """
        Vérifie si un fichier existe
        
        Args:
            filepath: Chemin relatif depuis la racine
        
        Returns:
            bool
        """
        return (self.base_path / filepath).exists()
    
    def list_files(self, directory, extension=None):
        """
        Liste les fichiers d'un dossier
        
        Args:
            directory: Dossier relatif depuis la racine
            extension: Extension optionnelle (ex: '.parquet')
        
        Returns:
            list: Liste des chemins de fichiers
        """
        full_path = self.base_path / directory
        if not full_path.exists():
            return []
        
        files = list(full_path.glob('*'))
        if extension:
            files = [f for f in files if f.suffix == extension]
        
        return files


# Instance unique (singleton)
file_utils = FileUtils()