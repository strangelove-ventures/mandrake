'use client';

import { useState, useEffect } from 'react';
import { useToolsStore } from '@/stores/system/tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';

interface MethodExecutionPanelProps {
  serverId: string;
  methodName: string;
}

export default function MethodExecutionPanel({ serverId, methodName }: MethodExecutionPanelProps) {
  const { 
    serverMethods, 
    loadMethodDetails, 
    invokeMethod, 
    methodExecutionHistory,
    isLoading, 
    error 
  } = useToolsStore();
  
  const [paramsJson, setParamsJson] = useState('{}');
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Find the method details
  const methodsForServer = serverMethods[serverId] || [];
  const method = methodsForServer.find(m => m.name === methodName);
  
  // Load method details if needed
  useEffect(() => {
    if (!method || !method.parameters) {
      loadMethodDetails(serverId, methodName);
    }
  }, [serverId, methodName, method, loadMethodDetails]);
  
  // Filter execution history for this method
  const methodHistory = methodExecutionHistory.filter(
    item => item.serverId === serverId && item.methodName === methodName
  );
  
  // Handle form submission to invoke method
  const handleInvoke = async () => {
    // Validate JSON
    try {
      const params = JSON.parse(paramsJson);
      setParamsError(null);
      
      // Invoke method
      try {
        const result = await invokeMethod(serverId, methodName, params);
        setResult(result);
      } catch (err) {
        console.error('Error invoking method:', err);
        // Error is handled via the store
      }
    } catch (err) {
      setParamsError('Invalid JSON parameters');
    }
  };
  
  // Generate a simple parameter form from the method schema
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
      // For simple object parameters, create form fields
      try {
        const parsedParams = JSON.parse(paramsJson);
        
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Method parameters:
            </div>
            
            {/* Display form fields based on parameters */}
            <div className="space-y-3">
              {Object.entries(parameters.properties).map(([key, prop]: [string, any]) => (
                <div key={key} className="flex flex-col space-y-1">
                  <label className="text-sm font-medium">
                    {key}
                    {parameters.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Input
                    value={parsedParams[key] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const newParams = { ...parsedParams, [key]: value };
                      setParamsJson(JSON.stringify(newParams, null, 2));
                    }}
                    placeholder={prop.description || key}
                  />
                  {prop.description && (
                    <p className="text-xs text-gray-500">{prop.description}</p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="pt-2">
              <label className="text-sm font-medium">Raw JSON:</label>
              <Textarea
                value={paramsJson}
                onChange={(e) => setParamsJson(e.target.value)}
                className="font-mono mt-1"
                rows={5}
              />
              {paramsError && (
                <div className="text-sm text-red-500 mt-1">{paramsError}</div>
              )}
            </div>
          </div>
        );
      } catch (err) {
        // If there's an error parsing the JSON, fall back to raw editing
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
  if (isLoading && !method) {
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
  if (error && !method) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading method details: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => loadMethodDetails(serverId, methodName)}
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
              onClick={handleInvoke} 
              disabled={isLoading}
              className="flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Executing...' : 'Execute'}
            </Button>
          </div>
          
          {/* Results section */}
          {result && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-medium">Results</h3>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto">
                <pre className="text-sm font-mono">
                  {typeof result === 'object' 
                    ? JSON.stringify(result, null, 2) 
                    : String(result)
                  }
                </pre>
              </div>
            </div>
          )}
          
          {/* Execution history toggle */}
          {methodHistory.length > 0 && (
            <div className="mt-6">
              <div 
                className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-gray-400"
                onClick={() => setShowHistory(!showHistory)}
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
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(execution.params, null, 2)}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-xs text-gray-500 mb-1">
                            {execution.status === 'error' ? 'Error' : 'Result'}
                          </h4>
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto">
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
                        onClick={() => {
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
