/**
 * API service for communicating with the Bitcoin Trading Strategy backend.
 */

import axios from 'axios';
import type { AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Validate API URL for mixed content issues
const validateApiUrl = () => {
  const isProduction = window.location.protocol === 'https:';
  const isHttpUrl = API_BASE_URL.startsWith('http://');
  
  if (isProduction && isHttpUrl) {
    const errorMsg = `[CRITICAL] Mixed Content Error: API URL is HTTP but page is HTTPS. ` +
      `This will cause requests to be blocked by the browser. ` +
      `Please set VITE_API_URL to HTTPS (currently: ${API_BASE_URL})`;
    console.error(errorMsg);
    // Show user-friendly error
    if (typeof window !== 'undefined') {
      console.error('API Configuration Error:', {
        currentUrl: window.location.href,
        apiUrl: API_BASE_URL,
        issue: 'HTTP API URL on HTTPS page - requests will be blocked',
        fix: 'Set VITE_API_URL environment variable to HTTPS URL'
      });
    }
  } else if (isHttpUrl) {
    console.warn(`[WARNING] API URL is HTTP: ${API_BASE_URL}. In production, this should be HTTPS.`);
  }
};

// Run validation on module load
validateApiUrl();

// Create axios instance with default config
// Increased timeout to 120 seconds (2 minutes) for CoinGlass API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for slow API calls (CoinGlass, data refresh, etc.)
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies (JWT tokens)
});

// Request interceptor for logging and adding auth token
api.interceptors.request.use(
  (config) => {
    // Add token from localStorage to Authorization header as fallback
    // (Backend also checks cookies, but this ensures it works if cookies fail)
    const token = localStorage.getItem('auth_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('[API] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const fullUrl = error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown';
    const isNetworkError = !error.response;
    const isCorsError = error.message?.includes('CORS') || error.message?.includes('Network Error');
    const isMixedContent = window.location.protocol === 'https:' && 
                           error.config?.baseURL?.startsWith('http://');
    
    // Enhanced error logging with specific guidance
    const errorDetails: any = {
      url: fullUrl,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data,
      isNetworkError,
      isCorsError,
      isMixedContent,
    };
    
    // Add specific error messages based on error type
    if (isMixedContent) {
      errorDetails.mixedContentError = 'HTTP API URL blocked on HTTPS page. Set VITE_API_URL to HTTPS.';
      console.error('[API] Mixed Content Error:', errorDetails);
    } else if (isCorsError || isNetworkError) {
      errorDetails.corsNetworkError = 'CORS or Network Error. Check: 1) API URL is HTTPS, 2) CORS_ORIGINS includes frontend domain, 3) Backend is running.';
      console.error('[API] CORS/Network Error:', errorDetails);
    } else {
      console.error('[API] Response Error:', errorDetails);
    }
    
    return Promise.reject(error);
  }
);

// Request deduplication: Track in-flight requests to prevent duplicate API calls
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Generate a cache key for request deduplication.
 * Uses method, URL, and serialized params/body.
 */
function generateRequestKey(method: string, url: string, params?: any, data?: any): string {
  const keyParts = [method, url];
  if (params) {
    keyParts.push(JSON.stringify(params));
  }
  if (data) {
    keyParts.push(JSON.stringify(data));
  }
  return keyParts.join('|');
}

/**
 * Get or create a request, preventing duplicates.
 * If the same request is already in flight, returns the existing promise.
 */
function getOrCreateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if request is already in flight
  if (inFlightRequests.has(key)) {
    console.debug(`[API] Request deduplication: reusing in-flight request for key: ${key.substring(0, 50)}...`);
    return inFlightRequests.get(key)!;
  }
  
  // Create new request
  const promise = requestFn()
    .finally(() => {
      // Remove from in-flight requests when done
      inFlightRequests.delete(key);
    });
  
  inFlightRequests.set(key, promise);
  return promise;
}

// Types
export interface DataRefreshResponse {
  success: boolean;
  message: string;
  records: number;
  date_range: {
    start: string;
    end: string;
  };
  last_update: string | null;
}

export interface EquityDataPoint {
  Date: string;
  Portfolio_Value: number;
  Price: number;
  Position: number;
  Capital: number;
  Shares: number;
  // Optional OHLC data for candlestick charts
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface BacktestMetrics {
  total_return: number;
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  win_rate: number;
  final_portfolio_value: number;
  total_trades: number;
  profitable_trades: number;
  losing_trades: number;
  avg_trade_return: number;
  var_95?: number;
  cvar_95?: number;
  calmar_ratio?: number;
  omega_ratio?: number;
  net_profit_pct?: number;
  max_drawdown_pct?: number;
  num_trades?: number;
  profit_factor?: number;
}

export interface Trade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  return_pct: number;
  duration: number;
  direction: string;
}


// Modular Backtest Types
export interface IndicatorParameter {
  type: 'int' | 'float';
  default: number;
  min: number;
  max: number;
  description: string;
}

export interface IndicatorMetadata {
  name: string;
  description: string;
  parameters: Record<string, IndicatorParameter>;
  conditions: Record<string, string>;
  category: 'Momentum' | 'Trend' | 'Volatility' | 'Other';
}

export interface IndicatorConfig {
  id: string;
  params: Record<string, any>;
  show_on_chart: boolean;
}

export interface ModularBacktestRequest {
  indicators: IndicatorConfig[];
  strategy_type?: 'long_cash' | 'long_short';
  long_expression?: string;  // Expression for when to go LONG
  cash_expression?: string;  // Expression for when to go to CASH (used in long_cash mode)
  short_expression?: string;  // Expression for when to go SHORT (used in long_short mode)
  initial_capital: number;
  start_date?: string;
  end_date?: string;
  symbol?: string;  // Trading pair symbol (e.g., BTCUSDT, ETHUSDT)
  exchange?: string;  // Exchange name (e.g., Binance, Coinbase)
  options?: Record<string, any>;
}

export interface BacktestResult {
  metrics: BacktestMetrics;
  equity_curve: EquityDataPoint[];
  trade_log: Trade[];
}

export interface ModularBacktestResponse {
  success: boolean;
  combined_result: BacktestResult;
  individual_results: Record<string, BacktestResult>;
  info: {
    indicators: IndicatorConfig[];
    strategy_type?: 'long_cash' | 'long_short';
    long_expression?: string;
    cash_expression?: string;
    short_expression?: string;
    duration_s: number;
  };
  message: string;
}

export interface IndicatorsResponse {
  success: boolean;
  indicators: Record<string, IndicatorMetadata>;
}

export interface ExpressionValidationRequest {
  indicators: IndicatorConfig[];
  expression: string;
}

export interface ExpressionValidationResponse {
  is_valid: boolean;
  error_message: string;
  error_position: number;
}

export interface SavedStrategy {
  version: string;           // e.g., "1.0.0"
  name: string;              // User-provided strategy name
  created_at: string;        // ISO timestamp
  indicators: IndicatorConfig[];
  expression: string;        // Boolean expression (if advanced mode)
  initial_capital: number;
  is_advanced_mode: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  detail?: string;
}

// Auth Types
export interface User {
  id: number;
  email: string;
  name: string;
  theme: 'light' | 'dark';
  profile_picture_url?: string;
  created_at?: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
}

export interface ThemeUpdateRequest {
  theme: 'light' | 'dark';
}

// API Methods
export class TradingAPI {
  static async refreshData(symbol?: string, force: boolean = false, start_date?: string, exchange?: string): Promise<DataRefreshResponse> {
    const params: any = { ...(symbol ? { symbol } : {}), force };
    if (start_date) {
      params.start_date = start_date;
    }
    if (exchange) {
      params.exchange = exchange;
    }
    const key = generateRequestKey('POST', '/api/data/refresh', params, null);
    
    return getOrCreateRequest(key, async () => {
      // Use extended timeout for data refresh (CoinGlass API can be slow)
      const response: AxiosResponse<DataRefreshResponse> = await api.post('/api/data/refresh', null, { 
        params,
        timeout: 180000, // 3 minutes for CoinGlass API calls
      });
      return response.data;
    });
  }

  /**
   * Get available indicators for modular strategy building.
   */
  static async getAvailableIndicators(): Promise<IndicatorsResponse> {
    const response: AxiosResponse<IndicatorsResponse> = await api.get('/api/backtest/indicators');
    return response.data;
  }

  /**
   * Run a modular backtest with expression-based strategy building.
   */
  static async runModularBacktest(request: ModularBacktestRequest): Promise<ModularBacktestResponse> {
    const response: AxiosResponse<ModularBacktestResponse> = await api.post('/api/backtest/modular', request);
    return response.data;
  }

  /**
   * Validate an expression without running a backtest.
   */
  static async validateExpression(request: ExpressionValidationRequest): Promise<ExpressionValidationResponse> {
    const response: AxiosResponse<ExpressionValidationResponse> = await api.post('/api/backtest/validate-expression', request);
    return response.data;
  }

  // Auth Methods

  /**
   * Sign up a new user with email and password.
   */
  static async signup(email: string, password: string, name?: string): Promise<{ message: string; user: User; token: string }> {
    const response = await api.post('/api/auth/signup', { email, password, name });
    // Store token in localStorage as fallback
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  /**
   * Login user with email and password.
   */
  static async login(email: string, password: string): Promise<{ message: string; user: User; token: string }> {
    const response = await api.post('/api/auth/login', { email, password });
    // Store token in localStorage as fallback
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  /**
   * Get current user information.
   */
  static async getCurrentUser(): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.get('/api/auth/me');
    return response.data;
  }

  /**
   * Logout current user.
   */
  static async logout(): Promise<{ message: string }> {
    const response = await api.post('/api/auth/logout');
    return response.data;
  }

  /**
   * Update user theme preference.
   */
  static async updateTheme(theme: 'light' | 'dark'): Promise<{ message: string; theme: string }> {
    const response = await api.post('/api/auth/theme', null, {
      params: { theme },
    });
    return response.data;
  }

  /**
   * Update user profile (name, email, and/or profile picture URL).
   */
  static async updateProfile(name?: string, email?: string, profilePictureUrl?: string): Promise<{ message: string; user: User }> {
    const response = await api.put('/api/auth/profile', {
      name,
      email,
      profile_picture_url: profilePictureUrl,
    });
    return response.data;
  }

  /**
   * Change user password.
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  }

  /**
   * Get available cryptocurrency symbols.
   */
  static async getAvailableSymbols(): Promise<{ success: boolean; symbols: string[]; count: number }> {
    const response = await api.get('/api/data/symbols');
    return response.data;
  }

  /**
   * Get supported coins/tokens from CoinGlass API.
   * Returns symbols in CoinGlass format (e.g., "BTC/USDT").
   */
  static async getCoinGlassSymbols(): Promise<{
    success: boolean;
    symbols: Array<{
      symbol: string;
      name: string;
      exchange?: string | null;
    }>;
    count: number;
    source?: string;
    error?: string;
  }> {
    const key = generateRequestKey('GET', '/api/data/coinglass-symbols', null, null);
    
    return getOrCreateRequest(key, async () => {
      const response = await api.get('/api/data/coinglass-symbols', {
        timeout: 30000, // 30 second timeout
      });
      return response.data;
    });
  }

  /**
   * Get price history (OHLC) data from CoinGlass API.
   * Uses local storage caching for recent data to improve performance.
   */
  static async getPriceHistory(params: {
    symbol?: string;
    start_date?: string;
    end_date?: string;
    exchange?: string;
    interval?: string;
  }): Promise<{
    success: boolean;
    data: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    date_range: {
      start: string;
      end: string;
    };
    data_source: string;
    total_records: number;
    quality_metrics?: Record<string, any>;
  }> {
    // Generate cache key
    const cacheKey = `price_history_${params.symbol}_${params.exchange}_${params.start_date}_${params.end_date}_${params.interval}`;
    
    // Check local storage cache (TTL: 5 minutes for recent data, 1 hour for historical)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const isRecent = params.end_date && new Date(params.end_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        const cacheTTL = isRecent ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min or 1 hour
        
        if (age < cacheTTL) {
          console.debug(`[API] Price history cache hit for ${cacheKey.substring(0, 50)}...`);
          return data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    
    const key = generateRequestKey('GET', '/api/data/price-history', params, null);
    
    return getOrCreateRequest(key, async () => {
      const response: AxiosResponse<any> = await api.get('/api/data/price-history', {
        params,
        timeout: 180000, // 3 minutes for CoinGlass API calls
      });
      
      // Cache successful responses
      if (response.data.success) {
        try {
          const isRecent = params.end_date && new Date(params.end_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const ttl = isRecent ? 5 * 60 * 1000 : 60 * 60 * 1000;
          localStorage.setItem(cacheKey, JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
            ttl
          }));
        } catch (e) {
          // Ignore cache errors
        }
      }
      
      return response.data;
    });
  }

  /**
   * Check BTC history status.
   */
  static async checkBTCHistoryStatus(): Promise<{
    status: 'complete' | 'incomplete' | 'building';
    message: string;
    date_range: {
      start: string;
      end: string;
    } | null;
    total_records: number;
    target_start_date?: string;
    is_complete?: boolean;
  }> {
    const response: AxiosResponse<any> = await api.get('/api/data/btc-history-status');
    return response.data;
  }

  /**
   * Ensure BTC has complete historical data.
   */
  static async ensureBTCHistory(params?: {
    exchange?: string;
    force_rebuild?: boolean;
    background?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    was_built: boolean;
    is_complete: boolean;
    symbol: string;
    total_records: number;
    date_range: {
      start: string;
      end: string;
    };
    total_days: number;
    total_years: number;
    target_start_date: string;
    latest_price: number;
    latest_date: string;
  }> {
    const requestParams = {
      ...(params || {}),
      background: params?.background !== false, // Default to true (background)
    };
    
    const timeout = requestParams.background ? 10000 : 600000; // 10s for background, 10min for blocking
    
    const response: AxiosResponse<any> = await api.post('/api/data/ensure-btc-history', null, {
      params: requestParams,
      timeout,
    });
    return response.data;
  }

  /**
   * Test CoinGlass API connection.
   */
  static async testCoinGlassConnection(): Promise<{
    success: boolean;
    connection_test: {
      success: boolean;
      endpoint?: string;
      error?: string;
      response_preview?: string;
      api_key_configured: boolean;
      base_url: string;
    };
    api_key_configured: boolean;
    api_key_preview: string;
    base_url: string;
    test_data_fetch: {
      success: boolean;
      records: number;
      error?: string;
    };
  }> {
    const response: AxiosResponse<any> = await api.get('/api/data/test-coinglass', {
      timeout: 60000, // 1 minute for connection test
    });
    return response.data;
  }

  // Valuation API

  /**
   * Get available valuation indicators.
   */
  static async getValuationIndicators(): Promise<{
    success: boolean;
    indicators: Array<{
      id: string;
      name: string;
      category: 'technical' | 'fundamental';
      description: string;
    }>;
  }> {
    const response: AxiosResponse<any> = await api.get('/api/valuation/indicators');
    return response.data;
  }

  /**
   * Calculate z-scores for selected indicators.
   */
  static async calculateValuationZScores(request: {
    indicators: string[];
    symbol?: string;
    zscore_method?: 'rolling' | 'all_time';
    rolling_window?: number;
    show_average?: boolean;
    average_window?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    success: boolean;
    data: Array<{
      date: string;
      price: number;
      indicators: Record<string, { value: number; zscore: number }>;
    }>;
    averages: Record<string, number>;
  }> {
    const response: AxiosResponse<any> = await api.post('/api/valuation/zscores', request);
    return response.data;
  }

  /**
   * Get valuation data (price + indicator values without z-scores).
   */
  static async getValuationData(params: {
    symbol?: string;
    indicators?: string[];
    start_date?: string;
    end_date?: string;
    exchange?: string;
  }): Promise<{
    success: boolean;
    data: Array<{
      date: string;
      price: number;
      indicators: Record<string, number>;
    }>;
  }> {
    const key = generateRequestKey('GET', '/api/valuation/data', params, null);
    
    return getOrCreateRequest(key, async () => {
      const response: AxiosResponse<any> = await api.get('/api/valuation/data', { params });
      return response.data;
    });
  }

  // Full Cycle Methods

  /**
   * Get list of available full cycle indicators.
   */
  static async getFullCycleIndicators(): Promise<{
    success: boolean;
    indicators: Array<{
      id: string;
      name: string;
      category: 'fundamental' | 'technical';
      default_params: Record<string, any>;
    }>;
    count: number;
  }> {
    const response: AxiosResponse<any> = await api.get('/api/fullcycle/indicators');
    return response.data;
  }

  /**
   * Calculate full cycle z-scores for selected indicators.
   * Uses extended timeout (3 minutes) for CoinGlass API calls.
   */
  static async calculateFullCycleZScores(request: {
    indicators: string[];
    indicator_params?: Record<string, Record<string, any>>;
    start_date?: string;
    end_date?: string;
    timeframe?: string;
    exchange?: string;
    roc_days?: number;
    sdca_in?: number;
    sdca_out?: number;
    force_refresh?: boolean;
  }): Promise<{
    success: boolean;
    data: Array<{
      date: string;
      price: number;
      indicators: Record<string, { zscore: number }>;
    }>;
    roc: Record<string, number>;
    date_range: {
      start: string;
      end: string;
    };
    symbol: string;
    sdca_in: number;
    sdca_out: number;
    indicators_calculated?: number;
    indicators_requested?: number;
    warnings?: string[] | null;
  }> {
    const key = generateRequestKey('POST', '/api/fullcycle/zscores', null, request);
    
    return getOrCreateRequest(key, async () => {
      // Use extended timeout for Full Cycle calculations (3 minutes)
      const response: AxiosResponse<any> = await api.post('/api/fullcycle/zscores', request, {
        timeout: 180000, // 3 minutes for CoinGlass API calls
      });
      return response.data;
    });
  }

  // Full Cycle Preset CRUD Methods

  /**
   * Create a new Full Cycle preset.
   */
  static async createFullCyclePreset(request: {
    name: string;
    description?: string;
    indicator_params: Record<string, Record<string, any>>;
    selected_indicators: string[];
    start_date?: string;
    end_date?: string;
    roc_days: number;
    show_fundamental_average: boolean;
    show_technical_average: boolean;
    show_overall_average: boolean;
    sdca_in?: number;
    sdca_out?: number;
  }): Promise<{
    success: boolean;
    preset: {
      id: number;
      name: string;
      description?: string;
      indicator_params: Record<string, Record<string, any>>;
      selected_indicators: string[];
      start_date?: string;
      end_date?: string;
      roc_days: number;
      show_fundamental_average: boolean;
      show_technical_average: boolean;
      show_overall_average: boolean;
      sdca_in: number;
      sdca_out: number;
      created_at: string;
      updated_at: string;
    };
  }> {
    const response: AxiosResponse<any> = await api.post('/api/fullcycle/presets', request);
    return response.data;
  }

  /**
   * List all Full Cycle presets for the current user.
   */
  static async listFullCyclePresets(): Promise<{
    success: boolean;
    presets: Array<{
      id: number;
      name: string;
      description?: string;
      created_at: string;
      updated_at: string;
    }>;
    count: number;
  }> {
    const response: AxiosResponse<any> = await api.get('/api/fullcycle/presets');
    return response.data;
  }

  /**
   * Get a specific Full Cycle preset by ID.
   */
  static async getFullCyclePreset(presetId: number): Promise<{
    success: boolean;
    preset: {
      id: number;
      name: string;
      description?: string;
      indicator_params: Record<string, Record<string, any>>;
      selected_indicators: string[];
      start_date?: string;
      end_date?: string;
      roc_days: number;
      show_fundamental_average: boolean;
      show_technical_average: boolean;
      show_overall_average: boolean;
      sdca_in: number;
      sdca_out: number;
      created_at: string;
      updated_at: string;
    };
  }> {
    const response: AxiosResponse<any> = await api.get(`/api/fullcycle/presets/${presetId}`);
    return response.data;
  }

  /**
   * Delete a Full Cycle preset.
   */
  static async deleteFullCyclePreset(presetId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response: AxiosResponse<any> = await api.delete(`/api/fullcycle/presets/${presetId}`);
    return response.data;
  }

  // Saved Valuation CRUD Methods

  /**
   * List all saved valuations for the current user.
   */
  static async listValuations(): Promise<{
    success: boolean;
    valuations: Array<{
      id: number;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>;
  }> {
    const response: AxiosResponse<any> = await api.get('/api/valuation/saved/list');
    return response.data;
  }

  /**
   * Get a specific saved valuation by ID.
   */
  static async getValuation(valuationId: number): Promise<{
    id: number;
    name: string;
    description: string | null;
    indicators: string[];
    zscore_method: 'rolling' | 'all_time';
    rolling_window: number;
    average_window: number | null;
    show_average: boolean;
    overbought_threshold: number;
    oversold_threshold: number;
    symbol: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
  }> {
    const response: AxiosResponse<any> = await api.get(`/api/valuation/saved/${valuationId}`);
    return response.data;
  }

  /**
   * Save a new valuation configuration.
   */
  static async saveValuation(request: {
    name: string;
    description?: string;
    indicators: string[];
    zscore_method: 'rolling' | 'all_time';
    rolling_window: number;
    average_window?: number | null;
    show_average: boolean;
    overbought_threshold: number;
    oversold_threshold: number;
    symbol: string;
    start_date?: string | null;
    end_date?: string | null;
  }): Promise<{
    id: number;
    name: string;
    description: string | null;
    indicators: string[];
    zscore_method: 'rolling' | 'all_time';
    rolling_window: number;
    average_window: number | null;
    show_average: boolean;
    overbought_threshold: number;
    oversold_threshold: number;
    symbol: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
  }> {
    const response: AxiosResponse<any> = await api.post('/api/valuation/saved', request);
    return response.data;
  }

  /**
   * Update an existing valuation configuration.
   */
  static async updateValuation(
    valuationId: number,
    request: {
      name?: string;
      description?: string;
      indicators?: string[];
      zscore_method?: 'rolling' | 'all_time';
      rolling_window?: number;
      average_window?: number | null;
      show_average?: boolean;
      overbought_threshold?: number;
      oversold_threshold?: number;
      symbol?: string;
      start_date?: string | null;
      end_date?: string | null;
    }
  ): Promise<{
    id: number;
    name: string;
    description: string | null;
    indicators: string[];
    zscore_method: 'rolling' | 'all_time';
    rolling_window: number;
    average_window: number | null;
    show_average: boolean;
    overbought_threshold: number;
    oversold_threshold: number;
    symbol: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
  }> {
    const response: AxiosResponse<any> = await api.put(`/api/valuation/saved/${valuationId}`, request);
    return response.data;
  }

  /**
   * Delete a saved valuation.
   */
  static async deleteValuation(valuationId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response: AxiosResponse<any> = await api.delete(`/api/valuation/saved/${valuationId}`);
    return response.data;
  }

  // Indicator Signal Generation API

  /**
   * Generate signals for individual indicators.
   */
  static async generateIndicatorSignals(request: {
    indicators: Array<{ id: string; parameters: Record<string, any> }>;
    expressions: Record<string, string>;
    symbol?: string;
    strategy_type?: 'long_cash' | 'long_short';
    initial_capital?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    success: boolean;
    results: Record<string, BacktestResult>;
    price_data: Array<{
      Date: string;
      Price: number;
      Position: number;
      [key: string]: any;
    }>;
  }> {
    try {
      const response: AxiosResponse<any> = await api.post('/api/indicators/signals', request);
      return response.data;
    } catch (error: any) {
      // Handle Pydantic validation errors
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors are arrays
          const errorMessages = detail.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err?.msg) return err.msg;
            if (err?.loc && err?.msg) {
              return `${err.loc.join('.')}: ${err.msg}`;
            }
            return JSON.stringify(err);
          }).join('; ');
          throw new Error(errorMessages);
        } else if (typeof detail === 'string') {
          throw new Error(detail);
        } else {
          throw new Error(JSON.stringify(detail));
        }
      }
      throw error;
    }
  }

  /**
   * Generate combined signals using majority voting.
   */
  static async generateCombinedSignals(request: {
    indicator_signals: Record<string, number[]>;
    dates: string[];
    prices: number[];
    threshold: number;
    strategy_type?: 'long_cash' | 'long_short';
    initial_capital?: number;
  }): Promise<{
    success: boolean;
    combined_result: BacktestResult;
    combined_signals: number[];
    agreement_stats: {
      total_points: number;
      agreement_by_point: Array<{
        date: string;
        long_count: number;
        short_count: number;
        total_count: number;
        combined_signal: number;
      }>;
    };
  }> {
    try {
      const response: AxiosResponse<any> = await api.post('/api/indicators/combined', request);
      return response.data;
    } catch (error: any) {
      // Handle Pydantic validation errors
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors are arrays
          const errorMessages = detail.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err?.msg) return err.msg;
            if (err?.loc && err?.msg) {
              return `${err.loc.join('.')}: ${err.msg}`;
            }
            return JSON.stringify(err);
          }).join('; ');
          throw new Error(errorMessages);
        } else if (typeof detail === 'string') {
          throw new Error(detail);
        } else {
          throw new Error(JSON.stringify(detail));
        }
      }
      throw error;
    }
  }

  // ==================== Dashboard API ====================

  /**
   * Get all saved strategies (Indicator, Valuation, Full Cycle) for the current user.
   */
  static async getAllSavedStrategies(): Promise<{
    success: boolean;
    indicator_strategies: Array<{
      id: number;
      name: string;
      description?: string;
      created_at: string;
      updated_at: string;
      type: string;
    }>;
    valuation_strategies: Array<{
      id: number;
      name: string;
      description?: string;
      created_at: string;
      updated_at: string;
      type: string;
    }>;
    fullcycle_presets: Array<{
      id: number;
      name: string;
      description?: string;
      created_at: string;
      updated_at: string;
      type: string;
    }>;
    total: number;
  }> {
    const response: AxiosResponse<any> = await api.get('/api/dashboard/strategies/all');
    return response.data;
  }

  /**
   * Calculate combined signals from selected strategies.
   */
  static async calculateCombinedSignals(params: {
    strategy_selection: {
      indicator_strategy_ids: number[];
      valuation_strategy_ids: number[];
      fullcycle_preset_ids: number[];
    };
    combination_rule: {
      method: 'weighted' | 'majority' | 'custom';
      weights?: Record<string, number>;
      threshold?: number;
      expression?: string;
    };
    start_date?: string;
    end_date?: string;
    symbol?: string;
  }): Promise<{
    success: boolean;
    combined_signals: {
      dates: string[];
      values: number[];
    };
    individual_signals: Record<string, {
      dates: string[];
      values: number[];
    }>;
    metadata: any;
  }> {
    const response: AxiosResponse<any> = await api.post('/api/dashboard/calculate-combined-signals', params);
    return response.data;
  }

  /**
   * Run combined backtest using multiple strategies.
   */
  static async runCombinedBacktest(params: {
    strategy_selection: {
      indicator_strategy_ids: number[];
      valuation_strategy_ids: number[];
      fullcycle_preset_ids: number[];
    };
    combination_rule: {
      method: 'weighted' | 'majority' | 'custom';
      weights?: Record<string, number>;
      threshold?: number;
      expression?: string;
    };
    start_date?: string;
    end_date?: string;
    symbol?: string;
    initial_capital?: number;
  }): Promise<{
    success: boolean;
    backtest_results: any;
    metrics: any;
    metadata: any;
  }> {
    const response: AxiosResponse<any> = await api.post('/api/dashboard/combined-backtest', params);
    return response.data;
  }
}

export default TradingAPI;
