# 🚀 SentryCoin v4.x → v5.0 "Apex Predator" Migration Guide

## 📊 **Migration Overview**

This guide helps you migrate from SentryCoin v4.x to the new v5.0 "Apex Predator" multi-strategy architecture. The migration preserves all existing functionality while adding powerful new capabilities.

## 🎯 **What's New in v5.0**

### **Major Enhancements**
- ✅ **Multi-Strategy Orchestration**: Run multiple strategies simultaneously
- ✅ **ETH_UNWIND Macro Strategy**: Sophisticated Ethereum macro trading
- ✅ **Enhanced Intelligence**: Real-time derivatives and on-chain data
- ✅ **Conflict Resolution**: Prevents conflicting trades across strategies
- ✅ **Forensic Audit Trail**: Complete decision-making transparency
- ✅ **Advanced Risk Management**: Multi-layer position and exposure controls

### **Backward Compatibility**
- ✅ **CASCADE_HUNTER**: Fully compatible with v4.x configuration
- ✅ **COIL_WATCHER**: Alert-only functionality preserved
- ✅ **SHAKEOUT_DETECTOR**: Alert-only functionality preserved
- ✅ **Whale Monitoring**: All v4.x whale intelligence preserved
- ✅ **Configuration**: Existing `.env` settings work unchanged

## 🔧 **Migration Steps**

### **Step 1: Backup Current System**
```bash
# Create backup of current configuration
cp .env .env.v4.backup
cp -r data data.v4.backup
cp -r logs logs.v4.backup
```

### **Step 2: Update Configuration**
Add the following new configuration keys to your `.env` file:

```env
# v5.0 Multi-Strategy Configuration
ENABLED_STRATEGIES=CASCADE_HUNTER,ETH_UNWIND
ENABLE_CONFLICT_RESOLUTION=true
MAX_CONCURRENT_STRATEGIES=5

# ETH_UNWIND Strategy (optional - can be disabled initially)
ETH_UNWIND_ENABLED=false
ETH_UNWIND_SYMBOL=ETHUSDT
ETH_UNWIND_SUPPORT=3600
ETH_UNWIND_RESISTANCE=3850
ETH_UNWIND_TP1=3000
ETH_UNWIND_TP2=2800
ETH_UNWIND_OI_ATH=24000000000
ETH_UNWIND_FUNDING_SPIKE=0.018
ETH_UNWIND_ELR_DANGER=0.90
ETH_UNWIND_EXCHANGE_INFLOW=50000
ETH_UNWIND_MAX_POSITION=10000
ETH_UNWIND_STOP_LOSS=7.0
ETH_UNWIND_COOLDOWN_HOURS=12

# Data Services
DERIVATIVES_MONITOR_ENABLED=true
DERIVATIVES_UPDATE_INTERVAL=300000
ONCHAIN_V2_ENABLED=true
ONCHAIN_UPDATE_INTERVAL=600000

# Strategy Priorities
CASCADE_HUNTER_PRIORITY=7
ETH_UNWIND_PRIORITY=10
COIL_WATCHER_PRIORITY=3
SHAKEOUT_DETECTOR_PRIORITY=3
```

### **Step 3: Test Migration**
```bash
# Run v5.0 integration test
node tests/v5-integration-test.js

# Run comprehensive test suite
node tests/v5-apex-predator-test.js

# Test ETH_UNWIND strategy (if enabled)
node tests/eth-unwind-test.js
```

### **Step 4: Gradual Deployment**

#### **Phase 1: Conservative Migration (Recommended)**
```env
# Start with CASCADE_HUNTER only
ENABLED_STRATEGIES=CASCADE_HUNTER
ETH_UNWIND_ENABLED=false
DERIVATIVES_MONITOR_ENABLED=false
```

#### **Phase 2: Enhanced Intelligence**
```env
# Add derivatives monitoring
DERIVATIVES_MONITOR_ENABLED=true
ONCHAIN_V2_ENABLED=true
```

#### **Phase 3: Full v5.0 Deployment**
```env
# Enable all v5.0 features
ENABLED_STRATEGIES=CASCADE_HUNTER,ETH_UNWIND
ETH_UNWIND_ENABLED=true
```

## 📊 **Configuration Mapping**

### **v4.x → v5.0 Configuration Changes**

| v4.x Setting | v5.0 Equivalent | Notes |
|--------------|-----------------|-------|
| `CASCADE_TRADING_ENABLED` | `CASCADE_HUNTER` in `ENABLED_STRATEGIES` | Now part of strategy list |
| `TRIFECTA_TRADING_ENABLED` | `CASCADE_HUNTER` in `ENABLED_STRATEGIES` | Renamed for clarity |
| `COIL_WATCHER_ENABLED` | `COIL_WATCHER` in `ENABLED_STRATEGIES` | Alert-only functionality |
| `SHAKEOUT_DETECTOR_ENABLED` | `SHAKEOUT_DETECTOR` in `ENABLED_STRATEGIES` | Alert-only functionality |
| All existing thresholds | Unchanged | Full backward compatibility |

### **New v5.0 Settings**

| Setting | Purpose | Default |
|---------|---------|---------|
| `ENABLED_STRATEGIES` | List of active strategies | `CASCADE_HUNTER` |
| `ENABLE_CONFLICT_RESOLUTION` | Prevent conflicting trades | `true` |
| `ETH_UNWIND_*` | ETH macro strategy config | Various |
| `DERIVATIVES_MONITOR_ENABLED` | Enable derivatives intelligence | `true` |
| `*_PRIORITY` | Strategy priority levels | Strategy-specific |

## 🎯 **Strategy Migration**

### **CASCADE_HUNTER (formerly TRIFECTA)**
- ✅ **No changes required** - all v4.x settings work unchanged
- ✅ **Enhanced with conflict resolution** - prevents opposing trades
- ✅ **Improved signal quality** - better filtering and validation

### **COIL_WATCHER & SHAKEOUT_DETECTOR**
- ✅ **Alert-only functionality preserved**
- ✅ **Enhanced with v5.0 intelligence**
- ✅ **Integrated with conflict resolution**

### **New: ETH_UNWIND**
- 🆕 **Macro Ethereum strategy** with state machine logic
- 🆕 **Multi-domain triggers** (derivatives, on-chain, technical)
- 🆕 **Professional position management**
- 🆕 **Configurable risk parameters**

## 📈 **Performance Comparison**

### **v4.x vs v5.0 Capabilities**

| Feature | v4.x | v5.0 |
|---------|------|------|
| **Concurrent Strategies** | 1 (CASCADE_HUNTER) | 5+ (configurable) |
| **Signal Conflicts** | Manual monitoring | Automatic resolution |
| **Market Intelligence** | Order book only | Multi-domain (derivatives, on-chain) |
| **Position Management** | Basic | Advanced with state machines |
| **Audit Trail** | Basic logging | Forensic decision tracking |
| **Risk Management** | Strategy-level | Multi-layer (strategy, portfolio, system) |

## 🛡️ **Risk Management Migration**

### **Enhanced Risk Controls in v5.0**
```javascript
// v4.x: Single strategy risk
CASCADE_MAX_POSITION=500
CASCADE_STOP_LOSS=2.0

// v5.0: Multi-strategy risk management
CASCADE_MAX_POSITION=500          // Individual strategy limit
ETH_UNWIND_MAX_POSITION=10000     // Macro strategy limit
MAX_EXPOSURE_PERCENTAGE=50        // Total portfolio exposure
MAX_ACTIVE_POSITIONS=5            // Cross-strategy position limit
```

## 🔍 **Monitoring & Diagnostics**

### **Enhanced Monitoring in v5.0**
- **Strategy Manager Status**: Real-time strategy performance
- **Conflict Resolution Logs**: Signal conflict tracking
- **Intelligence Alerts**: Derivatives and on-chain events
- **Decision Audit Trail**: Complete reasoning for every action

### **API Endpoints**
```javascript
// v4.x endpoints (still available)
GET /status          // System status
GET /performance     // Performance metrics

// New v5.0 endpoints
GET /strategies      // Strategy manager status
GET /intelligence    // Market intelligence summary
GET /conflicts       // Recent conflict resolutions
GET /decisions       // Decision audit trail
```

## 🧪 **Testing Your Migration**

### **Validation Checklist**
- [ ] v5.0 integration test passes
- [ ] CASCADE_HUNTER strategy operational
- [ ] Conflict resolution working
- [ ] Intelligence services running (if enabled)
- [ ] ETH_UNWIND strategy functional (if enabled)
- [ ] Performance monitoring active
- [ ] Risk limits properly configured

### **Rollback Plan**
If issues arise, you can quickly rollback:

```bash
# Stop v5.0 system
pkill -f "node src/index.js"

# Restore v4.x configuration
cp .env.v4.backup .env

# Restart with v4.x settings
npm start
```

## 📚 **Additional Resources**

- **Architecture Documentation**: `docs/v5/ARCHITECTURE.md`
- **v5.0 Test Suite**: `tests/v5/`
- **Configuration Reference**: `.env.v5.example`
- **Troubleshooting**: `TROUBLESHOOTING.md`

## 🎉 **Migration Complete!**

Once migration is complete, you'll have:
- ✅ **Backward-compatible** v4.x functionality
- ✅ **Enhanced** multi-strategy capabilities
- ✅ **Advanced** market intelligence
- ✅ **Professional** risk management
- ✅ **Institutional-grade** audit trails

Your SentryCoin system is now ready to operate as a sophisticated "Apex Predator" trading platform! 🛡️
