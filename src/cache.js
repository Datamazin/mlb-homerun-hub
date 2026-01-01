// Simple localStorage-based cache with TTL
// Optimizes API calls by caching responses with time-to-live

const CACHE_PREFIX = 'mlb_hr_hub_';
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get item from cache if it exists and is not expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export function getCached(key) {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const item = localStorage.getItem(cacheKey);
    
    if (!item) return null;
    
    const { data, timestamp, ttl } = JSON.parse(item);
    const now = Date.now();
    
    // Check if expired
    if (now - timestamp > ttl) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log(`📦 Cache HIT: ${key}`);
    return data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Set item in cache with optional TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default 1 hour)
 */
export function setCache(key, data, ttl = DEFAULT_TTL) {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(item));
    console.log(`💾 Cache SET: ${key} (TTL: ${ttl / 1000 / 60}min)`);
  } catch (error) {
    // Handle quota exceeded errors gracefully
    if (error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded, clearing old cache...');
      clearOldCache();
      // Try again
      try {
        localStorage.setItem(cacheKey, JSON.stringify(item));
      } catch {
        console.error('Cache still full after cleanup');
      }
    } else {
      console.error('Cache write error:', error);
    }
  }
}

/**
 * Clear all cache entries for this app
 */
export function clearCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('🗑️ Cache cleared');
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Clear expired cache entries
 */
export function clearOldCache() {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (now - item.timestamp > item.ttl) {
            localStorage.removeItem(key);
          }
        } catch {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}

/**
 * Cached fetch wrapper - fetches from cache first, then API
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function that fetches the data
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} - Cached or fresh data
 */
export async function cachedFetch(key, fetchFn, ttl = DEFAULT_TTL) {
  // Try cache first
  const cached = getCached(key);
  if (cached !== null) {
    return cached;
  }
  
  // Cache miss - fetch fresh data
  console.log(`🌐 Cache MISS: ${key} - fetching...`);
  const data = await fetchFn();
  setCache(key, data, ttl);
  
  return data;
}

/**
 * Stale-while-revalidate pattern
 * Returns cached data immediately, then fetches fresh data in background
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function that fetches the data
 * @param {Function} onUpdate - Callback when fresh data arrives
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} - Cached data (may be stale)
 */
export async function staleWhileRevalidate(key, fetchFn, onUpdate, ttl = DEFAULT_TTL) {
  const cached = getCached(key);
  
  // Fetch fresh data in background
  fetchFn()
    .then(freshData => {
      setCache(key, freshData, ttl);
      // Only call onUpdate if data actually changed
      if (cached === null || JSON.stringify(cached) !== JSON.stringify(freshData)) {
        console.log(`🔄 Fresh data for: ${key}`);
        onUpdate?.(freshData);
      }
    })
    .catch(error => {
      console.error(`Error revalidating ${key}:`, error);
    });
  
  // Return cached data immediately (or null if no cache)
  return cached;
}
