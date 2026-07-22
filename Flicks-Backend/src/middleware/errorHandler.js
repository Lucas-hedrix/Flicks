const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({
    error: 'Internal Server Error'
  });
};

module.exports = errorHandler;
