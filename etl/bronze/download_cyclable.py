import pandas as pd

def download_cyclable():
    df = pd.read_csv("data/raw/amenagements-cyclables.csv", sep=";",
    encoding="utf-8-sig")
   

    print(df.columns)  # 👈 vérification

    df.to_parquet("data/bronze/cyclable.parquet", index=False)


if __name__ == "__main__":
    download_cyclable()

