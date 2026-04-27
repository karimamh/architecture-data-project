/**
 * GeoUtils - Utilitaires géographiques
 * Fonctions pour les calculs géospatiaux
 */

class GeoUtils {
  constructor() {
    // Rayon terrestre moyen en km
    this.EARTH_RADIUS_KM = 6371;
    
    // Bounding box de Paris
    this.PARIS_BOUNDS = {
      minLon: 2.2241,
      minLat: 48.8155,
      maxLon: 2.4698,
      maxLat: 48.9021
    };
  }

  /**
   * Convertit des degrés en radians
   * @param {number} degrees - Angle en degrés
   * @returns {number} Angle en radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convertit des radians en degrés
   * @param {number} radians - Angle en radians
   * @returns {number} Angle en degrés
   */
  toDeg(radians) {
    return radians * (180 / Math.PI);
  }

  /**
   * Calcule la distance entre deux points (formule de Haversine)
   * @param {number} lon1 - Longitude point 1
   * @param {number} lat1 - Latitude point 1
   * @param {number} lon2 - Longitude point 2
   * @param {number} lat2 - Latitude point 2
   * @returns {number} Distance en kilomètres
   */
  haversineDistance(lon1, lat1, lon2, lat2) {
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Vérifie si un point est dans un polygone
   * @param {Array} point - [lon, lat]
   * @param {Array} polygon - Tableau de points [[lon, lat], ...]
   * @returns {boolean}
   */
  pointInPolygon(point, polygon) {
    let inside = false;
    const x = point[0];
    const y = point[1];
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) &&
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Vérifie si des coordonnées sont dans Paris
   * @param {number} lon - Longitude
   * @param {number} lat - Latitude
   * @returns {boolean}
   */
  isInParis(lon, lat) {
    return lon >= this.PARIS_BOUNDS.minLon &&
           lon <= this.PARIS_BOUNDS.maxLon &&
           lat >= this.PARIS_BOUNDS.minLat &&
           lat <= this.PARIS_BOUNDS.maxLat;
  }

  /**
   * Calcule le centroïde d'un polygone
   * @param {Array} polygon - Tableau de points [[lon, lat], ...]
   * @returns {Array} [lon, lat]
   */
  polygonCentroid(polygon) {
    let sumX = 0;
    let sumY = 0;
    let sumArea = 0;
    
    for (let i = 0; i < polygon.length - 1; i++) {
      const x1 = polygon[i][0];
      const y1 = polygon[i][1];
      const x2 = polygon[i + 1][0];
      const y2 = polygon[i + 1][1];
      const cross = x1 * y2 - x2 * y1;
      
      sumX += (x1 + x2) * cross;
      sumY += (y1 + y2) * cross;
      sumArea += cross;
    }
    
    const area = sumArea / 2;
    return [sumX / (6 * area), sumY / (6 * area)];
  }

  /**
   * Calcule la bounding box d'une liste de points
   * @param {Array} points - Tableau de points [[lon, lat], ...]
   * @returns {Object} { minLon, minLat, maxLon, maxLat }
   */
  computeBBox(points) {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    
    points.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    });
    
    return { minLon, minLat, maxLon, maxLat };
  }

  /**
   * Crée une bounding box autour d'un point
   * @param {number} lon - Longitude du centre
   * @param {number} lat - Latitude du centre
   * @param {number} radiusKm - Rayon en kilomètres
   * @returns {Object} { minLon, minLat, maxLon, maxLat }
   */
  createBBox(lon, lat, radiusKm = 1) {
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(this.toRad(lat)));
    
    return {
      minLon: lon - lonDelta,
      minLat: lat - latDelta,
      maxLon: lon + lonDelta,
      maxLat: lat + latDelta
    };
  }

  /**
   * Simplifie une ligne (réduction du nombre de points)
   * @param {Array} points - Tableau de points [[lon, lat], ...]
   * @param {number} tolerance - Tolérance en kilomètres
   * @returns {Array} Points simplifiés
   */
  simplifyLine(points, tolerance = 0.1) {
    if (points.length <= 2) return points;
    
    const result = [points[0]];
    let lastPoint = points[0];
    
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      const distance = this.haversineDistance(
        lastPoint[0], lastPoint[1],
        point[0], point[1]
      );
      
      if (distance > tolerance) {
        result.push(point);
        lastPoint = point;
      }
    }
    
    result.push(points[points.length - 1]);
    return result;
  }

  /**
   * Calcule la densité de points par km²
   * @param {number} pointCount - Nombre de points
   * @param {number} areaKm2 - Surface en km²
   * @returns {number} Densité
   */
  calculateDensity(pointCount, areaKm2) {
    if (areaKm2 <= 0) return 0;
    return pointCount / areaKm2;
  }

  /**
   * Convertit un point GeoJSON en object simple
   * @param {Object} feature - Feature GeoJSON
   * @returns {Object} { lon, lat, properties }
   */
  featureToPoint(feature) {
    const [lon, lat] = feature.geometry.coordinates;
    return {
      lon,
      lat,
      properties: feature.properties
    };
  }

  /**
   * Crée un point GeoJSON
   * @param {number} lon - Longitude
   * @param {number} lat - Latitude
   * @param {Object} properties - Propriétés optionnelles
   * @returns {Object} Feature GeoJSON
   */
  createPointFeature(lon, lat, properties = {}) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      properties
    };
  }

  /**
   * Crée une FeatureCollection GeoJSON
   * @param {Array} features - Tableau de features
   * @returns {Object} FeatureCollection GeoJSON
   */
  createFeatureCollection(features) {
    return {
      type: 'FeatureCollection',
      features
    };
  }
}

module.exports = new GeoUtils();