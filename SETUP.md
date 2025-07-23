# PumpAlarm MVP - Setup Guide

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ installed
- Modern browser (Chrome, Firefox, Safari, Edge)

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd PumpAlarm

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Generate VAPID Keys

```bash
cd backend
npx web-push generate-vapid-keys
```

Copy the generated keys and create `backend/.env`:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=your_email@example.com
PORT=3000
NODE_ENV=development
```

### 4. Build Frontend

```bash
cd frontend
npm run build
```

### 5. Start the Application

```bash
cd backend
npm start
```

### 6. Open Browser

Navigate to `http://localhost:3000` and:
1. Allow push notifications when prompted
2. Set a test alert (e.g., BTC above $1)
3. Wait for the notification!

## Testing the Application

### Manual Testing
1. **Frontend**: Visit `http://localhost:3000`
2. **API Health**: `curl http://localhost:3000/api/health`
3. **VAPID Key**: `curl http://localhost:3000/api/vapid-public-key`

### Setting Test Alerts
- Use popular coins like BTC, ETH, SOL
- Set realistic price targets based on current market
- Check browser console for any errors

### Verifying Price Monitoring
- Server logs will show WebSocket connection status
- Price updates are processed in real-time from Binance
- Alerts are checked against every price update

## Deployment to Render.com

### 1. Prepare Repository
- Ensure all files are committed to Git
- Push to GitHub/GitLab

### 2. Create Render Service
1. Connect your repository to Render
2. Choose "Web Service"
3. Use the included `render.yaml` configuration

### 3. Set Environment Variables
In Render dashboard, add:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`

### 4. Deploy
Render will automatically build and deploy using the `render.yaml` configuration.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │    │   Express Server │    │  Binance API    │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ React App   │◄┼────┼►│ REST API     │ │    │ │ WebSocket   │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ │ Stream      │ │
│                 │    │                  │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │                 │
│ │Service      │◄┼────┼►│ Push         │◄┼────┤                 │
│ │Worker       │ │    │ │ Notifications│ │    │                 │
│ └─────────────┘ │    │ └──────────────┘ │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Features

### ✅ Implemented
- Real-time price monitoring via Binance WebSocket
- Browser push notifications
- Simple alert form (coin, condition, price)
- One-shot alerts (trigger once and remove)
- In-memory alert storage
- Responsive web interface

### ⚠️ MVP Limitations
- **No persistence**: Alerts lost on server restart
- **No authentication**: Anyone can set alerts
- **No alert management**: Can't view/edit/delete alerts
- **Single notification channel**: Only browser push
- **No rate limiting**: Potential for abuse

### 🚀 Future Enhancements
- Database persistence (PostgreSQL/Supabase)
- User authentication and accounts
- Alert management dashboard
- Multiple notification channels (Telegram, SMS, Email)
- Advanced alert conditions (percentage changes, volume)
- Alert history and analytics

## Troubleshooting

### Push Notifications Not Working
1. Check browser permissions (allow notifications)
2. Verify VAPID keys are correctly set
3. Ensure HTTPS in production (required for push notifications)
4. Check browser console for service worker errors

### Server Connection Issues
1. Verify port 3000 is available
2. Check firewall settings
3. Ensure all dependencies are installed
4. Check server logs for WebSocket connection status

### Price Data Not Updating
1. Verify internet connection
2. Check Binance WebSocket status in logs
3. Ensure coin symbols are valid (BTC, ETH, SOL, etc.)
4. Check for rate limiting from Binance

## Support

For issues and questions:
1. Check the browser console for errors
2. Review server logs for connection issues
3. Verify environment variables are set correctly
4. Test with popular cryptocurrencies first

## License

MIT License - See LICENSE file for details.
