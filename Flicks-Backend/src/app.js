const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const scrapeRoutes = require('./routes/scrape.routes');
const downloadRoutes = require('./routes/download.routes');
const proxyRoutes = require('./routes/proxy.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors());

// Request logging
app.use(morgan('dev'));

// Routes
app.use('/api/scrape', scrapeRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/proxy', proxyRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
