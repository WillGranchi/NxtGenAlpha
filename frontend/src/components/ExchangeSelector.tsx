/**
 * Exchange Selector Component
 * Allows users to select cryptocurrency exchanges to filter tokens
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { TradingAPI } from '../services/api';

interface ExchangeSelectorProps {
  selectedExchange: string; // "All Exchanges" or specific exchange name
  onExchangeChange: (exchange: string) => void;
  className?: string;
}

export const ExchangeSelector: React.FC<ExchangeSelectorProps> = ({
  selectedExchange,
  onExchangeChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        setIsLoading(true);
        const response = await TradingAPI.getCoinGlassSymbols();
        if (response.symbols && response.symbols.length > 0) {
          // Extract unique exchanges from symbols
          const uniqueExchanges = new Set<string>();
          response.symbols.forEach((item) => {
            if (item.exchange && item.exchange.trim()) {
              uniqueExchanges.add(item.exchange);
            }
          });
          
          // Sort exchanges alphabetically
          const sortedExchanges = Array.from(uniqueExchanges).sort();
          setExchanges(sortedExchanges);
        } else {
          // Fallback to common exchanges
          setExchanges(['Binance', 'Coinbase', 'OKX', 'Bybit', 'Kraken']);
        }
      } catch (error) {
        console.error('Failed to fetch exchanges:', error);
        // Fallback to common exchanges
        setExchanges(['Binance', 'Coinbase', 'OKX', 'Bybit', 'Kraken']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchanges();
  }, []);

  // Add "All Exchanges" option at the beginning
  const allExchanges = useMemo(() => {
    return ['All Exchanges', ...exchanges];
  }, [exchanges]);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-bg-secondary border border-border-default rounded-lg hover:border-primary-500/50 transition-all duration-200 text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">
              {selectedExchange}
            </div>
            <div className="text-xs text-text-muted truncate">
              {selectedExchange === 'All Exchanges' 
                ? `${exchanges.length} exchanges available` 
                : 'Exchange'}
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-text-muted transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-20 max-h-96 overflow-hidden flex flex-col">
            {/* Exchange List */}
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-text-muted">Loading exchanges...</div>
              ) : allExchanges.length === 0 ? (
                <div className="p-4 text-center text-text-muted">No exchanges found</div>
              ) : (
                allExchanges.map((exchange) => (
                  <button
                    key={exchange}
                    onClick={() => {
                      onExchangeChange(exchange);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-bg-elevated transition-colors flex items-center justify-between ${
                      exchange === selectedExchange ? 'bg-primary-500/10' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary">
                        {exchange}
                      </div>
                      {exchange !== 'All Exchanges' && (
                        <div className="text-xs text-text-muted">
                          {exchanges.length} tokens available
                        </div>
                      )}
                    </div>
                    {exchange === selectedExchange && (
                      <Check className="w-5 h-5 text-primary-400 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

