/**
 * Service Géographique
 * Utilitaires pour les calculs géospatiaux
 */

class GeoService {
  constructor() {
    // Bounding box de Paris
    this.parisBounds = {
      minLon: 2.2241,
      minLat: 48.8155,
      maxLon: 2.4698,
      maxLat: 48.9021
    };
  }

  /**
   * Vérifie si des coordonnées sont dans Paris
   */
  isInParis(lon, lat) {
    return lon >= this.parisBounds.minLon && 
           lon <= this.parisBounds.maxLon && 
           lat >= this.parisBounds.minLat && 
           lat <= this.parisBounds.maxLat;
  }

  /**
   * Calcule la distance entre deux points (Haversine) en km
   */
  distance(lon1, lat1, lon2, lat2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Calcule le centroïde d'un polygone
   */
  polygonCentroid(coordinates) {
    let sumX = 0, sumY = 0, sumArea = 0;
    const ring = coordinates[0];
    
    for (let i = 0; i < ring.length - 1; i++) {
      const x1 = ring[i][0];
      const y1 = ring[i][1];
      const x2 = ring[i + 1][0];
      const y2 = ring[i + 1][1];
      const cross = x1 * y2 - x2 * y1;
      sumX += (x1 + x2) * cross;
      sumY += (y1 + y2) * cross;
      sumArea += cross;
    }
    
    const area = sumArea / 2;
    return [sumX / (6 * area), sumY / (6 * area)];
  }

  /**
   * Crée une bounding box autour d'un point
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
   * Calcule la densité de points dans une zone
   */
  calculateDensity(points, areaKm2) {
    return points.length / areaKm2;
  }
}

module.exports = new GeoService();