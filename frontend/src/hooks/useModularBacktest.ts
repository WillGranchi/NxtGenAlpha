import { useState, useCallback } from 'react';
import { TradingAPI } from '../services/api';
import type { 
  ModularBacktestRequest, 
  ModularBacktestResponse,
  ExpressionValidationRequest,
  ExpressionValidationResponse
} from '../services/api';

interface UseModularBacktestReturn {
  // State
  isLoading: boolean;
  error: string | null;
  response: ModularBacktestResponse | null;
  
  // Actions
  runModularBacktest: (request: ModularBacktestRequest) => Promise<void>;
  validateExpression: (request: ExpressionValidationRequest) => Promise<ExpressionValidationResponse>;
  clearResults: () => void;
  clearError: () => void;
}

export const useModularBacktest = (): UseModularBacktestReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ModularBacktestResponse | null>(null);

  const runModularBacktest = useCallback(async (request: ModularBacktestRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Running modular backtest with request:', request);
      
      const result = await TradingAPI.runModularBacktest(request);
      
      // Validate response structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response structure from API');
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Backtest failed');
      }
      
      if (!result.combined_result) {
        throw new Error('Missing combined_result in response');
      }
      
      if (!result.individual_results || typeof result.individual_results !== 'object') {
        throw new Error('Missing or invalid individual_results in response');
      }
      
      console.log('Modular backtest completed successfully:', result);
      setResponse(result);
      
      // Auto-scroll to results section
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Modular backtest failed:', errorMessage);
      setError(errorMessage);
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateExpression = useCallback(async (request: ExpressionValidationRequest): Promise<ExpressionValidationResponse> => {
    try {
      const result = await TradingAPI.validateExpression(request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      console.error('Expression validation error:', errorMessage);
      // Return invalid response on error
      return {
        is_valid: false,
        error_message: errorMessage,
        error_position: -1
      };
    }
  }, []);

  return {
    isLoading,
    error,
    response,
    runModularBacktest,
    validateExpression,
    clearResults,
    clearError,
  };
};
