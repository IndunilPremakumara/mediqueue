/**
 * Simple Circuit Breaker Implementation
 */
class CircuitBreaker {
  constructor(serviceName, failureThreshold = 3, resetTimeout = 10000) {
    this.serviceName = serviceName;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF-OPEN
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttempt) {
        this.state = "HALF-OPEN";
        console.log(`[CircuitBreaker] ${this.serviceName} state: HALF-OPEN`);
      } else {
        throw new Error(`[CircuitBreaker] ${this.serviceName} is currently OPEN (stopped)`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    if (this.state !== "CLOSED") {
      console.log(`[CircuitBreaker] ${this.serviceName} state: CLOSED (Restored)`);
    }
    this.state = "CLOSED";
  }

  onFailure(error) {
    this.failures++;
    console.log(`[CircuitBreaker] ${this.serviceName} failure count: ${this.failures}`);
    if (this.failures >= this.failureThreshold || this.state === "HALF-OPEN") {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`[CircuitBreaker] ${this.serviceName} state: OPEN (Tripped for ${this.resetTimeout / 1000}s)`);
    }
  }
}

/**
 * Simple Retry Helper
 */
async function retry(fn, retries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        console.log(`[Retry] Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

// Map to store circuit breakers for different services
const breakers = {};

/**
 * Fetch with Resilience (Retry + Circuit Breaker)
 */
async function fetchWithResilience(url, options = {}, serviceName = "default") {
  if (!breakers[serviceName]) {
    breakers[serviceName] = new CircuitBreaker(serviceName);
  }

  const breaker = breakers[serviceName];

  return breaker.call(() => retry(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }
    return response.json();
  }));
}

module.exports = { CircuitBreaker, retry, fetchWithResilience };
