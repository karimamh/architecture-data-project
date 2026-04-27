from math import radians, sin, cos, sqrt, atan2

def to_geojson_point(lon, lat):
    """Crée un point GeoJSON."""
    if lon is None or lat is None:
        return None
    return {
        "type": "Point",
        "coordinates": [float(lon), float(lat)]
    }

def to_feature(geometry, properties=None):
    """Crée un Feature GeoJSON."""
    return {
        "type": "Feature",
        "geometry": geometry,
        "properties": properties or {}
    }

def to_feature_collection(features):
    """Crée une FeatureCollection GeoJSON."""
    return {
        "type": "FeatureCollection",
        "features": features
    }

def haversine_distance(lat1, lon1, lat2, lon2):
    """Distance en km entre deux points géographiques."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c
