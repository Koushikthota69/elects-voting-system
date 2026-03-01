// healthcheck.js - Health check for Docker
const http = require('http');
const { createCanvas } = require('canvas');

const APP_NAME = process.env.APP_NAME || 'evoting-backend';
const PORT = process.env.PORT || 5000;
const API_ROOT = process.env.API_URL || '/api/v1';

console.log(`🔍 ${APP_NAME} - Running health check...`);

// Test 1: Check Canvas functionality (for face recognition)
try {
  const canvas = createCanvas(1, 1);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'green';
  ctx.fillRect(0, 0, 1, 1);
  console.log(`✅ ${APP_NAME} - Canvas is working (required for face recognition)`);
} catch (canvasError) {
  console.error(`❌ ${APP_NAME} - Canvas health check failed:`, canvasError.message);
  process.exit(1);
}

// Test 2: Check main server health
const healthOptions = {
  host: 'localhost',
  port: PORT,
  path: '/health',
  timeout: 10000
};

const healthRequest = http.request(healthOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (res.statusCode === 200 && result.success) {
        console.log(`✅ ${APP_NAME} - Main health check passed:`, result.message);
        console.log(`✅ ${APP_NAME} - Database status:`, result.database);
        process.exit(0);
      } else {
        console.log(`❌ ${APP_NAME} - Main health check failed:`, result.message);
        process.exit(1);
      }
    } catch (parseError) {
      console.log(`❌ ${APP_NAME} - Health check parse error:`, parseError.message);
      process.exit(1);
    }
  });
});

healthRequest.on('error', (err) => {
  console.log(`❌ ${APP_NAME} - Main health check connection error:`, err.message);
  process.exit(1);
});

healthRequest.on('timeout', () => {
  console.log(`❌ ${APP_NAME} - Main health check timeout`);
  healthRequest.destroy();
  process.exit(1);
});

healthRequest.end();