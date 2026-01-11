/**
 * Token Selector Component
 * Allows users to select cryptocurrency tokens for strategy backtesting
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { TradingAPI } from '../services/api';

interface TokenInfo {
  symbol: string; // CoinGlass format: "BTC/USDT"
  name: string;
  chain: string;
  exchange?: string | null;
}

interface TokenSelectorProps {
  selectedSymbol: string; // Can be either format (CoinGlass or internal)
  onSymbolChange: (symbol: string) => void; // Will receive CoinGlass format
  selectedExchange?: string; // "All Exchanges" or specific exchange name
  className?: string;
}

/**
 * Convert CoinGlass format ("BTC/USDT") to internal format ("BTCUSDT")
 */
function coinglassToInternal(symbol: string): string {
  return symbol.replace('/', '');
}

/**
 * Convert internal format ("BTCUSDT") to CoinGlass format ("BTC/USDT")
 */
function internalToCoinglass(symbol: string): string {
  // If already in CoinGlass format, return as is
  if (symbol.includes('/')) {
    return symbol;
  }
  // Convert "BTCUSDT" -> "BTC/USDT"
  const match = symbol.match(/^([A-Z]+)(USDT|USD|BTC|ETH)$/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  // Fallback: try to split at common lengths
  if (symbol.length >= 6) {
    const base = symbol.slice(0, -4);
    const quote = symbol.slice(-4);
    return `${base}/${quote}`;
  }
  return symbol;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedSymbol,
  onSymbolChange,
  selectedExchange = 'All Exchanges',
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
        const response = await TradingAPI.getCoinGlassSymbols();
        if (response.symbols && response.symbols.length > 0) {
          // Convert CoinGlass symbols to TokenInfo format
          const tokenList: TokenInfo[] = response.symbols.map((item) => {
            const symbol = item.symbol; // Already in CoinGlass format: "BTC/USDT"
            const baseToken = symbol.split('/')[0] || symbol;
            
            // Map common tokens to their names and chains
            const tokenNameMap: Record<string, { name: string; chain: string }> = {
              'BTC': { name: 'Bitcoin', chain: 'Bitcoin' },
              'ETH': { name: 'Ethereum', chain: 'Ethereum' },
              'BNB': { name: 'Binance Coin', chain: 'BSC' },
              'SOL': { name: 'Solana', chain: 'Solana' },
              'SUI': { name: 'Sui', chain: 'Sui' },
              'XRP': { name: 'Ripple', chain: 'Ripple' },
              'ADA': { name: 'Cardano', chain: 'Cardano' },
              'DOT': { name: 'Polkadot', chain: 'Polkadot' },
              'DOGE': { name: 'Dogecoin', chain: 'Dogecoin' },
              'AVAX': { name: 'Avalanche', chain: 'Avalanche' },
              'MATIC': { name: 'Polygon', chain: 'Polygon' },
              'LINK': { name: 'Chainlink', chain: 'Ethereum' },
              'UNI': { name: 'Uniswap', chain: 'Ethereum' },
              'LTC': { name: 'Litecoin', chain: 'Litecoin' },
              'ATOM': { name: 'Cosmos', chain: 'Cosmos' },
              'ETC': { name: 'Ethereum Classic', chain: 'Ethereum Classic' },
            };
            
            const info = tokenNameMap[baseToken] || { 
              name: item.name || baseToken, 
              chain: item.exchange || 'Unknown' 
            };
            
            return {
              symbol, // CoinGlass format: "BTC/USDT"
              name: item.name || info.name,
              chain: info.chain,
              exchange: item.exchange,
            };
          });
          setTokens(tokenList);
        } else {
          throw new Error('No symbols returned');
        }
      } catch (error) {
        console.error('Failed to fetch CoinGlass symbols:', error);
        // Fallback to default tokens in CoinGlass format
        setTokens([
          { symbol: 'BTC/USDT', name: 'Bitcoin', chain: 'Bitcoin', exchange: null },
          { symbol: 'ETH/USDT', name: 'Ethereum', chain: 'Ethereum', exchange: null },
          { symbol: 'SOL/USDT', name: 'Solana', chain: 'Solana', exchange: null },
          { symbol: 'SUI/USDT', name: 'Sui', chain: 'Sui', exchange: null },
          { symbol: 'BNB/USDT', name: 'Binance Coin', chain: 'BSC', exchange: null },
          { symbol: 'XRP/USDT', name: 'Ripple', chain: 'Ripple', exchange: null },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  // Filter tokens based on search query and exchange
  const filteredTokens = useMemo(() => {
    let filtered = tokens;
    
    // Filter by exchange if not "All Exchanges"
    if (selectedExchange && selectedExchange !== 'All Exchanges') {
      filtered = filtered.filter(
        (token) => token.exchange === selectedExchange
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query) ||
          token.chain.toLowerCase().includes(query) ||
          (token.exchange && token.exchange.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [tokens, searchQuery, selectedExchange]);

  // Group tokens by exchange (if "All Exchanges") or by chain (if specific exchange)
  const groupedTokens = useMemo(() => {
    const groups: Record<string, TokenInfo[]> = {};
    
    if (selectedExchange === 'All Exchanges') {
      // Group by exchange when showing all exchanges
      filteredTokens.forEach((token) => {
        const groupKey = token.exchange || 'Unknown Exchange';
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(token);
      });
    } else {
      // Group by chain when specific exchange is selected
      filteredTokens.forEach((token) => {
        if (!groups[token.chain]) {
          groups[token.chain] = [];
        }
        groups[token.chain].push(token);
      });
    }
    
    return groups;
  }, [filteredTokens, selectedExchange]);

  // Normalize selectedSymbol to CoinGlass format for comparison
  const normalizedSelectedSymbol = selectedSymbol.includes('/') 
    ? selectedSymbol 
    : internalToCoinglass(selectedSymbol);
  
  const selectedToken = tokens.find((t) => t.symbol === normalizedSelectedSymbol);

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
              <div className="text-xs text-text-muted truncate">
              {selectedToken.exchange ? `${selectedToken.exchange} • ${selectedToken.chain}` : selectedToken.chain}
            </div>
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
                Object.entries(groupedTokens).map(([groupKey, groupTokens]) => (
                  <div key={groupKey}>
                    <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide bg-bg-tertiary sticky top-0">
                      {groupKey}
                    </div>
                    {groupTokens.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          // Pass CoinGlass format to parent
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
                          <div className="text-xs text-text-muted">
                            {token.symbol}
                            {token.exchange && selectedExchange === 'All Exchanges' && (
                              <span className="ml-2 text-text-muted/70">• {token.exchange}</span>
                            )}
                          </div>
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

