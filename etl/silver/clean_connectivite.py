import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import os
import ast

RAW_DIR = "../../data/raw"
INTERMEDIATE_DIR = "../../data/intermediate"

def load_raw_connectivity():
    """
    Charge les données brutes de connectivité mobile + Wi-Fi.
    """
    mobile_path = os.path.join(RAW_DIR, "antennes-relais.csv")
    wifi_path = os.path.join(RAW_DIR, "sites-disposant-du-service-paris-wi-fi.csv")

    df_mobile = pd.read_csv(mobile_path, sep=";")
    df_wifi = pd.read_csv(wifi_path, sep=";")

    return df_mobile, df_wifi


# ---------------------------------------------------------
# 1) CLEAN MOBILE (ANTENNES)
# ---------------------------------------------------------

def clean_mobile(df_mobile):
    """
    Nettoyage des données antennes-relais.
    Le script détecte automatiquement les colonnes de coordonnées.
    """

    # --- Détection automatique des colonnes latitude / longitude ---
    possible_lat = ["lat", "latitude", "Latitude", "LAT", "Y"]
    possible_lon = ["lon", "longitude", "Longitude", "LON", "X"]

    lat_col = next((c for c in df_mobile.columns if c in possible_lat), None)
    lon_col = next((c for c in df_mobile.columns if c in possible_lon), None)

    # Si les colonnes n'existent pas, on tente d'extraire depuis un champ JSON
    if lat_col is None or lon_col is None:
        if "geo_point_2d" in df_mobile.columns:
            df_mobile["latitude"] = df_mobile["geo_point_2d"].apply(lambda x: float(x.split(",")[0]))
            df_mobile["longitude"] = df_mobile["geo_point_2d"].apply(lambda x: float(x.split(",")[1]))
            lat_col, lon_col = "latitude", "longitude"

        elif "coordonnees" in df_mobile.columns:
            df_mobile["coordonnees"] = df_mobile["coordonnees"].apply(lambda x: ast.literal_eval(x))
            df_mobile["latitude"] = df_mobile["coordonnees"].apply(lambda d: d["lat"])
            df_mobile["longitude"] = df_mobile["coordonnees"].apply(lambda d: d["lon"])
            lat_col, lon_col = "latitude", "longitude"

        else:
            raise ValueError("Impossible de détecter les colonnes latitude/longitude dans antennes-relais.csv")

    # --- Nettoyage ---
    df_mobile = df_mobile.dropna(subset=[lat_col, lon_col])

    # --- Conversion en GeoDataFrame ---
    gdf_mobile = gpd.GeoDataFrame(
        df_mobile,
        geometry=gpd.points_from_xy(df_mobile[lon_col], df_mobile[lat_col]),
        crs="EPSG:4326"
    )

    gdf_mobile = gdf_mobile.to_crs(2154)

    return gdf_mobile


# ---------------------------------------------------------
# 2) CLEAN WIFI
# ---------------------------------------------------------

def clean_wifi(df_wifi):
    """
    Nettoyage des hotspots Wi-Fi.
    """
    df_wifi = df_wifi.rename(columns={
        "geo_point_2d": "coords",
        "Nom du site": "wifi_site"
    })

    df_wifi["latitude"] = df_wifi["coords"].apply(lambda x: float(x.split(",")[0]))
    df_wifi["longitude"] = df_wifi["coords"].apply(lambda x: float(x.split(",")[1]))

    df_wifi = df_wifi.dropna(subset=["longitude", "latitude"])

    gdf_wifi = gpd.GeoDataFrame(
        df_wifi,
        geometry=gpd.points_from_xy(df_wifi.longitude, df_wifi.latitude),
        crs="EPSG:4326"
    )

    gdf_wifi = gdf_wifi.to_crs(2154)

    return gdf_wifi


# ---------------------------------------------------------
# 3) SPATIAL JOIN
# ---------------------------------------------------------

def spatial_join_with_streets(gdf, streets):
    return gpd.sjoin_nearest(
        gdf,
        streets[["street_id", "geometry"]],
        how="left",
        distance_col="distance_to_street"
    )


# ---------------------------------------------------------
# 4) AGGREGATION
# ---------------------------------------------------------

def aggregate_by_street(gdf_mobile, gdf_wifi):
    mobile_agg = gdf_mobile.groupby("street_id").agg({
        "distance_to_street": "mean"
    }).rename(columns={
        "distance_to_street": "mobile_distance_mean"
    })

    wifi_agg = gdf_wifi.groupby("street_id").agg({
        "wifi_site": "count",
        "distance_to_street": "mean"
    }).rename(columns={
        "wifi_site": "wifi_hotspots_count",
        "distance_to_street": "wifi_distance_mean"
    })

    merged = mobile_agg.join(wifi_agg, how="outer").fillna(0)
    return merged.reset_index()


# ---------------------------------------------------------
# 5) MAIN
# ---------------------------------------------------------

def main():
    print("🔵 Chargement des données brutes...")
    df_mobile, df_wifi = load_raw_connectivity()

    print("🔵 Nettoyage des données mobile...")
    gdf_mobile = clean_mobile(df_mobile)

    print("🔵 Nettoyage des données Wi-Fi...")
    gdf_wifi = clean_wifi(df_wifi)

    print("🔵 Chargement du référentiel des rues...")
    streets_path = os.path.join(INTERMEDIATE_DIR, "streets_base.parquet")
    streets = gpd.read_parquet(streets_path)

    print("🔵 Jointure spatiale mobile → rues...")
    gdf_mobile = spatial_join_with_streets(gdf_mobile, streets)

    print("🔵 Jointure spatiale wifi → rues...")
    gdf_wifi = spatial_join_with_streets(gdf_wifi, streets)

    print("🔵 Agrégation par rue...")
    df_silver = aggregate_by_street(gdf_mobile, gdf_wifi)

    output_path = os.path.join(INTERMEDIATE_DIR, "connectivite_rue_silver.parquet")
    df_silver.to_parquet(output_path, index=False)

    print(f"✅ Fichier Silver généré : {output_path}")


if __name__ == "__main__":
    main()