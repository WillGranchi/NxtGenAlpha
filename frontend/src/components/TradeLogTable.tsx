import React, { useState } from 'react';

interface Trade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  return_pct: number;
  duration: number;
  direction: string;
}

interface TradeLogTableProps {
  trades: Trade[];
}

export const TradeLogTable: React.FC<TradeLogTableProps> = ({ trades }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedTrades = React.useMemo(() => {
    if (!sortColumn) return trades;

    return [...trades].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Trade];
      let bVal: any = b[sortColumn as keyof Trade];

      if (sortColumn === 'entry_date' || sortColumn === 'exit_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [trades, sortColumn, sortDirection]);

  const exportToCSV = () => {
    const headers = ['Entry Date', 'Exit Date', 'Entry Price', 'Exit Price', 'Return %', 'Duration', 'Direction'];
    const csvContent = [
      headers.join(','),
      ...sortedTrades.map(trade => [
        trade.entry_date,
        trade.exit_date,
        trade.entry_price,
        trade.exit_price,
        trade.return_pct,
        trade.duration,
        trade.direction
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Trade Log (0 trades)</h3>
        </div>
        <p className="text-gray-500 mt-4">No completed trades</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-xl font-semibold hover:text-blue-600 transition-colors"
        >
          <span>Trade Log ({trades.length} trades)</span>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Export CSV
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4">
          <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('entry_date')}
                  >
                    Entry Date
                    {sortColumn === 'entry_date' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('exit_date')}
                  >
                    Exit Date
                    {sortColumn === 'exit_date' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('entry_price')}
                  >
                    Entry Price
                    {sortColumn === 'entry_price' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('exit_price')}
                  >
                    Exit Price
                    {sortColumn === 'exit_price' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('return_pct')}
                  >
                    Return %
                    {sortColumn === 'return_pct' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('duration')}
                  >
                    Duration
                    {sortColumn === 'duration' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('direction')}
                  >
                    Direction
                    {sortColumn === 'direction' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedTrades.map((trade, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{trade.entry_date}</td>
                    <td className="px-4 py-3 text-sm">{trade.exit_date}</td>
                    <td className="px-4 py-3 text-sm text-right">${trade.entry_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">${trade.exit_price.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${
                      trade.return_pct > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.return_pct > 0 ? '+' : ''}{trade.return_pct}%
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{trade.duration} days</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.direction === 'LONG' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
