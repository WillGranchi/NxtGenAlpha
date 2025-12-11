/**
 * Form-based Custom Indicator Builder
 * Allows users to create custom Python indicators with a safe form interface
 */

import React, { useState, useEffect } from 'react';
import { Save, Play, Code, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { TradingAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface ParameterDefinition {
  name: string;
  type: 'int' | 'float';
  default: number;
  min?: number;
  max?: number;
  description: string;
}

interface ConditionDefinition {
  name: string;
  description: string;
}

interface CustomIndicatorBuilderProps {
  onSave?: () => void;
  onCancel?: () => void;
  initialData?: any;
  className?: string;
}

export const CustomIndicatorBuilder: React.FC<CustomIndicatorBuilderProps> = ({
  onSave,
  onCancel,
  initialData,
  className = '',
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  
  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [functionName, setFunctionName] = useState(initialData?.function_name || 'my_indicator');
  const [code, setCode] = useState(initialData?.code || '');
  const [category, setCategory] = useState(initialData?.category || 'Other');
  const [isPublic, setIsPublic] = useState(initialData?.is_public || false);
  
  // Parameters
  const [parameters, setParameters] = useState<ParameterDefinition[]>(
    initialData?.parameters ? Object.entries(initialData.parameters).map(([name, param]: [string, any]) => ({
      name,
      type: param.type || 'float',
      default: param.default || 0,
      min: param.min,
      max: param.max,
      description: param.description || '',
    })) : []
  );
  
  // Conditions
  const [conditions, setConditions] = useState<ConditionDefinition[]>(
    initialData?.conditions ? Object.entries(initialData.conditions).map(([name, desc]: [string, any]) => ({
      name,
      description: desc || '',
    })) : []
  );
  
  // Validation state
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errorMessage?: string;
    signatureValid: boolean;
    signatureError?: string;
  } | null>(null);

  // Load example on mount if no initial data
  useEffect(() => {
    if (!initialData && !code) {
      loadExample();
    }
  }, []);

  const loadExample = async () => {
    try {
      const example = await TradingAPI.getCustomIndicatorExample();
      setCode(example.code);
      setFunctionName(example.function_name);
      setParameters(Object.entries(example.parameters).map(([name, param]: [string, any]) => ({
        name,
        type: param.type || 'float',
        default: param.default || 0,
        min: param.min,
        max: param.max,
        description: param.description || '',
      })));
      setConditions(Object.entries(example.conditions).map(([name, desc]: [string, any]) => ({
        name,
        description: desc || '',
      })));
    } catch (error: any) {
      toast.error('Failed to load example: ' + (error.message || 'Unknown error'));
    }
  };

  const validateCode = async () => {
    if (!code.trim() || !functionName.trim()) {
      toast.error('Please provide code and function name');
      return;
    }

    setIsValidating(true);
    try {
      const result = await TradingAPI.validateCustomIndicator({
        code,
        function_name: functionName,
      });
      setValidationResult(result);
      
      if (result.is_valid && result.signature_valid) {
        toast.success('Code is valid!');
      } else {
        toast.error(result.error_message || result.signature_error || 'Validation failed');
      }
    } catch (error: any) {
      toast.error('Validation error: ' + (error.message || 'Unknown error'));
    } finally {
      setIsValidating(false);
    }
  };

  const addParameter = () => {
    setParameters([...parameters, {
      name: '',
      type: 'float',
      default: 0,
      description: '',
    }]);
  };

  const updateParameter = (index: number, updates: Partial<ParameterDefinition>) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], ...updates };
    setParameters(newParams);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    setConditions([...conditions, {
      name: '',
      description: '',
    }]);
  };

  const updateCondition = (index: number, updates: Partial<ConditionDefinition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim()) {
      toast.error('Please provide a name for your indicator');
      return;
    }

    if (!code.trim()) {
      toast.error('Please provide indicator code');
      return;
    }

    if (!functionName.trim()) {
      toast.error('Please provide a function name');
      return;
    }

    if (parameters.length === 0) {
      toast.warning('No parameters defined. Consider adding at least one parameter.');
    }

    if (conditions.length === 0) {
      toast.warning('No conditions defined. Add conditions to use this indicator in strategies.');
    }

    // Validate code before saving
    if (!validationResult?.is_valid || !validationResult?.signature_valid) {
      toast.error('Please validate your code before saving');
      return;
    }

    // Convert parameters and conditions to the format expected by API
    const paramsDict: Record<string, any> = {};
    parameters.forEach(param => {
      if (param.name.trim()) {
        paramsDict[param.name] = {
          type: param.type,
          default: param.default,
          min: param.min,
          max: param.max,
          description: param.description,
        };
      }
    });

    const conditionsDict: Record<string, string> = {};
    conditions.forEach(cond => {
      if (cond.name.trim()) {
        conditionsDict[cond.name] = cond.description;
      }
    });

    setIsLoading(true);
    try {
      if (initialData?.id) {
        // Update existing
        await TradingAPI.updateCustomIndicator(initialData.id, {
          name,
          description,
          code,
          function_name: functionName,
          parameters: paramsDict,
          conditions: conditionsDict,
          category,
          is_public: isPublic,
        });
        toast.success('Indicator updated successfully!');
      } else {
        // Create new
        await TradingAPI.createCustomIndicator({
          name,
          description,
          code,
          function_name: functionName,
          parameters: paramsDict,
          conditions: conditionsDict,
          category,
          is_public: isPublic,
        });
        toast.success('Custom indicator created successfully!');
      }
      
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      toast.error('Failed to save indicator: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Indicator</CardTitle>
          <CardDescription>
            Build your own Python indicator. Code must define a function that takes (df: pd.DataFrame, params: dict) and returns a pd.Series.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Indicator Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Custom Indicator"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Function Name *
              </label>
              <Input
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                placeholder="e.g., my_indicator"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary"
              rows={2}
              placeholder="Describe what your indicator does..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary"
              >
                <option value="Momentum">Momentum</option>
                <option value="Trend">Trend</option>
                <option value="Volatility">Volatility</option>
                <option value="Volume">Volume</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-center pt-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm text-text-primary">Make this indicator public (shareable)</span>
              </label>
            </div>
          </div>

          {/* Code Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-primary">
                Python Code *
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  {showCodePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showCodePreview ? 'Hide' : 'Show'} Preview
                </button>
                <button
                  onClick={loadExample}
                  className="text-sm text-primary-500 hover:text-primary-400"
                >
                  Load Example
                </button>
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-sm"
              rows={15}
              placeholder="Enter your Python code here..."
            />
            {showCodePreview && code && (
              <div className="mt-2 p-3 bg-bg-secondary border border-border-default rounded-lg">
                <pre className="text-xs text-text-secondary whitespace-pre-wrap">{code}</pre>
              </div>
            )}
          </div>

          {/* Validation */}
          <div className="flex items-center gap-4">
            <Button
              onClick={validateCode}
              isLoading={isValidating}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              Validate Code
            </Button>
            {validationResult && (
              <div className="flex items-center gap-2">
                {validationResult.is_valid && validationResult.signature_valid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success-500" />
                    <span className="text-sm text-success-500">Code is valid</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-danger-500" />
                    <span className="text-sm text-danger-500">
                      {validationResult.error_message || validationResult.signature_error || 'Validation failed'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-text-primary">
                Parameters
              </label>
              <Button onClick={addParameter} variant="secondary" size="sm">
                + Add Parameter
              </Button>
            </div>
            <div className="space-y-3">
              {parameters.map((param, index) => (
                <div key={index} className="p-3 bg-bg-secondary border border-border-default rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Input
                      placeholder="Parameter name"
                      value={param.name}
                      onChange={(e) => updateParameter(index, { name: e.target.value })}
                    />
                    <select
                      value={param.type}
                      onChange={(e) => updateParameter(index, { type: e.target.value as 'int' | 'float' })}
                      className="px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary"
                    >
                      <option value="int">Integer</option>
                      <option value="float">Float</option>
                    </select>
                    <Input
                      type="number"
                      placeholder="Default"
                      value={param.default}
                      onChange={(e) => updateParameter(index, { default: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                      placeholder="Description"
                      value={param.description}
                      onChange={(e) => updateParameter(index, { description: e.target.value })}
                    />
                    <Button
                      onClick={() => removeParameter(index)}
                      variant="danger"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {parameters.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  No parameters defined. Click "Add Parameter" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-text-primary">
                Conditions
              </label>
              <Button onClick={addCondition} variant="secondary" size="sm">
                + Add Condition
              </Button>
            </div>
            <div className="space-y-3">
              {conditions.map((cond, index) => (
                <div key={index} className="p-3 bg-bg-secondary border border-border-default rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Condition name (e.g., indicator_above_price)"
                      value={cond.name}
                      onChange={(e) => updateCondition(index, { name: e.target.value })}
                    />
                    <Input
                      placeholder="Description"
                      value={cond.description}
                      onChange={(e) => updateCondition(index, { description: e.target.value })}
                    />
                    <Button
                      onClick={() => removeCondition(index)}
                      variant="danger"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {conditions.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  No conditions defined. Add conditions to use this indicator in strategies.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            {onCancel && (
              <Button onClick={onCancel} variant="secondary">
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              isLoading={isLoading}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {initialData?.id ? 'Update' : 'Save'} Indicator
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

