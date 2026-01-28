import { usePersistedState } from './usePersistedState';

export interface MarketControlsState {
  symbol: string;
  exchange: string;
  startDate: string;
  endDate: string;
  timeframe?: string;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function useMarketControls(pageKey: 'indicators' | 'valuation' | 'fullcycle' | 'dashboard') {
  const storageKey = `marketControls:${pageKey}`;

  const [state, setState] = usePersistedState<MarketControlsState>(
    storageKey,
    {
      symbol: 'BTCUSDT',
      exchange: 'Binance',
      startDate: '2010-01-01',
      endDate: todayISO(),
      timeframe: pageKey === 'fullcycle' ? '1d' : undefined,
    },
    { version: 1 }
  );

  const setSymbol = (symbol: string) => setState({ ...state, symbol });
  const setExchange = (exchange: string) => setState({ ...state, exchange });
  const setStartDate = (startDate: string) => setState({ ...state, startDate });
  const setEndDate = (endDate: string) => setState({ ...state, endDate: endDate || todayISO() });
  const setTimeframe = (timeframe: string) => setState({ ...state, timeframe });

  return {
    ...state,
    endDate: state.endDate || todayISO(),
    setSymbol,
    setExchange,
    setStartDate,
    setEndDate,
    setTimeframe,
  };
}


