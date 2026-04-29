import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
 
/**
 * Hook pour l'initialisation et le contrôle de la carte MapLibre
 * @param {string} containerId - ID du conteneur HTML
 * @param {Object} options - Options de configuration
 * @returns {Object} - Méthodes et état de la carte
 */
export const useMap = (containerId, options = {}) => {
  const [map, setMap] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const mapRef = useRef(null);
  const isMounted = useRef(true);
 
  const defaultOptions = {
    center: [2.3522, 48.8566],
    zoom: 12,
    minZoom: 10,
    maxZoom: 18,
    style: options.style || "https://tiles.stadiamaps.com/styles/alidade_smooth.json",
    ...options,
  };
 
  // Initialisation de la carte
  useEffect(() => {
    isMounted.current = true;
 
    if (mapRef.current || !containerId) return;
 
    const mapInstance = new maplibregl.Map({
      container: containerId,
      ...defaultOptions,
    });
 
    // Gestionnaire de chargement
    mapInstance.on("load", () => {
      if (isMounted.current) {
        setIsLoaded(true);
        setMap(mapInstance);
      }
    });
 
    // Gestion des erreurs
    mapInstance.on("error", (e) => {
      console.error("MapLibre error:", e);
    });
 
    mapInstance.on("style.load", () => {
      console.log("Style chargé");
    });
 
    mapRef.current = mapInstance;
 
    // Nettoyage
    return () => {
      isMounted.current = false;
      if (mapRef.current) {
        try {
          // Supprimer tous les listeners avant de supprimer la carte
          mapRef.current.off();
          mapRef.current.remove();
        } catch (error) {
          console.error("Erreur lors du nettoyage de la carte:", error);
        }
        mapRef.current = null;
        setMap(null);
        setIsLoaded(false);
      }
    };
  }, [containerId]);
 
  /** Ajouter une source avec vérification */
  const addSource = useCallback((id, source) => {
    if (!mapRef.current) return false;
    if (mapRef.current.getSource(id)) return false;
   
    try {
      mapRef.current.addSource(id, source);
      return true;
    } catch (error) {
      console.error(`Erreur ajout source ${id}:`, error);
      return false;
    }
  }, []);
 
  /** Mettre à jour une source */
  const updateSource = useCallback((id, data) => {
    if (!mapRef.current) return false;
   
    const source = mapRef.current.getSource(id);
    if (!source) return false;
   
    try {
      source.setData(data);
      return true;
    } catch (error) {
      console.error(`Erreur mise à jour source ${id}:`, error);
      return false;
    }
  }, []);
 
  /** Vérifier si une source existe */
  const hasSource = useCallback((id) => {
    return mapRef.current?.getSource(id) !== undefined;
  }, []);
 
  /** Ajouter une couche avant une couche existante ou à la fin */
  const addLayer = useCallback((layer, beforeId = null) => {
    if (!mapRef.current) return false;
    if (mapRef.current.getLayer(layer.id)) return false;
   
    try {
      mapRef.current.addLayer(layer, beforeId || undefined);
      return true;
    } catch (error) {
      console.error(`Erreur ajout layer ${layer.id}:`, error);
      return false;
    }
  }, []);
 
  /** Supprimer une couche */
  const removeLayer = useCallback((id) => {
    if (!mapRef.current) return false;
    if (!mapRef.current.getLayer(id)) return false;
   
    try {
      mapRef.current.removeLayer(id);
      return true;
    } catch (error) {
      console.error(`Erreur suppression layer ${id}:`, error);
      return false;
    }
  }, []);
 
  /** Supprimer une source (et ses couches associées) */
  const removeSource = useCallback((id) => {
    if (!mapRef.current) return false;
    if (!mapRef.current.getSource(id)) return false;
   
    try {
      mapRef.current.removeSource(id);
      return true;
    } catch (error) {
      console.error(`Erreur suppression source ${id}:`, error);
      return false;
    }
  }, []);
 
  /** Déplacement fluide vers des coordonnées */
  const flyTo = useCallback((coordinates, zoom = 15, duration = 1500) => {
    if (mapRef.current && coordinates && coordinates.length === 2) {
      try {
        mapRef.current.flyTo({
          center: coordinates,
          zoom,
          duration,
          essential: true // Pour l'accessibilité
        });
      } catch (error) {
        console.error("Erreur flyTo:", error);
      }
    }
  }, []);
 
  /** Ajuster la vue à des limites */
  const fitBounds = useCallback((bounds, padding = 50) => {
    if (mapRef.current && bounds) {
      try {
        mapRef.current.fitBounds(bounds, { padding });
      } catch (error) {
        console.error("Erreur fitBounds:", error);
      }
    }
  }, []);
 
  /** Filtrer une couche */
  const setFilter = useCallback((layerId, filter) => {
    if (!mapRef.current) return false;
    if (!mapRef.current.getLayer(layerId)) return false;
   
    try {
      mapRef.current.setFilter(layerId, filter);
      return true;
    } catch (error) {
      console.error(`Erreur setFilter ${layerId}:`, error);
      return false;
    }
  }, []);
 
  /** Modifier une propriété de peinture */
  const setPaintProperty = useCallback((layerId, property, value) => {
    if (!mapRef.current) return false;
    if (!mapRef.current.getLayer(layerId)) return false;
   
    try {
      mapRef.current.setPaintProperty(layerId, property, value);
      return true;
    } catch (error) {
      console.error(`Erreur setPaintProperty ${layerId}:`, error);
      return false;
    }
  }, []);
 
  /** Ajouter un listener de clic sur une couche */
  const onClick = useCallback((layerId, callback) => {
    if (!mapRef.current) return () => {};
   
    const handler = (e) => {
      // Vérifier que le feature existe
      if (e.features && e.features.length > 0) {
        callback(e);
      }
    };
   
    mapRef.current.on("click", layerId, handler);
   
    // Retourner une fonction de nettoyage
    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", layerId, handler);
      }
    };
  }, []);
 
  /** Ajouter un listener de survol */
  const onHover = useCallback((layerId, onEnter, onLeave) => {
    if (!mapRef.current) return () => {};
   
    const handleMouseEnter = (e) => {
      if (onEnter) onEnter(e);
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      }
    };
   
    const handleMouseLeave = () => {
      if (onLeave) onLeave();
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = '';
      }
    };
   
    mapRef.current.on('mouseenter', layerId, handleMouseEnter);
    mapRef.current.on('mouseleave', layerId, handleMouseLeave);
   
    return () => {
      if (mapRef.current) {
        mapRef.current.off('mouseenter', layerId, handleMouseEnter);
        mapRef.current.off('mouseleave', layerId, handleMouseLeave);
      }
    };
  }, []);
 
  /** Obtenir le zoom actuel */
  const getZoom = useCallback(() => {
    return mapRef.current?.getZoom() || 0;
  }, []);
 
  /** Obtenir le centre actuel */
  const getCenter = useCallback(() => {
    const center = mapRef.current?.getCenter();
    return center ? [center.lng, center.lat] : [2.3522, 48.8566];
  }, []);
 
  /** Réinitialiser la vue */
  const resetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [2.3522, 48.8566],
        zoom: 12,
        duration: 1000
      });
    }
  }, []);
 
  return {
    // État
    map,
    isLoaded,
   
    // Sources
    addSource,
    updateSource,
    hasSource,
    removeSource,
   
    // Couches
    addLayer,
    removeLayer,
    setFilter,
    setPaintProperty,
   
    // Interactions
    onClick,
    onHover,
   
    // Navigation
    flyTo,
    fitBounds,
    getZoom,
    getCenter,
    resetView,
  };
};
 
export default useMap;


// import { useState, useEffect, useRef, useCallback } from 'react';
// import maplibregl from 'maplibre-gl';
// import 'maplibre-gl/dist/maplibre-gl.css';
// import { MAP_CONFIG, MAP_STYLE } from '../maps/mapConfig';

// export const useMap = (containerId, options = {}) => {
//   const [map, setMap] = useState(null);
//   const [isLoaded, setIsLoaded] = useState(false);
//   const mapRef = useRef(null);

//   const defaultOptions = {
//     center: MAP_CONFIG.center,
//     zoom: MAP_CONFIG.zoom,
//     minZoom: MAP_CONFIG.minZoom,
//     maxZoom: MAP_CONFIG.maxZoom,
//     style: MAP_STYLE,
//     ...options,
//   };

//   useEffect(() => {
//     if (mapRef.current || !containerId) return;

//     const mapInstance = new maplibregl.Map({
//       container: containerId,
//       ...defaultOptions,
//     });

//     mapInstance.on('load', () => {
//       setIsLoaded(true);
//     });

//     mapRef.current = mapInstance;
//     setMap(mapInstance);

//     return () => {
//       if (mapRef.current) {
//         mapRef.current.remove();
//         mapRef.current = null;
//       }
//     };
//   }, [containerId]);

//   const addSource = useCallback((id, source) => {
//     if (mapRef.current && !mapRef.current.getSource(id)) {
//       mapRef.current.addSource(id, source);
//       return true;
//     }
//     return false;
//   }, []);

//   const updateSource = useCallback((id, data) => {
//     if (mapRef.current && mapRef.current.getSource(id)) {
//       mapRef.current.getSource(id).setData(data);
//       return true;
//     }
//     return false;
//   }, []);

//   const addLayer = useCallback((layer, beforeId = null) => {
//     if (mapRef.current && !mapRef.current.getLayer(layer.id)) {
//       if (beforeId) {
//         mapRef.current.addLayer(layer, beforeId);
//       } else {
//         mapRef.current.addLayer(layer);
//       }
//       return true;
//     }
//     return false;
//   }, []);

//   const removeLayer = useCallback((id) => {
//     if (mapRef.current && mapRef.current.getLayer(id)) {
//       mapRef.current.removeLayer(id);
//       return true;
//     }
//     return false;
//   }, []);

//   const removeSource = useCallback((id) => {
//     if (mapRef.current && mapRef.current.getSource(id)) {
//       mapRef.current.removeSource(id);
//       return true;
//     }
//     return false;
//   }, []);

//   const flyTo = useCallback((coordinates, zoom = 15, duration = 1500) => {
//     if (mapRef.current) {
//       mapRef.current.flyTo({ center: coordinates, zoom, duration });
//     }
//   }, []);

//   const fitBounds = useCallback((bounds, padding = 50) => {
//     if (mapRef.current) {
//       mapRef.current.fitBounds(bounds, { padding });
//     }
//   }, []);

//   const setFilter = useCallback((layerId, filter) => {
//     if (mapRef.current && mapRef.current.getLayer(layerId)) {
//       mapRef.current.setFilter(layerId, filter);
//     }
//   }, []);

//   const setPaintProperty = useCallback((layerId, property, value) => {
//     if (mapRef.current && mapRef.current.getLayer(layerId)) {
//       mapRef.current.setPaintProperty(layerId, property, value);
//     }
//   }, []);

//   return {
//     map,
//     isLoaded,
//     addSource,
//     updateSource,
//     addLayer,
//     removeLayer,
//     removeSource,
//     flyTo,
//     fitBounds,
//     setFilter,
//     setPaintProperty,
//   };
// };

// export default useMap;
