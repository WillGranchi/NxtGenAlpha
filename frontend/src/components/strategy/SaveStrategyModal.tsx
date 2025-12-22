import React, { useState } from 'react';

interface SaveStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  initialName?: string;
  initialDescription?: string;
}

const SaveStrategyModal: React.FC<SaveStrategyModalProps> = ({
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Strategy name is required');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(name.trim(), description.trim() || undefined);
      // Reset form
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save strategy');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="card shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-text-primary">Save Strategy</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="strategy-name" className="block text-sm font-medium text-text-primary mb-1">
              Strategy Name <span className="text-danger-500">*</span>
            </label>
            <input
              id="strategy-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., My RSI Strategy"
              disabled={isSaving}
              required
              maxLength={255}
            />
          </div>

          <div>
            <label htmlFor="strategy-description" className="block text-sm font-medium text-text-primary mb-1">
              Description (Optional)
            </label>
            <textarea
              id="strategy-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              placeholder="Add a description for this strategy..."
              rows={3}
              disabled={isSaving}
              maxLength={2000}
            />
          </div>

          {error && (
            <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-3">
              <p className="text-sm text-danger-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="btn-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Strategy'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveStrategyModal;

