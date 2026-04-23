import pandas as pd
import os

#INTERMEDIATE_DIR = "data/intermediate"
SILVER_DIR = "data/silver"
GOLD_DIR = "data/gold"

def compute_scores(df):
    """
    Calcule le score brut, le score max et le score total normalisé (0-100)
    selon la formule fournie par Ewa.
    """

    # 1) Nombre d'antennes mobiles par rue
    # On considère qu'une antenne est associée à une rue si elle apparaît dans le Silver
    df["mobile_antennas_count"] = df["mobile_distance_mean"].apply(lambda x: 1 if x > 0 else 0)

    # 2) Score brut = 2 * antennes + bornes wifi
    df["score_brut"] = (
        2 * df["mobile_antennas_count"]
        + df["wifi_hotspots_count"]
    )

    # 3) Score max
    score_max = df["score_brut"].max()

    # 4) Score total normalisé (0–100)
    df["kpi_connectivite"] = (df["score_brut"] / score_max) * 100

    return df


def main():
    print("🔵 Chargement du fichier Silver...")
    silver_path = os.path.join(SILVER_DIR, "connectivite_rue.parquet")
    df = pd.read_parquet(silver_path)

    print("🔵 Calcul du KPI Connectivité...")
    df_gold = compute_scores(df)

    print("🔵 Sauvegarde du fichier Gold...")
    os.makedirs(GOLD_DIR, exist_ok=True)
    output_path = os.path.join(GOLD_DIR, "kpi_connectivite_rue.parquet")
    df_gold.to_parquet(output_path, index=False)

    print(f"✅ KPI Connectivité généré : {output_path}")


if __name__ == "__main__":
    main()