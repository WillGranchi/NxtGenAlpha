/**
 * Save Valuation Modal Component
 * Modal for saving valuation configurations
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface SaveValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  initialName?: string;
  initialDescription?: string;
}

export const SaveValuationModal: React.FC<SaveValuationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
      setError(null);
    }
  }, [isOpen, initialName, initialDescription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Valuation name is required');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save valuation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-bg-secondary border border-border-default rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Save Valuation</h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="valuation-name" className="block text-sm font-medium text-text-primary mb-1">
              Valuation Name <span className="text-red-400">*</span>
            </label>
            <input
              id="valuation-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., BTC Mean Reversion Analysis"
              disabled={isSaving}
              required
              maxLength={255}
            />
          </div>

          <div>
            <label htmlFor="valuation-description" className="block text-sm font-medium text-text-primary mb-1">
              Description (Optional)
            </label>
            <textarea
              id="valuation-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Add a description for this valuation..."
              rows={3}
              disabled={isSaving}
              maxLength={2000}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Valuation'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
