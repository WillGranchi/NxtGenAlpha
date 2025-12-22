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

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="w-full">
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            min={minDate}
            max={maxDate || endDate}
            onChange={handleStartDateChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          />
        </div>
        
        <div className="w-full">
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            min={minDate || startDate}
            max={maxDate}
            onChange={handleEndDateChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          />
        </div>
      </div>
      
      {validationError && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
          {validationError}
        </p>
      )}
    </div>
  );
};

