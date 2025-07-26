#!/usr/bin/env node

import express from 'express';

const app = express();
const port = process.env.PORT || 10000;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'phoenix-test',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Phoenix Engine Test Server',
    status: 'running',
    port: port
  });
});

app.listen(port, () => {
  console.log(`✅ Test Express server running on port ${port}`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  
  // Auto-exit after 3 seconds for testing
  setTimeout(() => {
    console.log('✅ Test complete - Express server working');
    process.exit(0);
  }, 3000);
});
