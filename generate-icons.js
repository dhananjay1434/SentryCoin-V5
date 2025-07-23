// Simple icon generator for PumpAlarm
// Run with: node generate-icons.js

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // White circle background for emoji
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.35, 0, 2 * Math.PI);
  ctx.fill();
  
  // Alarm emoji (simplified as text)
  ctx.fillStyle = '#ff4444';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚨', size/2, size/2);
  
  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join('frontend', 'public', filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${filename}`);
}

// Generate icons if canvas is available, otherwise use fallback
try {
  generateIcon(192, 'icon-192.png');
  generateIcon(512, 'icon-512.png');
  generateIcon(180, 'icon-apple-touch.png');
  console.log('✅ Icons generated successfully!');
} catch (error) {
  console.log('⚠️ Canvas not available, using fallback method...');
  console.log('📝 Please visit /icon-generator.html in your browser to generate icons manually');
  
  // Create simple SVG fallback
  const svgIcon = `
<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="192" height="192" fill="url(#grad)" />
  <circle cx="96" cy="96" r="60" fill="rgba(255,255,255,0.9)" />
  <text x="96" y="110" font-family="Arial" font-size="60" text-anchor="middle" fill="#ff4444">🚨</text>
</svg>`;
  
  fs.writeFileSync('frontend/public/icon.svg', svgIcon);
  console.log('✅ SVG fallback icon created!');
}
