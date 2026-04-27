import sys
import os
import pandas as pd
import numpy as np

# Ajoute la racine au chemin
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

def min_max_scaling(series):
    """Normalisation manuelle (sans importer utils)"""
    if series.max() == series.min():
        return pd.Series([0.5] * len(series))
    return (series - series.min()) / (series.max() - series.min())

def compute_kpi_cyclable():
    print("=" * 60)
    print("🚲 Calcul du KPI de cyclabilité")
    print("=" * 60)
    
    # Chemins
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(base_dir, '../..'))
    
    input_path = os.path.join(project_root, "data", "silver", "cyclable_clean.parquet")
    output_path = os.path.join(project_root, "data", "gold", "kpi_cyclable.parquet")
    
    # Vérification
    if not os.path.exists(input_path):
        print(f"❌ Fichier non trouvé : {input_path}")
        print("   Vérifie que le fichier existe dans data/silver/")
        return
    
    print(f"📂 Lecture : {input_path}")
    df = pd.read_parquet(input_path)
    print(f"   ✅ {len(df)} enregistrements chargés")
    print(f"   📋 Colonnes : {df.columns.tolist()}")
    
    # Détection des colonnes
    rue_col = None
    for col in ['rue', 'nom_rue', 'street_id', 'id', 'name']:
        if col in df.columns:
            rue_col = col
            break
    
    longueur_col = None
    for col in ['longueur', 'longueur_m', 'distance', 'length']:
        if col in df.columns:
            longueur_col = col
            break
    
    if rue_col is None:
        print("❌ Colonne 'rue' non trouvée !")
        return
    
    if longueur_col is None:
        print("❌ Colonne 'longueur' non trouvée !")
        return
    
    print(f"   🔄 Utilisation : rue='{rue_col}', longueur='{longueur_col}'")
    
    # Agrégation par rue
    df_grouped = df.groupby(rue_col)[longueur_col].sum().reset_index()
    df_grouped = df_grouped.rename(columns={rue_col: "rue", longueur_col: "longueur"})
    
    print(f"   ✅ {len(df_grouped)} rues uniques")
    
    # Score cyclable (basé sur la longueur)
    df_grouped["score"] = df_grouped["longueur"]
    
    # Normalisation
    df_grouped["score"] = min_max_scaling(df_grouped["score"])
    df_grouped["category"] = "cyclabilite"
    
    # Sauvegarde
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_grouped[["rue", "score", "category"]].to_parquet(output_path, index=False)
    
    print(f"\n✅ Sauvegarde réussie !")
    print(f"   📁 Fichier : {output_path}")
    print(f"   📊 {len(df_grouped)} rues traitées")
    print(f"   📈 Score moyen : {df_grouped['score'].mean():.3f}")
    print(f"   📈 Score max : {df_grouped['score'].max():.3f}")


if __name__ == "__main__":
    compute_kpi_cyclable()