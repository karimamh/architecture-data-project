import pandas as pd
from utils.normalization import min_max_scaling

def compute_kpi_cyclable():
    df = pd.read_parquet("data/silver/cyclable_clean.parquet")

    # agrégation par rue
    df_grouped = df.groupby("rue").agg({
        "longueur": "sum",
        "vitesse": "mean",
        "bidirectionnel": "sum",
        "temporaire": "sum"
    }).reset_index()

    # 🚲 score cyclable
    df_grouped["score_cyclable"] = (
        df_grouped["longueur"]
        + 0.2 * df_grouped["bidirectionnel"]
        - 0.1 * df_grouped["temporaire"]
    )

    # 🚗 score calme
    df_grouped["score_calme"] = 1 / df_grouped["vitesse"]

    # ⭐ score final (60% / 40%)
    df_grouped["score"] = (
        0.6 * df_grouped["score_cyclable"] +
        0.4 * df_grouped["score_calme"]
    )

    # normalisation
    df_grouped["score"] = min_max_scaling(df_grouped["score"])

    df_grouped["category"] = "cyclabilite"

    df_grouped[["rue", "score", "category"]]\
        .to_parquet("data/gold/kpi_cyclable.parquet", index=False)

if __name__ == "__main__":
    compute_kpi_cyclable()