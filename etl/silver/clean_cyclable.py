import pandas as pd
import re

def clean_cyclable():
    df = pd.read_parquet("data/bronze/cyclable.parquet")

    print("AVANT:", df.shape)

    df = df[[
        "Nom",
        "Longueur",
        "Vitesse maximale autorisée",
        "Infrastructure bidirectionnelle",
        "Aménagement temporaire"
    ]]

    print("APRES SELECTION:", df.shape)

    df = df.rename(columns={
        "Nom": "rue",
        "Longueur": "longueur",
        "Vitesse maximale autorisée": "vitesse",
        "Infrastructure bidirectionnelle": "bidirectionnel",
        "Aménagement temporaire": "temporaire"
    })

    # df["rue"] = df["rue"].astype(str).str.strip().str.lower()


   

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
    # df["rue"] = df["rue"].str.normalize('NFKD').str.encode('ascii', errors='ignore').str.decode('utf-8')
    print("APRES RENAME:", df.shape)

    # conversion
    df["longueur"] = pd.to_numeric(df["longueur"], errors="coerce")
    df["vitesse"] = pd.to_numeric(df["vitesse"], errors="coerce")


    # 👉 AJOUTE ICI
    df["longueur"] = df["longueur"].fillna(0)
    # df["vitesse"] = df["vitesse"].fillna(df["vitesse"].median())
    df["vitesse"] = df["vitesse"].fillna(30)


  

    print("APRES CONVERSION:", df.shape)

    # mapping
    df["bidirectionnel"] = df["bidirectionnel"].astype(str).str.lower().map({'oui': 1, 'non': 0})
    df["temporaire"] = df["temporaire"].astype(str).str.lower().map({'oui': 1, 'non': 0})

    print("APRES MAPPING:", df.shape)

    df.to_parquet("data/silver/cyclable_clean.parquet", index=False)

if __name__ == "__main__":
    clean_cyclable()




# import pandas as pd

# def clean_cyclable():
#     df = pd.read_parquet("data/bronze/cyclable.parquet")


#     # garder colonnes utiles
#     df = df[[
#         "Nom",
#         "Longueur",
#         "Vitesse maximale autorisée",
#         "Infrastructure bidirectionnelle",
#         "Aménagement temporaire"
#     ]]

#     # rename propre
#     df = df.rename(columns={
#         "Nom": "rue",
#         "Longueur": "longueur",
#         "Vitesse maximale autorisée": "vitesse",
#         "Infrastructure bidirectionnelle": "bidirectionnel",
#         "Aménagement temporaire": "temporaire"
#     })

#     # nettoyer
#     #df = df.dropna()
#     df = df.dropna(subset=["rue", "longueur", "vitesse", "bidirectionnel", "temporaire"])

#     # convertir en numérique si besoin
#     df["longueur"] = pd.to_numeric(df["longueur"], errors="coerce")
#     df["vitesse"] = pd.to_numeric(df["vitesse"], errors="coerce")

#      # mapper les valeurs oui/non en 0/1 avant conversion
#     # df["bidirectionnel"] = df["bidirectionnel"].str.lower().map({'oui': 1, 'non': 0})
#     # df["temporaire"] = df["temporaire"].str.lower().map({'oui': 1, 'non': 0})

#     df["bidirectionnel"] = df["bidirectionnel"].str.lower().map({'oui': 1, 'non': 0}).fillna(0)
#     df["temporaire"] = df["temporaire"].str.lower().map({'oui': 1, 'non': 0}).fillna(0)

#     # convertir en 0/1
#     df["bidirectionnel"] = df["bidirectionnel"].astype(int)
#     df["temporaire"] = df["temporaire"].astype(int)

#     df = df.dropna()

#     df.to_parquet("data/silver/cyclable_clean.parquet", index=False)

# if __name__ == "__main__":
#     clean_cyclable()