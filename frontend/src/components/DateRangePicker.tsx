/**
 * Date range picker component for selecting backtest date ranges.
 */

import React from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  minDate?: string;
  maxDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  minDate,
  maxDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
}) => {
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    onStartDateChange(newStartDate);
    
    // Validate end date is after start date
    if (newStartDate && endDate && newStartDate > endDate) {
      setValidationError('End date must be after start date');
    } else {
      setValidationError(null);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    onEndDateChange(newEndDate);
    
    // Validate end date is after start date
    if (startDate && newEndDate && startDate > newEndDate) {
      setValidationError('End date must be after start date');
    } else {
      setValidationError(null);
    }
  };

  // Get today's date in YYYY-MM-DD format for max date
  const today = new Date().toISOString().split('T')[0];
  const effectiveMaxDate = maxDate || today;
  const effectiveMinDate = minDate || '2010-01-01';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="w-full">
          <label htmlFor="start-date" className="block text-sm font-medium text-text-secondary mb-2">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            min={effectiveMinDate}
            max={effectiveMaxDate || endDate || today}
            onChange={handleStartDateChange}
            step="1"
            className="w-full px-3 py-2.5 border border-border-default rounded-lg shadow-sm 
                     bg-bg-tertiary text-text-primary
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     disabled:bg-bg-secondary disabled:cursor-not-allowed
                     text-base sm:text-sm
                     touch-manipulation
                     [&::-webkit-calendar-picker-indicator]:cursor-pointer
                     [&::-webkit-calendar-picker-indicator]:opacity-60
                     [&::-webkit-calendar-picker-indicator]:hover:opacity-100
                     [&::-webkit-calendar-picker-indicator]:transition-opacity"
            style={{
              // Ensure calendar popup works well on mobile
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
        </div>
        
        <div className="w-full">
          <label htmlFor="end-date" className="block text-sm font-medium text-text-secondary mb-2">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            min={effectiveMinDate || startDate}
            max={effectiveMaxDate || today}
            onChange={handleEndDateChange}
            step="1"
            className="w-full px-3 py-2.5 border border-border-default rounded-lg shadow-sm 
                     bg-bg-tertiary text-text-primary
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     disabled:bg-bg-secondary disabled:cursor-not-allowed
                     text-base sm:text-sm
                     touch-manipulation
                     [&::-webkit-calendar-picker-indicator]:cursor-pointer
                     [&::-webkit-calendar-picker-indicator]:opacity-60
                     [&::-webkit-calendar-picker-indicator]:hover:opacity-100
                     [&::-webkit-calendar-picker-indicator]:transition-opacity"
            style={{
              // Ensure calendar popup works well on mobile
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
        </div>
      </div>
      
      {validationError && (
        <p className="text-sm text-red-400 mt-2 bg-red-500/10 border border-red-500/50 rounded-lg p-2">
          {validationError}
        </p>
      )}
    </div>
  );
};

