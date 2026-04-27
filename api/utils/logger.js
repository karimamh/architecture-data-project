/**
 * Logger - Système de journalisation
 * Centralise les logs de l'application
 */

// Couleurs pour la console (optionnel)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  /**
   * Formate un message avec timestamp
   */
  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message} ${args.join(' ')}`.trim();
  }

  /**
   * Ajoute un log à la mémoire
   */
  addToMemory(level, message, ...args) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      args
    };
    
    this.logs.push(logEntry);
    
    // Limiter la taille des logs en mémoire
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Log info (informations générales)
   */
  info(message, ...args) {
    const formatted = this.formatMessage('INFO', message, ...args);
    console.log(`${colors.green}${formatted}${colors.reset}`);
    this.addToMemory('INFO', message, ...args);
  }

  /**
   * Log error (erreurs)
   */
  error(message, ...args) {
    const formatted = this.formatMessage('ERROR', message, ...args);
    console.error(`${colors.red}${formatted}${colors.reset}`);
    this.addToMemory('ERROR', message, ...args);
  }

  /**
   * Log warn (avertissements)
   */
  warn(message, ...args) {
    const formatted = this.formatMessage('WARN', message, ...args);
    console.warn(`${colors.yellow}${formatted}${colors.reset}`);
    this.addToMemory('WARN', message, ...args);
  }

  /**
   * Log debug (débogage)
   */
  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('DEBUG', message, ...args);
      console.debug(`${colors.cyan}${formatted}${colors.reset}`);
      this.addToMemory('DEBUG', message, ...args);
    }
  }

  /**
   * Log success (succès)
   */
  success(message, ...args) {
    const formatted = this.formatMessage('SUCCESS', message, ...args);
    console.log(`${colors.green}✅ ${formatted}${colors.reset}`);
    this.addToMemory('SUCCESS', message, ...args);
  }

  /**
   * Récupère tous les logs en mémoire
   */
  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Vide les logs en mémoire
   */
  clearLogs() {
    this.logs = [];
    this.info('Logs effacés');
  }
}

// Export d'une instance unique (singleton)
const logger = new Logger();

module.exports = logger;