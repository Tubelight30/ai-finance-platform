"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Loader2, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { scanBatchReceipts, getOCRPerformanceMetrics } from "@/actions/transaction";

export function BatchReceiptScanner({ onBatchComplete }) {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processingResults, setProcessingResults] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);

  const {
    loading: batchProcessingLoading,
    fn: processBatchFn,
    data: batchResults,
  } = useFetch(scanBatchReceipts);

  const {
    loading: metricsLoading,
    fn: getMetricsFn,
    data: metricsData,
  } = useFetch(getOCRPerformanceMetrics);

  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      setProcessingResults(null);
    }
  };

  const handleBatchProcess = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    if (selectedFiles.length > 10) {
      toast.error("Maximum 10 receipts can be processed at once");
      return;
    }

    await processBatchFn(selectedFiles);
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    setProcessingResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Process batch results when they arrive
  useEffect(() => {
    if (batchResults && !batchProcessingLoading) {
      setProcessingResults(batchResults);
      onBatchComplete?.(batchResults);
      
      const successCount = batchResults.successful.length;
      const totalCount = batchResults.total;
      const successRate = Math.round(batchResults.successRate * 100);
      
      toast.success(
        `Batch processing completed: ${successCount}/${totalCount} receipts processed successfully`,
        {
          description: `${successRate}% success rate • ${batchResults.processingTime}ms total time`
        }
      );
    }
  }, [batchProcessingLoading, batchResults, onBatchComplete]);

  const loadMetrics = () => {
    setShowMetrics(true);
    getMetricsFn();
  };

  return (
    <div className="space-y-4">
      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Batch Receipt Processing
          </CardTitle>
          <CardDescription>
            Upload multiple receipt images for intelligent batch processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleFileSelection}
          />
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={batchProcessingLoading}
            >
              <Camera className="mr-2 h-4 w-4" />
              Select Receipts
            </Button>
            
            {selectedFiles.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFiles}
                disabled={batchProcessingLoading}
              >
                Clear Files
              </Button>
            )}
          </div>

          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Selected Files ({selectedFiles.length}):
              </p>
              <div className="grid gap-1 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process Button */}
          {selectedFiles.length > 0 && (
            <Button
              onClick={handleBatchProcess}
              disabled={batchProcessingLoading}
              className="w-full"
            >
              {batchProcessingLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing {selectedFiles.length} receipts...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Process {selectedFiles.length} Receipts
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Processing Results */}
      {processingResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {processingResults.successful.length}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {processingResults.failed.length}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(processingResults.successRate * 100)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing Progress</span>
                <span>{processingResults.successful.length}/{processingResults.total}</span>
              </div>
              <Progress 
                value={(processingResults.successful.length / processingResults.total) * 100} 
                className="h-2"
              />
            </div>

            {/* Successful Results */}
            {processingResults.successful.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">Successfully Processed:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {processingResults.successful.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="flex-1">{result.file}</span>
                      <span className="text-green-600">
                        ₹{result.result.amount?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Results */}
            {processingResults.failed.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700">Failed to Process:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {processingResults.failed.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="flex-1">{result.file}</span>
                      <span className="text-red-600 text-xs">{result.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            OCR Performance Metrics
          </CardTitle>
          <CardDescription>
            View system performance and processing statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={loadMetrics}
            disabled={metricsLoading}
          >
            {metricsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Metrics...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Performance Metrics
              </>
            )}
          </Button>

          {showMetrics && metricsData && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Processed:</span>
                  <span className="ml-2">{metricsData.totalProcessed || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Success Rate:</span>
                  <span className="ml-2">
                    {Math.round((metricsData.successRate || 0) * 100)}%
                  </span>
                </div>
                <div>
                  <span className="font-medium">Avg Processing Time:</span>
                  <span className="ml-2">{Math.round(metricsData.averageProcessingTime || 0)}ms</span>
                </div>
                <div>
                  <span className="font-medium">Cache Size:</span>
                  <span className="ml-2">{metricsData.cacheSize || 0} items</span>
                </div>
              </div>

              {/* Strategy Distribution */}
              {metricsData.strategyCounts && Object.keys(metricsData.strategyCounts).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Strategy Distribution:</h4>
                  <div className="space-y-1">
                    {Object.entries(metricsData.strategyCounts).map(([strategy, count]) => (
                      <div key={strategy} className="flex justify-between text-sm">
                        <span className="capitalize">{strategy.replace('_', ' ')}:</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BatchReceiptScanner;
