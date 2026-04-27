/**
 * Contrôleur Food (restaurants, marchés, food score)
 * À compléter avec les données réelles
 */

// Données mockées (à remplacer par données réelles)
const RESTAURANTS = [
  { id: 1, nom: 'Restaurant A', type: 'français', arrondissement: 1, lon: 2.3400, lat: 48.8600, note: 4.5 },
  { id: 2, nom: 'Restaurant B', type: 'italien', arrondissement: 4, lon: 2.3522, lat: 48.8566, note: 4.2 },
  { id: 3, nom: 'Restaurant C', type: 'asiatique', arrondissement: 8, lon: 2.3100, lat: 48.8750, note: 4.8 }
];

const MARCHES = [
  { id: 1, nom: 'Marché Barbès', arrondissement: 18, lon: 2.3500, lat: 48.8850 },
  { id: 2, nom: 'Marché Bastille', arrondissement: 11, lon: 2.3690, lat: 48.8530 }
];

/**
 * GET /api/food/restaurants
 */
exports.getRestaurants = (req, res) => {
  try {
    const { arrondissement, type } = req.query;
    let result = [...RESTAURANTS];

    if (arrondissement) {
      result = result.filter(r => r.arrondissement === parseInt(arrondissement));
    }
    if (type) {
      result = result.filter(r => r.type === type);
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/food/marches
 */
exports.getMarches = (req, res) => {
  try {
    const { arrondissement } = req.query;
    let result = [...MARCHES];

    if (arrondissement) {
      result = result.filter(m => m.arrondissement === parseInt(arrondissement));
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/food/score/:arrondissement
 */
exports.getFoodScore = (req, res) => {
  try {
    const arrondissement = parseInt(req.params.arrondissement);
    const restaurantsCount = RESTAURANTS.filter(r => r.arrondissement === arrondissement).length;
    const marchesCount = MARCHES.filter(m => m.arrondissement === arrondissement).length;
    
    // Calcul du score (à affiner avec données réelles)
    const score = Math.min(100, (restaurantsCount * 10) + (marchesCount * 20));

    res.json({
      success: true,
      data: {
        arrondissement,
        restaurants_count: restaurantsCount,
        marches_count: marchesCount,
        score
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};