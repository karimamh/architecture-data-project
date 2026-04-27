import pandas as pd
from utils.normalization import min_max_scaling
 
 
def _select_input_path():
    """Utilise silver si disponible, sinon bronze."""
    silver_path = "data/silver/marche_clean.parquet"
    bronze_path = "data/bronze/marches_decouverts.parquet"
 
    for path in [silver_path, bronze_path]:
        try:
            pd.read_parquet(path, columns=[])
            return path
        except Exception:
            continue
 
    raise FileNotFoundError(
        "Aucun fichier d'entrée trouvé: data/silver/marche_clean.parquet ou data/bronze/marches_decouverts.parquet"
    )
 
 
def _first_existing_column(df, candidates):
    for col in candidates:
        if col in df.columns:
            return col
    return None
 
 
def compute_kpi_marche():
    input_path = _select_input_path()
    df = pd.read_parquet(input_path)
 
    location_col = _first_existing_column(df, ["rue", "Localisation", "Nom court", "Nom complet"])
    lineaire_col = _first_existing_column(df, ["lineaire", "Linéaire commercial", "lineaire_commercial"])
 
    if location_col is None:
        raise ValueError("Aucune colonne de localisation trouvée (rue/Localisation/Nom court/Nom complet).")
 
    if lineaire_col is None:
        raise ValueError("Aucune colonne de linéaire trouvée (Linéaire commercial).")
 
    day_cols = [
        col for col in ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"]
        if col in df.columns
    ]
 
    # Nettoyage minimal des clés d'agrégation
    df[location_col] = (
        df[location_col]
        .astype(str)
        .str.lower()
        .str.strip()
        .str.replace(r"\s+", " ", regex=True)
    )
    df = df[(df[location_col] != "") & (df[location_col] != "nan")]
 
    df[lineaire_col] = pd.to_numeric(df[lineaire_col], errors="coerce").fillna(0)
 
    for day_col in day_cols:
        df[day_col] = pd.to_numeric(df[day_col], errors="coerce").fillna(0)
 
    agg_map = {lineaire_col: "sum"}
    for day_col in day_cols:
        agg_map[day_col] = "sum"
 
    df_grouped = df.groupby(location_col).agg(agg_map).reset_index()
 
    # Même logique de composition que kpi_cyclable (2 sous-scores + pondération 60/40)
    df_grouped["jours_ouverture"] = 0
    if day_cols:
        df_grouped["jours_ouverture"] = df_grouped[day_cols].sum(axis=1)
 
    df_grouped["score_marche"] = (
        df_grouped[lineaire_col]
        + 0.2 * df_grouped["jours_ouverture"]
    )
 
    df_grouped["score_frequence"] = df_grouped["jours_ouverture"]
 
    df_grouped["score"] = (
        0.6 * df_grouped["score_marche"]
        + 0.4 * df_grouped["score_frequence"]
    )
 
    df_grouped["score"] = min_max_scaling(df_grouped["score"])
    df_grouped["category"] = "marche"
 
    df_grouped = df_grouped.rename(columns={location_col: "rue"})
 
    df_grouped[["rue", "score", "category"]].to_parquet(
        "data/gold/kpi_marche.parquet",
        index=False
    )
 
 
if __name__ == "__main__":
    compute_kpi_marche()