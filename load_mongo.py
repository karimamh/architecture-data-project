from pymongo import MongoClient
import pandas as pd


# -----------------------------
# Connexion Mongo Docker
# -----------------------------

# client = MongoClient(
#     "mongodb://localhost:27017/"
# )

client = MongoClient("mongodb://localhost:27018")

db = client["urban_gold"]

col = db["street_kpis"]


# reset collection
col.drop()

print("Collection vidée")


# -----------------------------
# Charger les gold parquets
# -----------------------------

transport = pd.read_parquet(
    "data/gold/kpi_transport.parquet"
)

cyclable = pd.read_parquet(
    "data/gold/kpi_cyclable.parquet"
)

connect = pd.read_parquet(
    "data/gold/kpi_connectivite_rue.parquet"
)

marche = pd.read_parquet(
    "data/gold/kpi_marche.parquet"
)


print(
f"Transport: {len(transport)}"
)

print(
f"Cyclable: {len(cyclable)}"
)

print(
f"Connectivite: {len(connect)}"
)

print(
f"Marche: {len(marche)}"
)


# -----------------------------
# Construction documents
# -----------------------------

docs = {}


# Base = transport
for _, row in transport.iterrows():

    sid = int(row["street_id"])

    docs[sid] = {

        "street_id": sid,

        "transport": {
            "score":
              float(
                row["score_final"]
              ),

            "station_count":
              int(
                row["station_count"]
              ),

            "classe":
              row[
               "classe_accessibilite"
              ]
        }
    }


# enrichir cyclable
for _, row in cyclable.iterrows():

    sid = int(
      row["street_id"]
    )

    if sid in docs:

        docs[sid][
         "cyclable"
        ] = {

          "score":
            float(
              row["score"]
            )
        }


# enrichir connectivite
for _, row in connect.iterrows():

    sid=int(
      row["street_id"]
    )

    if sid in docs:

        docs[sid][
         "connectivite"
        ] = {

          "score":
             float(
               row[
                "kpi_connectivite"
               ]
             ),

          "wifi_hotspots":
             int(
               row[
                "wifi_hotspots_count"
               ]
             ),

          "antennas":
             int(
               row[
                "mobile_antennas_count"
               ]
             )
        }


# enrichir marchés
for _, row in marche.iterrows():

    sid=int(
      row["street_id"]
    )

    if sid in docs:

        docs[sid][
         "marche"
        ]={

          "score":
             float(
               row["score"]
             )
        }



# -----------------------------
# Score global
# -----------------------------

for sid,doc in docs.items():

    scores=[]

    for k in [
      "transport",
      "cyclable",
      "connectivite",
      "marche"
    ]:

        if k in doc:
            scores.append(
               doc[k]["score"]
            )

    if scores:

        doc[
         "global_score"
        ]=(
           sum(scores)/
           len(scores)
        )


# -----------------------------
# Insert Mongo
# -----------------------------

print(
f"Docs préparés: {len(docs)}"
)

res = col.insert_many(
    list(docs.values())
)

print(
f"Insérés: {len(res.inserted_ids)}"
)

print(
"Mongo contient:",
col.count_documents({})
)


print("\nExemple document :\n")

print(
col.find_one()
)