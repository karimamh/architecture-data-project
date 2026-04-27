import pandas as pd
import re
 
 
def clean_marche():
    df = pd.read_parquet("data/bronze/marches_decouverts.parquet")
 
    print("AVANT:", df.shape)
 
    df = df[[
        "Nom court",
        "Nom complet",
        "Localisation",
        "Produit",
        "Arrondissement",
        "Linéaire commercial",
        "LUNDI",
        "MARDI",
        "MERCREDI",
        "JEUDI",
        "VENDREDI",
        "SAMEDI",
        "DIMANCHE"
    ]]
 
    print("APRES SELECTION:", df.shape)
 
    df = df.rename(columns={
        "Nom court": "nom_court",
        "Nom complet": "nom_complet",
        "Localisation": "rue",
        "Produit": "produit",
        "Arrondissement": "arrondissement",
        "Linéaire commercial": "lineaire",
        "LUNDI": "lundi",
        "MARDI": "mardi",
        "MERCREDI": "mercredi",
        "JEUDI": "jeudi",
        "VENDREDI": "vendredi",
        "SAMEDI": "samedi",
        "DIMANCHE": "dimanche"
    })
 
    df["rue"] = (
        df["rue"]
        .astype(str)
        .str.lower()
        .str.strip()
        .str.replace(r"\s+", " ", regex=True)  # espaces multiples
        .str.replace(r"[^\w\s]", "", regex=True)  # enlever ponctuation
    )
 
    df = df[df["rue"] != ""]
    df = df[df["rue"] != "nan"]
 
    print("APRES RENAME:", df.shape)
 
    df["lineaire"] = pd.to_numeric(df["lineaire"], errors="coerce")
    df["arrondissement"] = pd.to_numeric(df["arrondissement"], errors="coerce")
 
    for col in ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
 
    df["lineaire"] = df["lineaire"].fillna(0)
    df["arrondissement"] = df["arrondissement"].fillna(0)
 
    for col in ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]:
        df[col] = df[col].fillna(0)
 
    print("APRES CONVERSION:", df.shape)
 
    df["jours_ouverture"] = (
        df["lundi"]
        + df["mardi"]
        + df["mercredi"]
        + df["jeudi"]
        + df["vendredi"]
        + df["samedi"]
        + df["dimanche"]
    )
 
    print("APRES MAPPING:", df.shape)
 
    df.to_parquet("data/silver/marche_clean.parquet", index=False)
 
 
if __name__ == "__main__":
    clean_marche()