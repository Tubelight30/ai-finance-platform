"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptScanner } from "./recipt-scanner";
import BatchReceiptScanner from "./batch-receipt-scanner";
import { Brain, Zap, Target, TrendingUp } from "lucide-react";

export function OCRDemo() {
  const [scannedData, setScannedData] = useState(null);

  const handleScanComplete = (data) => {
    setScannedData(data);
  };

  const handleBatchComplete = (results) => {
    console.log("Batch processing completed:", results);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Intelligent Receipt Scanning
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Advanced OCR system with adaptive model selection, intelligent routing, and performance optimization
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardHeader className="pb-2">
            <Brain className="h-8 w-8 mx-auto text-blue-600" />
            <CardTitle className="text-lg">Smart Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Analyzes image characteristics to determine optimal processing strategy
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <Zap className="h-8 w-8 mx-auto text-yellow-600" />
            <CardTitle className="text-lg">Adaptive Routing</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Routes to specialized models based on content type and complexity
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <Target className="h-8 w-8 mx-auto text-green-600" />
            <CardTitle className="text-lg">High Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Tailored prompts and validation for different receipt types
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <TrendingUp className="h-8 w-8 mx-auto text-purple-600" />
            <CardTitle className="text-lg">Optimized Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Intelligent caching and batch processing for efficiency
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Receipt</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Single Receipt Processing</CardTitle>
              <CardDescription>
                Upload a single receipt for intelligent processing with adaptive model selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReceiptScanner onScanComplete={handleScanComplete} />
              
              {/* Results Display */}
              {scannedData && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Processing Results</h3>
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Amount</label>
                      <p className="text-lg font-semibold">₹{scannedData.amount}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Merchant</label>
                      <p className="text-lg font-semibold">{scannedData.merchantName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Category</label>
                      <Badge variant="secondary">{scannedData.category}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Date</label>
                      <p className="text-sm">{new Date(scannedData.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Processing Metadata */}
                  {scannedData._metadata && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Processing Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-gray-600">Strategy</label>
                          <Badge variant="outline" className="ml-2">
                            {scannedData._metadata.strategy}
                          </Badge>
                        </div>
                        <div>
                          <label className="text-gray-600">Confidence</label>
                          <span className="ml-2">
                            {Math.round((scannedData._metadata.confidence || 0.8) * 100)}%
                          </span>
                        </div>
                        <div>
                          <label className="text-gray-600">Processing Time</label>
                          <span className="ml-2">{scannedData._metadata.processingTime}ms</span>
                        </div>
                        <div>
                          <label className="text-gray-600">Fallback Used</label>
                          <Badge 
                            variant={scannedData._metadata.isFallback ? "destructive" : "secondary"}
                            className="ml-2"
                          >
                            {scannedData._metadata.isFallback ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => setScannedData(null)}
                    variant="outline"
                    className="w-full"
                  >
                    Clear Results
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <BatchReceiptScanner onBatchComplete={handleBatchComplete} />
        </TabsContent>
      </Tabs>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Capabilities</CardTitle>
          <CardDescription>
            Advanced OCR features and processing strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">OCR Strategies</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Lightweight OCR</span>
                  <Badge variant="secondary">Simple receipts</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Handwriting OCR</span>
                  <Badge variant="secondary">Handwritten text</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Batch OCR</span>
                  <Badge variant="secondary">Multiple receipts</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mixed Content OCR</span>
                  <Badge variant="secondary">Printed + handwritten</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Performance Features</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Intelligent Caching</span>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Batch Processing</span>
                  <Badge variant="outline">Up to 10 receipts</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fallback System</span>
                  <Badge variant="outline">Multi-level</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Metrics Tracking</span>
                  <Badge variant="outline">Real-time</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OCRDemo;
