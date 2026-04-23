# Lancer tout ton projet en 1 commande


from bronze.download_cyclable import download_cyclable
from silver.clean_cyclable import clean_cyclable
from gold.kpi_cyclable import compute_kpi_cyclable

def run_pipeline():
    download_cyclable()
    clean_cyclable()
    compute_kpi_cyclable()

if __name__ == "__main__":
    run_pipeline()



