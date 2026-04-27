/**
 * Contrôleur des arrondissements
 * Gère les endpoints : /api/arrondissements
 */

// Données mockées (20 arrondissements de Paris)
const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  numero: i + 1,
  nom: `${i + 1}ème arrondissement`,
  prix_m2_median: Math.floor(9000 + Math.random() * 13000),
  logements_sociaux_pct: Number((10 + Math.random() * 30).toFixed(1)),
  wifi_count: Math.floor(Math.random() * 60),
  antennes_count: Math.floor(Math.random() * 250),
  surface_km2: Number((1 + Math.random() * 3.5).toFixed(2)),
  population: Math.floor(20000 + Math.random() * 90000),
  monuments: [
    i === 0 ? 'Louvre' : null,
    i === 3 ? 'Notre-Dame' : null,
    i === 6 ? 'Jardin du Luxembourg' : null,
    i === 7 ? 'Tour Eiffel' : null,
    i === 8 ? 'Champs-Élysées' : null
  ].filter(Boolean)
}));

/**
 * GET /api/arrondissements
 * Récupère tous les arrondissements
 */
const getAllArrondissements = (req, res) => {
  try {
    const { limit, minPrice, maxPrice } = req.query;
    let result = [...ARRONDISSEMENTS];

    if (minPrice) {
      result = result.filter(a => a.prix_m2_median >= parseInt(minPrice));
    }
    if (maxPrice) {
      result = result.filter(a => a.prix_m2_median <= parseInt(maxPrice));
    }
    if (limit) {
      result = result.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      count: result.length,
      data: result,
      metadata: {
        source: 'Urban Data Explorer API',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/arrondissements/:id
 * Récupère un arrondissement par son ID
 */
const getArrondissementById = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const arrondissement = ARRONDISSEMENTS.find(a => a.id === id);

    if (!arrondissement) {
      return res.status(404).json({
        success: false,
        error: `Arrondissement ${id} non trouvé`
      });
    }

    res.json({
      success: true,
      data: arrondissement,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/arrondissements/:id/kpi
 * Récupère les KPI d'un arrondissement spécifique
 */
const getArrondissementKPI = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const arrondissement = ARRONDISSEMENTS.find(a => a.id === id);

    if (!arrondissement) {
      return res.status(404).json({ success: false, error: 'Arrondissement non trouvé' });
    }

    res.json({
      success: true,
      data: {
        arrondissement: arrondissement.numero,
        prix_m2_median: arrondissement.prix_m2_median,
        logements_sociaux_pct: arrondissement.logements_sociaux_pct,
        wifi_density: (arrondissement.wifi_count / arrondissement.surface_km2).toFixed(2),
        antennes_density: (arrondissement.antennes_count / arrondissement.surface_km2).toFixed(2),
        population_density: Math.floor(arrondissement.population / arrondissement.surface_km2)
      },
      metadata: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/arrondissements/stats/global
 * Récupère les statistiques globales
 */
const getGlobalStats = (req, res) => {
  try {
    const total = ARRONDISSEMENTS.length;
    const avgPrice = Math.floor(ARRONDISSEMENTS.reduce((a, b) => a + b.prix_m2_median, 0) / total);
    const avgSocial = Number((ARRONDISSEMENTS.reduce((a, b) => a + b.logements_sociaux_pct, 0) / total).toFixed(1));
    const totalWifi = ARRONDISSEMENTS.reduce((a, b) => a + b.wifi_count, 0);
    const totalAntennes = ARRONDISSEMENTS.reduce((a, b) => a + b.antennes_count, 0);
    const totalPopulation = ARRONDISSEMENTS.reduce((a, b) => a + b.population, 0);
    const totalSurface = ARRONDISSEMENTS.reduce((a, b) => a + b.surface_km2, 0);

    res.json({
      success: true,
      data: {
        total_arrondissements: total,
        prix_m2_moyen: avgPrice,
        logements_sociaux_moyen: avgSocial,
        total_hotspots_wifi: totalWifi,
        total_antennes_mobiles: totalAntennes,
        population_totale: totalPopulation,
        surface_totale_km2: Number(totalSurface.toFixed(2)),
        densite_moyenne: Math.floor(totalPopulation / totalSurface)
      },
      metadata: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export des fonctions
module.exports = {
  getAllArrondissements,
  getArrondissementById,
  getArrondissementKPI,
  getGlobalStats
};