import sys
import os
import pandas as pd
import numpy as np

# Ajout du chemin parent pour trouver les modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.normalization import min_max_scaling


def compute_kpi_cyclable():
    """
    Calcule le KPI de cyclabilité par rue
    """
    print("=" * 60)
    print("🚲 Calcul du KPI de cyclabilité")
    print("=" * 60)
    
    # Chemins absolus pour éviter les erreurs
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(base_dir, '../..'))
    
    input_path = os.path.join(project_root, "data", "silver", "cyclable_clean.parquet")
    output_path = os.path.join(project_root, "data", "gold", "kpi_cyclable.parquet")
    
    # Vérification du fichier d'entrée
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Fichier introuvable : {input_path}")
    
    print(f"📂 Lecture : {input_path}")
    df = pd.read_parquet(input_path)
    print(f"   ✅ {len(df)} enregistrements chargés")
    
    # Affichage des colonnes disponibles (debug)
    print(f"   📋 Colonnes : {df.columns.tolist()}")
    
    # Adaptation des noms de colonnes (selon ton fichier)
    # Ajuste les noms si nécessaire
    colonne_rue = "rue" if "rue" in df.columns else "nom_rue" if "nom_rue" in df.columns else "street_id"
    colonne_longueur = "longueur" if "longueur" in df.columns else "longueur_m" if "longueur_m" in df.columns else "distance"
    colonne_vitesse = "vitesse" if "vitesse" in df.columns else "speed" if "speed" in df.columns else None
    colonne_bidirectionnel = "bidirectionnel" if "bidirectionnel" in df.columns else "two_way" if "two_way" in df.columns else None
    colonne_temporaire = "temporaire" if "temporaire" in df.columns else "temporary" if "temporary" in df.columns else None
    
    print(f"   🔄 Mapping : rue='{colonne_rue}', longueur='{colonne_longueur}'")
    
    # Agrégation par rue
    agg_dict = {colonne_longueur: "sum"}
    if colonne_vitesse:
        agg_dict[colonne_vitesse] = "mean"
    if colonne_bidirectionnel:
        agg_dict[colonne_bidirectionnel] = "sum"
    if colonne_temporaire:
        agg_dict[colonne_temporaire] = "sum"
    
    df_grouped = df.groupby(colonne_rue).agg(agg_dict).reset_index()
    print(f"   ✅ {len(df_grouped)} rues uniques après agrégation")
    
    # Renommage pour standardisation
    df_grouped = df_grouped.rename(columns={
        colonne_rue: "rue",
        colonne_longueur: "longueur"
    })
    
    if colonne_vitesse:
        df_grouped = df_grouped.rename(columns={colonne_vitesse: "vitesse"})
    if colonne_bidirectionnel:
        df_grouped = df_grouped.rename(columns={colonne_bidirectionnel: "bidirectionnel"})
    if colonne_temporaire:
        df_grouped = df_grouped.rename(columns={colonne_temporaire: "temporaire"})
    
    # 🚲 Score cyclable (longueur + bonus bidirectionnel - malus temporaire)
    df_grouped["score_cyclable"] = df_grouped["longueur"]
    
    if "bidirectionnel" in df_grouped.columns:
        df_grouped["score_cyclable"] += 0.2 * df_grouped["bidirectionnel"]
    
    if "temporaire" in df_grouped.columns:
        df_grouped["score_cyclable"] -= 0.1 * df_grouped["temporaire"]
    
    # Éviter les scores négatifs
    df_grouped["score_cyclable"] = df_grouped["score_cyclable"].clip(lower=0)
    
    # 🚗 Score calme (plus la vitesse est faible, plus la rue est calme)
    if "vitesse" in df_grouped.columns:
        # Éviter la division par zéro
        df_grouped["vitesse"] = df_grouped["vitesse"].replace(0, np.nan)
        df_grouped["score_calme"] = 1 / df_grouped["vitesse"]
        df_grouped["score_calme"] = df_grouped["score_calme"].fillna(0)
    else:
        df_grouped["score_calme"] = 0.5  # Valeur par défaut
    
    # ⭐ Score final (60% cyclable / 40% calme)
    df_grouped["score"] = (
        0.6 * df_grouped["score_cyclable"] +
        0.4 * df_grouped["score_calme"]
    )
    
    # Normalisation entre 0 et 1
    if df_grouped["score"].max() != df_grouped["score"].min():
        df_grouped["score"] = min_max_scaling(df_grouped["score"])
    else:
        df_grouped["score"] = 0.5  # Valeur par défaut si toutes identiques
    
    df_grouped["category"] = "cyclabilite"
    
    # Création du dossier gold s'il n'existe pas
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Sauvegarde
    print(f"💾 Sauvegarde : {output_path}")
    df_grouped[["rue", "score", "category"]].to_parquet(output_path, index=False)
    
    # Statistiques finales
    print("\n📊 STATISTIQUES FINALES")
    print(f"   Nombre de rues cyclables : {len(df_grouped)}")
    print(f"   Score moyen : {df_grouped['score'].mean():.3f}")
    print(f"   Score min : {df_grouped['score'].min():.3f}")
    print(f"   Score max : {df_grouped['score'].max():.3f}")
    
    # Top 5 des rues les plus cyclables
    top_streets = df_grouped.nlargest(5, "score")[["rue", "score"]]
    print("\n   🚲 Top 5 rues les plus cyclables :")
    for _, row in top_streets.iterrows():
        print(f"      - {row['rue']}: {row['score']:.3f}")
    
    print("\n✅ KPI cyclabilité calculé avec succès !")
    return df_grouped


if __name__ == "__main__":
    try:
        compute_kpi_cyclable()
    except Exception as e:
        print(f"\n❌ ERREUR : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)