'use client';

import { useState, useEffect } from 'react';
import { useToolsStore } from '@/stores/system/tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, ArrowDown, ArrowUp, RotateCcw, Info } from 'lucide-react';
import { api } from '@/lib/api';

interface MethodExecutionPanelProps {
  serverId: string;
  methodName: string;
  methodDetails?: any; // Accept method details directly from parent
  workspaceId?: string;
}

export default function MethodExecutionPanel({ 
  serverId, 
  methodName, 
  methodDetails: propMethodDetails,
  workspaceId
}: MethodExecutionPanelProps) {
  const { 
    serverMethods, 
    loadMethodDetails, 
    invokeMethod, 
    methodExecutionHistory,
    isLoading, 
    error 
  } = useToolsStore();
  
  const [paramsJson, setParamsJson] = useState('{}');
  const [params, setParams] = useState<Record<string, any>>({});
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localMethod, setLocalMethod] = useState<any>(null);
  
  // Find the method details from either props or store
  const methodsForServer = serverMethods[serverId] || [];
  const storeMethod = methodsForServer.find(m => m.name === methodName);
  const method = propMethodDetails || localMethod || storeMethod;
  
  // Update params object when JSON changes
  useEffect(() => {
    try {
      const parsed = JSON.parse(paramsJson);
      setParams(parsed);
      setParamsError(null);
    } catch (err) {
      setParamsError('Invalid JSON parameters');
    }
  }, [paramsJson]);
  
  // Update JSON when params object changes
  const updateParams = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    setParamsJson(JSON.stringify(newParams, null, 2));
  };
  
  // Load method details if needed - directly fetch if not provided in props
  useEffect(() => {
    if (propMethodDetails) {
      // If method details were provided by parent, use those
      setLocalMethod(propMethodDetails);
    } else if (!storeMethod || !storeMethod.parameters) {
      // Otherwise try to load from store or directly
      const fetchMethodDetails = async () => {
        setLocalLoading(true);
        try {
          // Try to fetch directly to avoid triggering status checks
          const details = await api.tools.getMethodDetails(serverId, methodName, workspaceId);
          setLocalMethod(details);
          setLocalError(null);
        } catch (err) {
          console.error(`Failed to load details for method ${methodName}:`, err);
          setLocalError('Failed to load method details');
          
          // Fall back to store method if direct fetch fails
          loadMethodDetails(serverId, methodName);
        } finally {
          setLocalLoading(false);
        }
      };
      
      fetchMethodDetails();
    }
  }, [serverId, methodName, propMethodDetails, storeMethod, loadMethodDetails]);
  
  // Filter execution history for this method
  const methodHistory = methodExecutionHistory.filter(
    item => item.serverId === serverId && item.methodName === methodName
  );
  
  // Handle form submission to invoke method
  const handleInvoke = async () => {
    try {
      setLocalLoading(true);
      // Use direct API call to control workspaceId parameter
      const result = await api.tools.invokeMethod(serverId, methodName, params, workspaceId);
      setResult(result);
    } catch (err) {
      console.error('Error invoking method:', err);
      // Error is handled directly
    } finally {
      setLocalLoading(false);
    }
  };
  
  // Determine field type based on schema property
  const getFieldType = (property: any) => {
    if (!property || !property.type) return 'text';
    
    switch (property.type) {
      case 'boolean':
        return 'boolean';
      case 'integer':
      case 'number':
        return 'number';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'text';
    }
  };
  
  // Render appropriate field based on schema type
  const renderField = (key: string, property: any, required: boolean = false) => {
    const type = getFieldType(property);
    const value = params[key];
    
    switch (type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch 
              id={`param-${key}`}
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateParams(key, checked)}
            />
            <Label htmlFor={`param-${key}`}>{value ? 'True' : 'False'}</Label>
          </div>
        );
        
      case 'number':
        return (
          <Input
            id={`param-${key}`}
            type="number"
            value={value || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value);
              updateParams(key, val);
            }}
            placeholder={property.description || key}
          />
        );
        
      case 'array':
        return (
          <Textarea
            id={`param-${key}`}
            value={Array.isArray(value) ? JSON.stringify(value, null, 2) : '[]'}
            onChange={(e) => {
              try {
                const arr = JSON.parse(e.target.value);
                if (Array.isArray(arr)) {
                  updateParams(key, arr);
                }
              } catch (err) {
                // Invalid JSON, but we'll let them continue typing
              }
            }}
            placeholder={`[\n  "item1",\n  "item2"\n]`}
            className="font-mono"
            rows={3}
          />
        );
        
      case 'object':
        return (
          <Textarea
            id={`param-${key}`}
            value={typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : '{}'}
            onChange={(e) => {
              try {
                const obj = JSON.parse(e.target.value);
                if (typeof obj === 'object' && obj !== null) {
                  updateParams(key, obj);
                }
              } catch (err) {
                // Invalid JSON, but we'll let them continue typing
              }
            }}
            placeholder="{}"
            className="font-mono"
            rows={3}
          />
        );
        
      case 'text':
      default:
        // Check if there's an enum for dropdown
        if (property.enum && Array.isArray(property.enum) && property.enum.length > 0) {
          return (
            <Select
              value={String(value || '')}
              onValueChange={(val) => updateParams(key, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${key}`} />
              </SelectTrigger>
              <SelectContent>
                {property.enum.map((option: any) => (
                  <SelectItem key={option} value={String(option)}>
                    {String(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        
        // Default text input
        return (
          <Input
            id={`param-${key}`}
            value={value || ''}
            onChange={(e) => updateParams(key, e.target.value)}
            placeholder={property.description || key}
          />
        );
    }
  };
  
  // Generate a parameter form from the method schema
  const renderParameterForm = () => {
    if (!method || !method.parameters) {
      return (
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            Enter parameters as JSON:
          </div>
          <Textarea
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            className="font-mono"
            rows={5}
            placeholder="{}"
          />
          {paramsError && (
            <div className="text-sm text-red-500">{paramsError}</div>
          )}
        </div>
      );
    }
    
    // Check if parameters is an object with properties
    const parameters = method.parameters;
    
    if (parameters.type === 'object' && parameters.properties) {
      return (
        <div className="space-y-4">
          {/* Parameter Fields */}
          <div className="space-y-4">
            {Object.keys(parameters.properties).length > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Method Parameters</div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="show-json" className="text-sm cursor-pointer">
                      Show JSON
                    </Label>
                    <Switch
                      id="show-json"
                      checked={showRawJson}
                      onCheckedChange={setShowRawJson}
                    />
                  </div>
                </div>
                
                {/* Form Fields */}
                <div className="space-y-4">
                  {Object.entries(parameters.properties).map(([key, prop]: [string, any]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`param-${key}`} className="text-sm font-medium">
                          {key}
                          {parameters.required?.includes(key) && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>
                        
                        {/* Show description tooltip if available */}
                        {prop.description && (
                          <div className="relative group">
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            <div className="absolute right-0 w-64 p-2 mt-1 text-xs bg-gray-700 text-white rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                              {prop.description}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Render the appropriate field type */}
                      {renderField(key, prop, parameters.required?.includes(key))}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-4 border rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-500">
                  This method doesn't require any parameters.
                </p>
              </div>
            )}
          </div>
          
          {/* Raw JSON Editor (conditionally shown) */}
          {showRawJson && (
            <div className="pt-2 border-t">
              <Label htmlFor="raw-json" className="text-sm font-medium">
                Raw JSON:
              </Label>
              <Textarea
                id="raw-json"
                value={paramsJson}
                onChange={(e) => setParamsJson(e.target.value)}
                className="font-mono mt-1"
                rows={5}
              />
              {paramsError && (
                <div className="text-sm text-red-500 mt-1">{paramsError}</div>
              )}
            </div>
          )}
        </div>
      );
    } else {
      // For non-object parameters, show raw JSON editor
      return (
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            Enter parameters as JSON:
          </div>
          <Textarea
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            className="font-mono"
            rows={5}
            placeholder="{}"
          />
          {paramsError && (
            <div className="text-sm text-red-500">{paramsError}</div>
          )}
        </div>
      );
    }
  };
  
  // Loading state
  if ((isLoading || localLoading) && !method) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }
  
  // Error state
  if ((error || localError) && !method) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading method details: {error || localError}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              // Try to load directly instead of through the store
              const fetchMethodDetails = async () => {
                setLocalLoading(true);
                try {
                  const details = await api.tools.getMethodDetails(serverId, methodName);
                  setLocalMethod(details);
                  setLocalError(null);
                } catch (err) {
                  console.error(`Failed to load details for method ${methodName}:`, err);
                  setLocalError('Failed to load method details');
                } finally {
                  setLocalLoading(false);
                }
              };
              
              fetchMethodDetails();
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{methodName}</CardTitle>
        <CardDescription>
          {method?.description || `Execute the ${methodName} method on the ${serverId} server`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Parameter input form */}
          {renderParameterForm()}
          
          {/* Execution button */}
          <div className="flex justify-end">
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleInvoke();
              }} 
              disabled={isLoading || localLoading || Boolean(paramsError)}
              className="flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              {isLoading || localLoading ? 'Executing...' : 'Execute'}
            </Button>
          </div>
          
          {/* Results section */}
          {result && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-medium">Results</h3>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
                {typeof result === 'object' 
                  ? JSON.stringify(result, null, 2) 
                  : String(result)
                }
              </div>
            </div>
          )}
          
          {/* Execution history toggle */}
          {methodHistory.length > 0 && (
            <div className="mt-6">
              <div 
                className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-gray-400"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
              >
                {showHistory ? (
                  <>
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Hide execution history
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4 mr-1" />
                    Show execution history ({methodHistory.length})
                  </>
                )}
              </div>
              
              {/* Execution history list */}
              {showHistory && (
                <div className="mt-4 space-y-4">
                  {methodHistory.map((execution, index) => (
                    <div
                      key={execution.timestamp}
                      className={`p-3 border rounded-md ${
                        execution.status === 'error' 
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">
                          Execution {methodHistory.length - index}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(execution.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs text-gray-500 mb-1">Parameters</h4>
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
                            {JSON.stringify(execution.params, null, 2)}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-xs text-gray-500 mb-1">
                            {execution.status === 'error' ? 'Error' : 'Result'}
                          </h4>
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
                            {execution.status === 'error'
                              ? execution.error
                              : JSON.stringify(execution.result, null, 2)
                            }
                          </div>
                        </div>
                      </div>
                      
                      {/* Button to reuse parameters */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setParamsJson(JSON.stringify(execution.params, null, 2));
                        }}
                      >
                        Reuse parameters
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
