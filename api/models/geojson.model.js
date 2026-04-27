/**
 * Modèle GeoJSON
 * Structure standardisée pour les données géographiques
 */

class GeoJSONModel {
  constructor(features = []) {
    this.type = 'FeatureCollection';
    this.features = features;
  }

  // Ajouter une feature
  addFeature(feature) {
    this.features.push(feature);
    return this;
  }

  // Ajouter plusieurs features
  addFeatures(features) {
    this.features.push(...features);
    return this;
  }

  // Créer un point
  static createPoint(lon, lat, properties = {}) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      properties
    };
  }

  // Créer une ligne
  static createLineString(coordinates, properties = {}) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates
      },
      properties
    };
  }

  // Créer un polygone
  static createPolygon(coordinates, properties = {}) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates
      },
      properties
    };
  }

  // Créer un MultiPoint
  static createMultiPoint(coordinates, properties = {}) {
    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPoint',
        coordinates
      },
      properties
    };
  }

  // Convertir un tableau de points en FeatureCollection
  static fromPoints(points, pointToProperties = (p) => ({})) {
    const features = points.map(point => 
      GeoJSONModel.createPoint(point.lon, point.lat, pointToProperties(point))
    );
    return new GeoJSONModel(features);
  }

  // Convertir en objet JSON
  toJSON() {
    return {
      type: this.type,
      features: this.features,
      metadata: {
        generated_at: new Date().toISOString(),
        feature_count: this.features.length
      }
    };
  }
}

module.exports = GeoJSONModel;