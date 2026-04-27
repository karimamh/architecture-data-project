/**
 * FileLoader - Gestionnaire de fichiers
 * Permet de lire des fichiers JSON, CSV, etc.
 */

const fs = require('fs');
const path = require('path');

class FileLoader {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Lit un fichier JSON et retourne un objet
   * @param {string} filepath - Chemin relatif du fichier
   * @returns {Object} Données JSON parsées
   */
  readJSON(filepath) {
    const fullPath = path.join(this.basePath, filepath);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Erreur lecture JSON ${fullPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Lit un fichier GeoJSON
   * @param {string} filepath - Chemin relatif du fichier
   * @returns {Object} Données GeoJSON
   */
  readGeoJSON(filepath) {
    return this.readJSON(filepath);
  }

  /**
   * Lit un fichier CSV
   * @param {string} filepath - Chemin relatif du fichier
   * @param {string} separator - Séparateur de colonnes (défaut: ';')
   * @returns {Array} Tableau d'objets
   */
  readCSV(filepath, separator = ';') {
    const fullPath = path.join(this.basePath, filepath);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const headers = lines[0].split(separator).map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(separator);
        const row = {};
        
        headers.forEach((header, idx) => {
          let value = values[idx]?.trim() || '';
          // Convertir les nombres si possible
          if (!isNaN(value) && value !== '') {
            value = parseFloat(value);
          }
          row[header] = value;
        });
        
        data.push(row);
      }
      
      return data;
    } catch (error) {
      console.error(`Erreur lecture CSV ${fullPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Vérifie si un fichier existe
   * @param {string} filepath - Chemin relatif du fichier
   * @returns {boolean}
   */
  exists(filepath) {
    return fs.existsSync(path.join(this.basePath, filepath));
  }

  /**
   * Écrit un fichier JSON
   * @param {string} filepath - Chemin relatif du fichier
   * @param {Object} data - Données à écrire
   */
  writeJSON(filepath, data) {
    const fullPath = path.join(this.basePath, filepath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Liste les fichiers d'un dossier
   * @param {string} directory - Chemin relatif du dossier
   * @param {string} extension - Extension optionnelle (ex: '.json')
   * @returns {Array} Liste des noms de fichiers
   */
  listFiles(directory, extension = null) {
    const fullPath = path.join(this.basePath, directory);
    let files = fs.readdirSync(fullPath);
    
    if (extension) {
      files = files.filter(f => f.endsWith(extension));
    }
    
    return files;
  }

  /**
   * Crée un dossier s'il n'existe pas
   * @param {string} directory - Chemin relatif du dossier
   */
  ensureDir(directory) {
    const fullPath = path.join(this.basePath, directory);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

module.exports = new FileLoader();