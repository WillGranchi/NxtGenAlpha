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
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies (JWT tokens)
});

// Request interceptor for logging and adding auth token
api.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`);
    console.log(`[API] Base URL: ${config.baseURL || 'DEFAULT'}`);
    
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

// Types
export interface DataInfo {
  total_records: number;
  date_range: {
    start: string;
    end: string;
  };
  columns: string[];
  sample_data: Record<string, Record<string, number>>;
  price_range: {
    min: number;
    max: number;
    current: number;
  };
  last_update?: string;
  hours_since_update?: number;
}

export interface DataStatus {
  success: boolean;
  last_update: string | null;
  is_fresh: boolean;
  hours_since_update: number | null;
  total_records: number;
  date_range: {
    start: string;
    end: string;
  };
  current_price: number;
}

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

export interface DataInfoResponse {
  success: boolean;
  data_info: DataInfo;
}

export interface StrategyParameter {
  type: string;
  min?: number;
  max?: number;
  default: any;
  description?: string;
}

export interface StrategyDefinition {
  name: string;
  description: string;
  parameters: Record<string, StrategyParameter>;
  category: string;
}

export interface StrategiesResponse {
  success: boolean;
  strategies: Record<string, StrategyDefinition>;
  total_count: number;
}

export interface BacktestRequest {
  strategy: string;
  parameters: Record<string, any>;
  initial_capital: number;
  start_date?: string;
  end_date?: string;
}

export interface EquityDataPoint {
  Date: string;
  Portfolio_Value: number;
  Price: number;
  Position: number;
  Capital: number;
  Shares: number;
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

export interface BacktestResults {
  metrics: BacktestMetrics;
  equity_curve: EquityDataPoint[];
  trades: any[];
  trade_log: Trade[];
}

export interface BacktestResponse {
  success: boolean;
  results: BacktestResults;
  message: string;
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
  expression?: string;  // Legacy field, use long_expression/cash_expression/short_expression instead
  long_expression?: string;  // Expression for when to go LONG
  cash_expression?: string;  // Expression for when to go to CASH (used in long_cash mode)
  short_expression?: string;  // Expression for when to go SHORT (used in long_short mode)
  initial_capital: number;
  start_date?: string;
  end_date?: string;
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
    expression?: string;  // Legacy or combined representation
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
  created_at?: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
}

export interface ThemeUpdateRequest {
  theme: 'light' | 'dark';
}

// Strategy CRUD Types
export interface SaveStrategyRequest {
  name: string;
  description?: string;
  indicators: IndicatorConfig[];
  expressions: {
    expression?: string;
    long_expression?: string;
    cash_expression?: string;
    short_expression?: string;
    strategy_type?: 'long_cash' | 'long_short';
  };
  parameters?: Record<string, any>;
}

export interface UpdateStrategyRequest {
  name?: string;
  description?: string;
  indicators?: IndicatorConfig[];
  expressions?: {
    expression?: string;
    long_expression?: string;
    cash_expression?: string;
    short_expression?: string;
    strategy_type?: 'long_cash' | 'long_short';
  };
  parameters?: Record<string, any>;
}

export interface StrategyResponse {
  id: number;
  name: string;
  description?: string;
  indicators: IndicatorConfig[];
  expressions: Record<string, any>;
  parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StrategyListItem {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface StrategyListResponse {
  success: boolean;
  strategies: StrategyListItem[];
}

// API Methods
export class TradingAPI {
  /**
   * Get information about the Bitcoin dataset.
   */
  static async getDataInfo(): Promise<DataInfoResponse> {
    const response: AxiosResponse<DataInfoResponse> = await api.get('/api/data/info');
    return response.data;
  }

  static async getDataStatus(): Promise<DataStatus> {
    const response: AxiosResponse<DataStatus> = await api.get('/api/data/status');
    return response.data;
  }

  static async refreshData(force: boolean = false): Promise<DataRefreshResponse> {
    const response: AxiosResponse<DataRefreshResponse> = await api.post('/api/data/refresh', null, {
      params: { force }
    });
    return response.data;
  }

  /**
   * Get available trading strategies.
   */
  static async getAvailableStrategies(): Promise<StrategiesResponse> {
    const response: AxiosResponse<StrategiesResponse> = await api.get('/api/strategies');
    return response.data;
  }

  /**
   * Run a backtest with the specified parameters.
   */
  static async runBacktest(request: BacktestRequest): Promise<BacktestResponse> {
    const response: AxiosResponse<BacktestResponse> = await api.post('/api/backtest', request);
    return response.data;
  }

  /**
   * Get health status of the API.
   */
  static async getHealthStatus(): Promise<{ status: string; [key: string]: any }> {
    const response = await api.get('/health');
    return response.data;
  }

  /**
   * Get data health status.
   */
  static async getDataHealthStatus(): Promise<{ status: string; [key: string]: any }> {
    const response = await api.get('/api/data/health');
    return response.data;
  }

  /**
   * Get backtest health status.
   */
  static async getBacktestHealthStatus(): Promise<{ status: string; [key: string]: any }> {
    const response = await api.get('/api/backtest/health');
    return response.data;
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

  // Strategy CRUD Methods

  /**
   * List all saved strategies for the current user.
   */
  static async listSavedStrategies(): Promise<StrategyListResponse> {
    const response: AxiosResponse<StrategyListResponse> = await api.get('/api/strategies/saved/list');
    return response.data;
  }

  /**
   * Get a saved strategy by ID.
   */
  static async getSavedStrategy(strategyId: number): Promise<StrategyResponse> {
    const response: AxiosResponse<StrategyResponse> = await api.get(`/api/strategies/saved/${strategyId}`);
    return response.data;
  }

  /**
   * Save a new strategy.
   */
  static async saveStrategy(request: SaveStrategyRequest): Promise<StrategyResponse> {
    const response: AxiosResponse<StrategyResponse> = await api.post('/api/strategies/saved', request);
    return response.data;
  }

  /**
   * Update an existing strategy.
   */
  static async updateStrategy(strategyId: number, request: UpdateStrategyRequest): Promise<StrategyResponse> {
    const response: AxiosResponse<StrategyResponse> = await api.put(`/api/strategies/saved/${strategyId}`, request);
    return response.data;
  }

  /**
   * Delete a strategy.
   */
  static async deleteStrategy(strategyId: number): Promise<void> {
    await api.delete(`/api/strategies/saved/${strategyId}`);
  }

  /**
   * Duplicate a strategy.
   */
  static async duplicateStrategy(strategyId: number): Promise<StrategyResponse> {
    const response: AxiosResponse<StrategyResponse> = await api.post(`/api/strategies/saved/${strategyId}/duplicate`);
    return response.data;
  }
}

export default TradingAPI;
