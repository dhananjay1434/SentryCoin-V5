/**
 * CRUCIBLE MANDATE 3: ResilientAPIClient - Total Resilience Architecture
 * 
 * ANTI-FRAGILITY MANDATE: All external API calls must be wrapped in this client
 * 
 * Features:
 * 1. Circuit Breaker (opossum) - Trips after 3 consecutive failures
 * 2. Exponential Backoff Retry (async-retry) - For transient network errors
 * 3. Provider Failover - Automatic failover to secondary providers
 * 4. Comprehensive Error Classification - Never crash workers on API errors
 */

import CircuitBreaker from 'opossum';
import retry from 'async-retry';
import axios from 'axios';

export default class ResilientAPIClient {
  constructor(config = {}) {
    this.logger = config.logger;
    this.providers = config.providers || {};
    this.circuitBreakers = new Map();
    
    // Circuit breaker configuration
    this.circuitBreakerOptions = {
      timeout: config.timeout || 10000,           // 10 second timeout
      errorThresholdPercentage: 50,               // Trip at 50% error rate
      resetTimeout: config.resetTimeout || 30000, // 30 second reset timeout
      rollingCountTimeout: 10000,                 // 10 second rolling window
      rollingCountBuckets: 10,                    // 10 buckets in window
      volumeThreshold: 3,                         // Minimum 3 requests before tripping
      ...config.circuitBreakerOptions
    };
    
    // Retry configuration
    this.retryOptions = {
      retries: config.retries || 3,
      factor: config.retryFactor || 2,
      minTimeout: config.minTimeout || 1000,
      maxTimeout: config.maxTimeout || 10000,
      randomize: true,
      ...config.retryOptions
    };
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      circuitBreakerTrips: 0,
      failoverEvents: 0,
      startTime: Date.now()
    };
    
    this.logger?.info('resilient_api_client_init', {
      circuitBreakerOptions: this.circuitBreakerOptions,
      retryOptions: this.retryOptions,
      providersConfigured: Object.keys(this.providers).length
    });
  }

  /**
   * CRUCIBLE MANDATE 3: Main resilient request method
   */
  async request(options) {
    const { url, method = 'GET', data, headers, providers, timeout } = options;
    
    this.stats.totalRequests++;
    
    // Determine provider list (primary + fallbacks)
    const providerList = this.getProviderList(providers, url);
    
    let lastError = null;
    
    for (let i = 0; i < providerList.length; i++) {
      const provider = providerList[i];
      const isFailover = i > 0;
      
      if (isFailover) {
        this.stats.failoverEvents++;
        this.logger?.warn('api_failover_attempt', {
          originalProvider: providerList[0].name,
          failoverProvider: provider.name,
          url: this.sanitizeUrl(url),
          attempt: i + 1
        });
      }
      
      try {
        const result = await this.executeRequestWithResilience(provider, {
          url: this.buildProviderUrl(provider, url),
          method,
          data,
          headers: { ...headers, ...provider.headers },
          timeout: timeout || provider.timeout || 10000
        });
        
        this.stats.successfulRequests++;
        
        if (isFailover) {
          this.logger?.info('api_failover_success', {
            provider: provider.name,
            url: this.sanitizeUrl(url)
          });
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        this.logger?.warn('api_provider_failed', {
          provider: provider.name,
          url: this.sanitizeUrl(url),
          error: error.message,
          isFailover,
          willRetryWithNextProvider: i < providerList.length - 1
        });
        
        // If this is a hard error (4xx) and not a network issue, don't try other providers
        if (this.isHardError(error)) {
          break;
        }
      }
    }
    
    // All providers failed
    this.stats.failedRequests++;
    
    const finalError = new Error(`All providers failed for ${this.sanitizeUrl(url)}: ${lastError?.message}`);
    finalError.originalError = lastError;
    finalError.providersAttempted = providerList.map(p => p.name);
    
    // CRUCIBLE MANDATE 3: Never crash workers - always return structured error
    this.logger?.warn('api_all_providers_failed', {
      url: this.sanitizeUrl(url),
      providersAttempted: finalError.providersAttempted,
      finalError: lastError?.message,
      stats: this.getStats()
    });
    
    throw finalError;
  }

  /**
   * Execute request with circuit breaker and retry logic
   */
  async executeRequestWithResilience(provider, requestOptions) {
    const circuitBreaker = this.getCircuitBreaker(provider);
    
    // Wrap the request in retry logic
    const resilientRequest = async () => {
      return await retry(async (bail) => {
        try {
          const response = await circuitBreaker.fire(requestOptions);
          return response;
        } catch (error) {
          // Don't retry on hard errors (4xx client errors)
          if (this.isHardError(error)) {
            bail(error);
            return;
          }
          
          // Retry on network errors, timeouts, 5xx errors
          this.stats.retriedRequests++;
          this.logger?.debug('api_retry_attempt', {
            provider: provider.name,
            error: error.message,
            url: this.sanitizeUrl(requestOptions.url)
          });
          
          throw error;
        }
      }, this.retryOptions);
    };
    
    return await resilientRequest();
  }

  /**
   * Get or create circuit breaker for provider
   */
  getCircuitBreaker(provider) {
    const key = provider.name;
    
    if (!this.circuitBreakers.has(key)) {
      const breaker = new CircuitBreaker(this.makeRequest.bind(this), this.circuitBreakerOptions);
      
      // Circuit breaker event handlers
      breaker.on('open', () => {
        this.stats.circuitBreakerTrips++;
        this.logger?.warn('circuit_breaker_opened', {
          provider: provider.name,
          reason: 'Error threshold exceeded'
        });
      });
      
      breaker.on('halfOpen', () => {
        this.logger?.info('circuit_breaker_half_open', {
          provider: provider.name,
          reason: 'Testing if service recovered'
        });
      });
      
      breaker.on('close', () => {
        this.logger?.info('circuit_breaker_closed', {
          provider: provider.name,
          reason: 'Service recovered'
        });
      });
      
      this.circuitBreakers.set(key, breaker);
    }
    
    return this.circuitBreakers.get(key);
  }

  /**
   * Make the actual HTTP request
   */
  async makeRequest(options) {
    const response = await axios(options);
    return response.data;
  }

  /**
   * Determine if error is a hard error (don't retry/failover)
   */
  isHardError(error) {
    if (error.response) {
      const status = error.response.status;
      // 4xx client errors are hard errors (except 429 rate limit)
      return status >= 400 && status < 500 && status !== 429;
    }
    return false;
  }

  /**
   * Get provider list with fallbacks
   */
  getProviderList(requestProviders, url) {
    // If specific providers requested, use those
    if (requestProviders && Array.isArray(requestProviders)) {
      return requestProviders.map(name => this.providers[name]).filter(Boolean);
    }
    
    // Auto-detect providers based on URL or use all configured
    const allProviders = Object.values(this.providers).filter(p => p.enabled);
    
    // Sort by priority (lower number = higher priority)
    return allProviders.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }

  /**
   * Build provider-specific URL
   */
  buildProviderUrl(provider, url) {
    if (provider.baseUrl) {
      return `${provider.baseUrl}${url}`;
    }
    return url;
  }

  /**
   * Sanitize URL for logging (remove API keys)
   */
  sanitizeUrl(url) {
    return url.replace(/[?&](api_?key|token|secret)=[^&]*/gi, '&$1=***');
  }

  /**
   * Get client statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const successRate = this.stats.totalRequests > 0 
      ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      successRate: parseFloat(successRate),
      circuitBreakersActive: this.circuitBreakers.size
    };
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown() {
    for (const [name, breaker] of this.circuitBreakers) {
      breaker.shutdown();
    }
    this.circuitBreakers.clear();
    
    this.logger?.info('resilient_api_client_shutdown', {
      stats: this.getStats()
    });
  }
}
