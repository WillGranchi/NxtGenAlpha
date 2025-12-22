/**
 * Token Selector Component
 * Allows users to select cryptocurrency tokens for strategy backtesting
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { TradingAPI } from '../services/api';

interface TokenInfo {
  symbol: string;
  name: string;
  chain: string;
}

interface TokenSelectorProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  className?: string;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedSymbol,
  onSymbolChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoading(true);
        const response = await TradingAPI.getAvailableSymbols();
        if (response.symbols) {
          // Convert backend symbols to TokenInfo format
          const tokenList: TokenInfo[] = response.symbols.map((symbol: string) => {
            // Map symbols to names and chains
            const symbolMap: Record<string, { name: string; chain: string }> = {
              'BTCUSDT': { name: 'Bitcoin', chain: 'Bitcoin' },
              'ETHUSDT': { name: 'Ethereum', chain: 'Ethereum' },
              'BNBUSDT': { name: 'Binance Coin', chain: 'BSC' },
              'ADAUSDT': { name: 'Cardano', chain: 'Cardano' },
              'SOLUSDT': { name: 'Solana', chain: 'Solana' },
              'XRPUSDT': { name: 'Ripple', chain: 'Ripple' },
              'DOTUSDT': { name: 'Polkadot', chain: 'Polkadot' },
              'DOGEUSDT': { name: 'Dogecoin', chain: 'Dogecoin' },
              'AVAXUSDT': { name: 'Avalanche', chain: 'Avalanche' },
              'MATICUSDT': { name: 'Polygon', chain: 'Polygon' },
              'LINKUSDT': { name: 'Chainlink', chain: 'Ethereum' },
              'UNIUSDT': { name: 'Uniswap', chain: 'Ethereum' },
              'LTCUSDT': { name: 'Litecoin', chain: 'Litecoin' },
              'ATOMUSDT': { name: 'Cosmos', chain: 'Cosmos' },
              'ETCUSDT': { name: 'Ethereum Classic', chain: 'Ethereum Classic' },
            };
            
            const info = symbolMap[symbol] || { name: symbol.replace('USDT', ''), chain: 'Unknown' };
            return {
              symbol,
              name: info.name,
              chain: info.chain,
            };
          });
          setTokens(tokenList);
        }
      } catch (error) {
        // Fallback to default tokens
        setTokens([
          { symbol: 'BTCUSDT', name: 'Bitcoin', chain: 'Bitcoin' },
          { symbol: 'ETHUSDT', name: 'Ethereum', chain: 'Ethereum' },
          { symbol: 'BNBUSDT', name: 'Binance Coin', chain: 'BSC' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens;
    
    const query = searchQuery.toLowerCase();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.chain.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  // Group tokens by chain
  const groupedTokens = useMemo(() => {
    const groups: Record<string, TokenInfo[]> = {};
    filteredTokens.forEach((token) => {
      if (!groups[token.chain]) {
        groups[token.chain] = [];
      }
      groups[token.chain].push(token);
    });
    return groups;
  }, [filteredTokens]);

  const selectedToken = tokens.find((t) => t.symbol === selectedSymbol);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-bg-secondary border border-border-default rounded-lg hover:border-primary-500/50 transition-all duration-200 text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">
              {selectedToken ? `${selectedToken.name} (${selectedToken.symbol})` : selectedSymbol}
            </div>
            {selectedToken && (
              <div className="text-xs text-text-muted truncate">{selectedToken.chain}</div>
            )}
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
            {/* Search Bar */}
            <div className="p-3 border-b border-border-default">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tokens..."
                  className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Token List */}
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-text-muted">Loading tokens...</div>
              ) : Object.keys(groupedTokens).length === 0 ? (
                <div className="p-4 text-center text-text-muted">No tokens found</div>
              ) : (
                Object.entries(groupedTokens).map(([chain, chainTokens]) => (
                  <div key={chain}>
                    <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide bg-bg-tertiary sticky top-0">
                      {chain}
                    </div>
                    {chainTokens.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          onSymbolChange(token.symbol);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-bg-elevated transition-colors flex items-center justify-between ${
                          token.symbol === selectedSymbol ? 'bg-primary-500/10' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary">
                            {token.name}
                          </div>
                          <div className="text-xs text-text-muted">{token.symbol}</div>
                        </div>
                        {token.symbol === selectedSymbol && (
                          <Check className="w-5 h-5 text-primary-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

