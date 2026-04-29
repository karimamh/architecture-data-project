import os
import sys
import subprocess


def run(cmd):
    print(f"\n🚀 Running: {cmd}\n")
    
    result = subprocess.run(
        cmd,
        shell=True
    )

    if result.returncode != 0:
        print(f"\n❌ Erreur sur: {cmd}")
        sys.exit(1)


if __name__ == "__main__":

    # Vérifie que le venv est activé
    if sys.prefix == sys.base_prefix:
        print("⚠️ Active ton environnement virtuel avant :")
        print("venv\\Scripts\\activate")
        sys.exit(1)


    commands = [

        # -----------------------------
        # Install dependencies
        # -----------------------------
        f"{sys.executable} -m pip install -r requirements.txt",

        # -----------------------------
        # Docker services
        # -----------------------------
        "docker compose up -d",

        # -----------------------------
        # Bronze
        # -----------------------------
        # "python etl/bronze/build_streets.py",

        "python etl/bronze/download_antennes.py",
        "python etl/bronze/download_cyclable.py",
        "python etl/bronze/download_marche.py",
        "python etl/bronze/download_paris_wifi.py",
        "python etl/bronze/download_rues.py",
        "python etl/bronze/download_transport.py",

        # -----------------------------
        # Silver
        # -----------------------------
        "python etl/silver/clean_connectivite.py",
        "python etl/silver/clean_cyclable.py",
        "python etl/silver/clean_marche.py",
        "python etl/silver/clean_transport.py",

        # -----------------------------
        # Gold
        # -----------------------------
        "python etl/gold/kpi_connectivite_rue.py",
        "python etl/gold/kpi_cyclable.py",
        "python etl/gold/kpi_marche.py",
        "python etl/gold/kpi_transport.py",

        # -----------------------------
        # Load PostgreSQL
        # -----------------------------
        "python load_postgres.py",

        # Foreign keys / constraints
        "psql -U postgres -d architecture_data -f sql/schema_constraints.sql",

        # -----------------------------
        # Load Mongo
        # -----------------------------
        "python load_mongo.py"
    ]


    for cmd in commands:
        run(cmd)

    print("\n✅ Projet initialisé avec succès !")



# import os

# commands = [

# "docker compose up -d",

# # "python etl/bronze/build_streets.py",

# "python etl/bronze/download_antennes.py",
# "python etl/bronze/download_cyclable.py",
# "python etl/bronze/download_marche.py",
# "python etl/bronze/download_paris_wifi.py",
# "python etl/bronze/download_rues.py",
# "python etl/bronze/download_transport.py",



# "python etl/silver/clean_connectivite.py",
# "python etl/silver/clean_cyclable.py",
# "python etl/silver/clean_marche.py",
# "python etl/silver/clean_transport.py",


# "python etl/gold/kpi_connectivite_rue.py",
# "python etl/gold/kpi_cyclable.py",
# "python etl/gold/kpi_marche.py",
# "python etl/gold/kpi_transport.py",

# "python load_postgres.py",

# 'psql -U postgres -d architecture_data -f sql/schema_constraints.sql',

# "python load_mongo.py"
# ]

# for cmd in commands:
#     print(f"Running {cmd}")
#     os.system(cmd)