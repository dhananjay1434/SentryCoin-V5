#!/usr/bin/env node

/**
 * Azure Diagnostic Script
 * 
 * Simple script to diagnose Azure startup issues
 */

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Azure Diagnostic Script Starting...');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('📦 Node Version:', process.version);

// Check environment variables
console.log('\n📋 Environment Variables Check:');
const requiredVars = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID', 
  'SYMBOL',
  'PORT'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`   ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
});

// Check optional variables
console.log('\n📋 Optional Variables:');
const optionalVars = [
  'EXCHANGE',
  'DANGER_RATIO',
  'ORDER_BOOK_DEPTH',
  'PRESSURE_THRESHOLD',
  'LIQUIDITY_THRESHOLD'
];

optionalVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`   ${varName}: ${value || 'Not set'}`);
});

// Create Express app
const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'Azure Diagnostic Running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    port: port
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'azure-diagnostic',
    timestamp: new Date().toISOString()
  });
});

app.get('/env', (req, res) => {
  const envVars = {};
  requiredVars.concat(optionalVars).forEach(varName => {
    envVars[varName] = process.env[varName] ? 'Set' : 'Missing';
  });
  
  res.json({
    environment: envVars,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// Start server
app.listen(port, () => {
  console.log(`\n🌐 Azure Diagnostic Server running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`📊 Environment: http://localhost:${port}/env`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Keep alive
setInterval(() => {
  console.log(`💓 Heartbeat: ${new Date().toISOString()} - Uptime: ${Math.floor(process.uptime())}s`);
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

console.log('\n✅ Azure Diagnostic Script initialized successfully');
console.log('🔄 Waiting for requests...');
