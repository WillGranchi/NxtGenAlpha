/**
 * BTC History Status Component
 * Shows the status of BTC historical data and allows triggering full history build
 */

import React, { useState, useEffect } from 'react';
import TradingAPI from '../../services/api';
import { CheckCircle2, XCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface BTCHistoryStatusProps {
  onStatusChange?: (isComplete: boolean) => void;
}

export const BTCHistoryStatus: React.FC<BTCHistoryStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'complete' | 'incomplete' | 'building' | 'checking'>('checking');
  const [message, setMessage] = useState<string>('Checking BTC history status...');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [buildProgress, setBuildProgress] = useState<string>('');

  const checkStatus = async () => {
    try {
      setStatus('checking');
      const response = await TradingAPI.checkBTCHistoryStatus();
      
      setStatus(response.status);
      setMessage(response.message);
      setDateRange(response.date_range);
      setTotalRecords(response.total_records);
      
      if (onStatusChange) {
        onStatusChange(response.is_complete || false);
      }
    } catch (error: any) {
      console.error('Failed to check BTC history status:', error);
      setStatus('incomplete');
      setMessage('Failed to check status');
    }
  };

  const triggerBuild = async () => {
    try {
      setIsBuilding(true);
      setStatus('building');
      setBuildProgress('Starting full history build...');
      
      const response = await TradingAPI.ensureBTCHistory({
        exchange: 'Binance',
        force_rebuild: false
      });
      
      if (response.success) {
        setStatus(response.is_complete ? 'complete' : 'incomplete');
        setMessage(response.message);
        setDateRange(response.date_range);
        setTotalRecords(response.total_records);
        setBuildProgress('');
        
        if (onStatusChange) {
          onStatusChange(response.is_complete);
        }
      }
    } catch (error: any) {
      console.error('Failed to build BTC history:', error);
      setStatus('incomplete');
      setMessage('Failed to build history. Please try again.');
      setBuildProgress('');
    } finally {
      setIsBuilding(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'incomplete':
        return <XCircle className="h-5 w-5 text-yellow-400" />;
      case 'building':
      case 'checking':
        return <Loader2 className="h-5 w-5 text-primary-400 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-text-secondary" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-500/10 border-green-500/50 text-green-400';
      case 'incomplete':
        return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
      case 'building':
      case 'checking':
        return 'bg-primary-500/10 border-primary-500/50 text-primary-400';
      default:
        return 'bg-bg-secondary border-border-default text-text-secondary';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold">BTC History Status</h3>
            </div>
            <p className="text-xs opacity-90 mb-2">{message}</p>
            
            {dateRange && (
              <div className="text-xs opacity-75 mb-1">
                <span>Range: {dateRange.start} to {dateRange.end}</span>
                {totalRecords > 0 && (
                  <span className="ml-2">({totalRecords.toLocaleString()} records)</span>
                )}
              </div>
            )}
            
            {buildProgress && (
              <p className="text-xs opacity-75 mt-2 italic">{buildProgress}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'incomplete' && !isBuilding && (
            <button
              onClick={triggerBuild}
              className="px-3 py-1.5 text-xs font-medium bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 border border-primary-500/30 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Build Full History
            </button>
          )}
          {status !== 'checking' && (
            <button
              onClick={checkStatus}
              disabled={isBuilding}
              className="p-1.5 text-xs hover:bg-white/5 rounded transition-colors disabled:opacity-50"
              title="Refresh status"
            >
              <RefreshCw className={`h-4 w-4 ${isBuilding ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

