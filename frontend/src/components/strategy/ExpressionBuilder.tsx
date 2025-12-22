import React, { useState, useEffect, useRef } from 'react';
import { TradingAPI } from '../../services/api';
import type { IndicatorConfig, ExpressionValidationResponse } from '../../services/api';

interface ExpressionBuilderProps {
  expression: string;
  availableConditions: string[];
  selectedIndicators?: IndicatorConfig[];
  onExpressionChange: (expression: string) => void;
  onValidate: (isValid: boolean, errorMessage?: string) => void;
  className?: string;
}

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorPosition?: number;
}

export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  expression,
  availableConditions,
  selectedIndicators = [],
  onExpressionChange,
  onValidate,
  className = ''
}) => {
  const [localExpression, setLocalExpression] = useState(expression);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [serverValidation, setServerValidation] = useState<ExpressionValidationResponse | null>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local expression when prop changes
  useEffect(() => {
    setLocalExpression(expression);
  }, [expression]);

  // Live validation with debouncing - client-side first, then server-side for non-empty expressions
  useEffect(() => {
    // Clear any pending validation
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Immediate client-side validation
    const clientValidation = validateExpressionLocal(localExpression);
    setValidation(clientValidation);
    onValidate(clientValidation.isValid, clientValidation.errorMessage);

    // Debounced server-side validation for non-empty expressions
    if (localExpression.trim() && selectedIndicators.length > 0) {
      validationTimeoutRef.current = setTimeout(async () => {
        if (!localExpression.trim() || selectedIndicators.length === 0) {
          setServerValidation(null);
          return;
        }

        setIsValidating(true);
        try {
          const result = await TradingAPI.validateExpression({
            indicators: selectedIndicators,
            expression: localExpression
          });

          setServerValidation(result);
          
          // Update validation state with server response
          if (!result.is_valid) {
            setValidation({
              isValid: false,
              errorMessage: result.error_message,
              errorPosition: result.error_position
            });
            onValidate(false, result.error_message);
          } else {
            // Server validation passed - keep client validation result if it also passed
            const clientValidation2 = validateExpressionLocal(localExpression);
            setValidation(clientValidation2);
            onValidate(clientValidation2.isValid, clientValidation2.errorMessage);
          }
        } catch (error) {
          // Don't show error for validation failures, just keep client-side validation
        } finally {
          setIsValidating(false);
        }
      }, 500); // 500ms debounce
    } else {
      setServerValidation(null);
    }

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [localExpression, availableConditions, selectedIndicators, onValidate]);

  const validateExpressionLocal = (expr: string): ValidationResult => {
    if (!expr.trim()) {
      return { isValid: true };
    }

    // Basic validation rules
    const errors: string[] = [];
    
    // Check for balanced parentheses
    let parenCount = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') parenCount++;
      else if (expr[i] === ')') parenCount--;
      if (parenCount < 0) {
        errors.push('Unbalanced parentheses');
        break;
      }
    }
    if (parenCount > 0) {
      errors.push('Unbalanced parentheses');
    }

    // Check for unknown conditions
    const words = expr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    const unknownWords = words.filter(word => 
      !['AND', 'OR'].includes(word.toUpperCase()) && 
      !availableConditions.includes(word)
    );
    
    if (unknownWords.length > 0) {
      errors.push(`Unknown conditions: ${unknownWords.join(', ')}`);
    }

    // Check for invalid operators
    const invalidOps = expr.match(/\b(AND|OR)\s+(AND|OR)\b/gi);
    if (invalidOps) {
      errors.push('Consecutive operators not allowed');
    }

    // Check for empty parentheses
    const emptyParens = expr.match(/\(\s*\)/g);
    if (emptyParens) {
      errors.push('Empty parentheses not allowed');
    }

    const isValid = errors.length === 0;
    const errorMessage = errors.length > 0 ? errors[0] : undefined;
    
    return { isValid, errorMessage };
  };

  const validateExpressionWithBackend = async (expr: string) => {
    if (!expr.trim() || selectedIndicators.length === 0) {
      setServerValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const result = await TradingAPI.validateExpression({
        indicators: selectedIndicators,
        expression: expr
      });

      setServerValidation(result);
      
      // Update validation state with server response
      if (!result.is_valid) {
        setValidation({
          isValid: false,
          errorMessage: result.error_message,
          errorPosition: result.error_position
        });
        onValidate(false, result.error_message);
      } else {
        // Server validation passed - keep client validation result if it also passed
        const clientValidation = validateExpressionLocal(expr);
        setValidation(clientValidation);
        onValidate(clientValidation.isValid, clientValidation.errorMessage);
      }
    } catch (error) {
      // Don't show error for validation failures, just keep client-side validation
    } finally {
      setIsValidating(false);
    }
  };

  const handleTestExpression = async () => {
    if (!localExpression.trim()) {
      setValidation({ isValid: false, errorMessage: 'Expression cannot be empty' });
      onValidate(false, 'Expression cannot be empty');
      return;
    }

    await validateExpressionWithBackend(localExpression);
  };

  const handleExpressionChange = (value: string) => {
    setLocalExpression(value);
    onExpressionChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard shortcut: Ctrl+Enter to test expression
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTestExpression();
      return;
    }

    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => 
          Math.min(prev + 1, filteredSuggestions.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertSuggestion(filteredSuggestions[suggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const insertText = (text: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newExpression = localExpression.slice(0, start) + text + localExpression.slice(end);
    
    handleExpressionChange(newExpression);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertSuggestion = (suggestion: string) => {
    insertText(suggestion);
    setShowSuggestions(false);
  };

  const getFilteredSuggestions = () => {
    if (!showSuggestions) return [];
    
    const cursorPos = inputRef.current?.selectionStart || 0;
    const beforeCursor = localExpression.slice(0, cursorPos);
    const lastWord = beforeCursor.match(/\b[a-zA-Z_][a-zA-Z0-9_]*$/);
    
    if (lastWord) {
      const query = lastWord[0].toLowerCase();
      return availableConditions.filter(condition => 
        condition.toLowerCase().includes(query)
      );
    }
    
    return availableConditions.slice(0, 10); // Show first 10 if no query
  };

  const filteredSuggestions = getFilteredSuggestions();

  const helperButtons = [
    { label: 'AND', value: ' AND ' },
    { label: 'OR', value: ' OR ' },
    { label: '(', value: '(' },
    { label: ')', value: ')' },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Expression Input */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Strategy Expression
        </label>
        <textarea
          ref={inputRef}
          value={localExpression}
          onChange={(e) => {
            handleExpressionChange(e.target.value);
            setCursorPosition(e.target.selectionStart || 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicks
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder="e.g., (rsi_oversold AND macd_cross_up) OR ema_cross_up"
          className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors ${
            !localExpression.trim()
              ? 'border-gray-300'
              : validation.isValid 
              ? 'border-green-400 focus:ring-green-500 focus:border-green-500' 
              : 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
          }`}
          rows={3}
        />
        
        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => insertSuggestion(suggestion)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                  index === suggestionIndex ? 'bg-blue-100' : ''
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Buttons */}
      <div className="flex flex-wrap gap-2">
        {helperButtons.map((button) => (
          <button
            key={button.label}
            onClick={() => insertText(button.value)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
          >
            {button.label}
          </button>
        ))}
        
        <button
          onClick={() => {
            const input = inputRef.current;
            if (input) {
              input.focus();
              input.setSelectionRange(0, localExpression.length);
            }
          }}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300 transition-colors"
        >
          Select All
        </button>
      </div>

      {/* Available Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Available Conditions
        </label>
        <div className="flex flex-wrap gap-1">
          {availableConditions.map((condition) => (
            <button
              key={condition}
              onClick={() => insertText(condition)}
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded border border-green-300 transition-colors"
            >
              {condition}
            </button>
          ))}
        </div>
      </div>

      {/* Validation Status and Test Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isValidating ? (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm">Validating...</span>
            </div>
          ) : !localExpression.trim() ? (
            <div className="flex items-center text-gray-500">
              <span className="text-sm">Enter an expression to validate</span>
            </div>
          ) : validation.isValid ? (
            <div className="flex items-center text-green-600">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                {serverValidation?.is_valid ? 'Validated ✓' : 'Valid expression'}
              </span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{validation.errorMessage}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {localExpression.trim() && (
            <button
              onClick={handleTestExpression}
              disabled={isValidating || selectedIndicators.length === 0}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isValidating || selectedIndicators.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {isValidating ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Testing...
                </span>
              ) : (
                'Test Expression'
              )}
            </button>
          )}
          {localExpression.trim() && (
            <div className="text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+Enter</kbd>
            </div>
          )}
        </div>
      </div>

      {/* Expression Preview */}
      {localExpression && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expression Preview
          </label>
          <code className="text-sm text-gray-800 font-mono break-all">
            {localExpression}
          </code>
        </div>
      )}
    </div>
  );
};
