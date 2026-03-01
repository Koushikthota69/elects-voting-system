require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// ✅ FIX: Import all models to register them with Mongoose
// election.js now exports the model directly via module.exports = mongoose.model(...)
// so requiring it here registers it automatically
require('./models/user');
require('./models/candidate');
require('./models/election');         // ✅ Now uses module.exports = Election (not exports.Election)
require('./models/presidentialElection');
require('./models/ParlimentaryElection');
require('./models/ProvincialElection');
require('./models/party');

const app = express();

// App Configuration
const APP_NAME = process.env.APP_NAME || 'evoting-backend';
const API_ROOT = process.env.API_URL || '/api/v1';
const PORT = process.env.PORT || 5000;

console.log(`🚀 Starting ${APP_NAME}...`);

// Middlewares
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/public/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Routers
const usersRoutes = require('./routers/users');
const electionRoutes = require('./routers/election');
const presidentialElectionRoutes = require('./routers/presidentialElection');
const provincialElectionRoutes = require('./routers/provincialElections');
const parlimentaryElectionRoutes = require('./routers/parlimentaryElection');
const candidateRoutes = require('./routers/candidate');
const projectRoutes = require('./routers/project');
const partyRoutes = require('./routers/parties');
const passwordRoutes = require('./routers/passwords');
const complaintRoutes = require('./routers/complaints');
const candidateDescriptionRoutes = require('./routers/candidateDescriptionRoutes');
const adminRoutes = require('./routers/admins');
const uploadRoutes = require('./routers/uploadRoute');
const reportFakeRoutes = require('./routers/reportFakes');
const peoplesRoutes = require('./routers/peoples');
const verificationRoutes = require('./routers/verifications');
const resultsRoutes = require('./routers/results');

// Root health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: `${APP_NAME} API is working!`,
    app: APP_NAME,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: ['authentication', 'elections', 'face-recognition', 'voting']
  });
});

// API Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: `${APP_NAME} is healthy`,
    app: APP_NAME,
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    services: {
      database: mongoose.connection.readyState === 1,
      face_recognition: true
    }
  });
});

// Face recognition health check endpoint
app.get('/api/verifications/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: `${APP_NAME} - Face recognition service is running`,
    app: APP_NAME,
    timestamp: new Date().toISOString(),
    service: 'face-recognition'
  });
});

// Mount Routers
app.use(`${API_ROOT}/users`, usersRoutes);
app.use(`${API_ROOT}/elections`, electionRoutes);
app.use(`${API_ROOT}/presidentialElections`, presidentialElectionRoutes);
app.use(`${API_ROOT}/provincialElections`, provincialElectionRoutes);
app.use(`${API_ROOT}/parlimentaryElections`, parlimentaryElectionRoutes);
app.use(`${API_ROOT}/candidates`, candidateRoutes);
app.use(`${API_ROOT}/projects`, projectRoutes);
app.use(`${API_ROOT}/parties`, partyRoutes);
app.use(`${API_ROOT}/passwords`, passwordRoutes);
app.use(`${API_ROOT}/complaints`, complaintRoutes);
app.use(`${API_ROOT}/candidateDescription`, candidateDescriptionRoutes);
app.use(`${API_ROOT}/admins`, adminRoutes);
app.use(`${API_ROOT}/upload`, uploadRoutes);
app.use(`${API_ROOT}/reportFakes`, reportFakeRoutes);
app.use(`${API_ROOT}/peoples`, peoplesRoutes);
app.use(`${API_ROOT}/verifications`, verificationRoutes);
app.use(`${API_ROOT}/results`, resultsRoutes);

// Validate Environment Variable
if (!process.env.CONNECTION_STRING) {
  console.warn("⚠️ Warning: CONNECTION_STRING not set, using default mongodb://localhost:27017");
}

const connString = process.env.CONNECTION_STRING || 'mongodb://localhost:27017/ElectSDatabase';

// Connect to MongoDB
mongoose
  .connect(connString, {
    dbName: 'ElectSDatabase',
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log(`✅ ${APP_NAME} - Database Connected Successfully`))
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log(`✅ ${APP_NAME} - MongoDB connected successfully`);
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ ${APP_NAME} - MongoDB connection error:`, err);
});

mongoose.connection.on('disconnected', () => {
  console.log(`⚠️ ${APP_NAME} - MongoDB disconnected`);
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error(`🔥 ${APP_NAME} - Server Error:`, err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    app: APP_NAME,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// 404 Handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    app: APP_NAME,
    availableRoutes: [
      `${API_ROOT}/users`,
      `${API_ROOT}/elections`,
      `${API_ROOT}/verifications`,
      `${API_ROOT}/candidates`,
      `${API_ROOT}/results`
    ]
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n🛑 ${APP_NAME} - Received SIGINT. Shutting down gracefully...`);
  await mongoose.connection.close();
  console.log(`✅ ${APP_NAME} - MongoDB connection closed.`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`\n🛑 ${APP_NAME} - Received SIGTERM. Shutting down gracefully...`);
  await mongoose.connection.close();
  console.log(`✅ ${APP_NAME} - MongoDB connection closed.`);
  process.exit(0);
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 ${APP_NAME} is running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 API Root: ${API_ROOT}`);
  console.log(`🗄️ Database: ${connString.split('@').pop() || connString}`);
  console.log(`👤 Face Recognition: Available at ${API_ROOT}/verifications/facerecognition`);
});