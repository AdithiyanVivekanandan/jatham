require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');
const setupSwagger = require('./swagger');

// Initialize DB (skip in tests, as tests will spin up their own in-memory db)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

// Set up Swagger
setupSwagger(app);

// 1. Security Headers
app.use(helmet());

// 2. CORS (Whitelist frontend URL)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 3. Body Parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// 4. Data Sanitization against NoSQL query injection
// app.use(mongoSanitize());

// 5. Data Sanitization against XSS
// app.use(xss());

// 6. Rate Limiting (General)
app.use('/api', generalLimiter);

// Custom Morgan format — never log body, never log sensitive headers
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/communities', require('./routes/communities'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

module.exports = app;
