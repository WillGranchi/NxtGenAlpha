/**
 * Export Button Component
 * Exports Full Cycle Model data in various formats
 */

import React, { useState } from 'react';
import { Download, FileText, Image, FileJson, FileSpreadsheet } from 'lucide-react';
import { FullCycleDataPoint, FullCycleIndicator } from '../../hooks/useFullCycle';

interface ExportButtonProps {
  data: FullCycleDataPoint[];
  availableIndicators: FullCycleIndicator[];
  selectedIndicators: string[];
  chartRef?: React.RefObject<HTMLDivElement>;
  viewMode?: 'chart' | 'heatmap';
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  availableIndicators,
  selectedIndicators,
  chartRef,
  viewMode = 'chart',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    setIsExporting(true);
    try {
      // Get all indicator names
      const indicatorNames: Record<string, string> = {};
      selectedIndicators.forEach((id) => {
        const indicator = availableIndicators.find((ind) => ind.id === id);
        indicatorNames[id] = indicator?.name || id;
      });
      indicatorNames['fundamental_average'] = 'Fundamental Average';
      indicatorNames['technical_average'] = 'Technical Average';
      indicatorNames['average'] = 'Overall Average';

      // Build CSV header
      const headers = ['Date', 'Price', ...Object.values(indicatorNames)];
      const rows = data.map((point) => {
        const row = [point.date, point.price.toString()];
        Object.keys(indicatorNames).forEach((indicatorId) => {
          const zScore = point.indicators[indicatorId]?.zscore ?? '';
          row.push(zScore.toString());
        });
        return row;
      });

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `full-cycle-model-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    if (!data || data.length === 0) return;

    setIsExporting(true);
    try {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          indicators: selectedIndicators.map((id) => {
            const indicator = availableIndicators.find((ind) => ind.id === id);
            return {
              id,
              name: indicator?.name || id,
              category: indicator?.category || 'unknown',
            };
          }),
          dataPoints: data.length,
          dateRange: {
            start: data[0]?.date,
            end: data[data.length - 1]?.date,
          },
        },
        data: data,
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `full-cycle-model-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export JSON. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPNG = async () => {
    if (!chartRef?.current) {
      alert('Chart not available for export. Please ensure the chart is visible.');
      return;
    }

    setIsExporting(true);
    try {
      // Find Plotly plot element
      const plotElement = chartRef.current.querySelector('.js-plotly-plot');
      if (!plotElement) {
        throw new Error('Plotly chart not found');
      }

      // Use Plotly's toImage method (available via react-plotly.js)
      const plotlyDiv = plotElement as any;
      if (plotlyDiv._fullLayout && (window as any).Plotly) {
        const imgData = await (window as any).Plotly.toImage(plotlyDiv, {
          format: 'png',
          width: 1200,
          height: 800,
          scale: 2,
        });

        // Download image
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `full-cycle-model-chart-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        throw new Error('Plotly chart not initialized');
      }
    } catch (error) {
      console.error('Failed to export PNG:', error);
      alert('Failed to export PNG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    // For PDF, we'll create a simple HTML report and use browser print
    // A full PDF generation would require a backend service
    if (!data || data.length === 0) return;

    setIsExporting(true);
    try {
      const latest = data[data.length - 1];
      const averageZScore = latest?.indicators['average']?.zscore ?? null;

      // Create HTML report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Full Cycle Model Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            .metadata { margin: 20px 0; }
            .metadata div { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Full Cycle Model Report</h1>
          <div class="metadata">
            <div><strong>Export Date:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>Data Range:</strong> ${data[0]?.date} to ${data[data.length - 1]?.date}</div>
            <div><strong>Data Points:</strong> ${data.length.toLocaleString()}</div>
            <div><strong>Indicators:</strong> ${selectedIndicators.length}</div>
            ${averageZScore !== null ? `<div><strong>Current Average Z-Score:</strong> ${averageZScore.toFixed(2)}</div>` : ''}
          </div>
          <p><em>Note: This is a summary report. For full data, please export CSV or JSON format.</em></p>
        </body>
        </html>
      `;

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isExporting || !data || data.length === 0}
        onClick={() => {
          // Show dropdown menu
          const menu = document.getElementById('export-menu');
          if (menu) {
            menu.classList.toggle('hidden');
          }
        }}
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      {/* Export Menu */}
      <div
        id="export-menu"
        className="hidden absolute right-0 mt-2 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-50 min-w-[200px]"
      >
        <div className="p-2">
          <button
            onClick={() => {
              exportToCSV();
              document.getElementById('export-menu')?.classList.add('hidden');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-text-primary hover:bg-bg-tertiary rounded transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              exportToJSON();
              document.getElementById('export-menu')?.classList.add('hidden');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-text-primary hover:bg-bg-tertiary rounded transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Export JSON
          </button>
          {viewMode === 'chart' && (
            <button
              onClick={() => {
                exportToPNG();
                document.getElementById('export-menu')?.classList.add('hidden');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-text-primary hover:bg-bg-tertiary rounded transition-colors"
            >
              <Image className="w-4 h-4" />
              Export PNG
            </button>
          )}
          <button
            onClick={() => {
              exportToPDF();
              document.getElementById('export-menu')?.classList.add('hidden');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-text-primary hover:bg-bg-tertiary rounded transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

