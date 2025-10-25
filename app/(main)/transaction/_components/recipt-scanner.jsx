"use client";

import { useRef, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { scanReceipt } from "@/actions/transaction";

// Helper function to get display names for OCR strategies
function getStrategyDisplayName(strategy) {
  const strategyNames = {
    'lightweight': 'Lightweight OCR',
    'standard': 'Standard OCR',
    'handwriting': 'Handwriting OCR',
    'batch': 'Batch OCR',
    'mixed': 'Mixed Content OCR',
    'fallback': 'Fallback OCR',
    'fallback_original': 'Original Gemini OCR'
  };
  return strategyNames[strategy] || 'Unknown Strategy';
}

export function ReceiptScanner({ onScanComplete }) {
  const fileInputRef = useRef(null);

  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
    data: scannedData,
  } = useFetch(scanReceipt);

  const handleReceiptScan = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    await scanReceiptFn(file);
  };

  useEffect(() => {
    if (scannedData && !scanReceiptLoading) {
      onScanComplete(scannedData);
      
      // Enhanced success message with processing details
      const metadata = scannedData._metadata;
      if (metadata) {
        const strategyName = getStrategyDisplayName(metadata.strategy);
        const confidence = Math.round((metadata.confidence || 0.8) * 100);
        
        toast.success(
          `Receipt scanned successfully using ${strategyName} (${confidence}% confidence)`,
          {
            description: metadata.processingTime ? 
              `Processing time: ${metadata.processingTime}ms` : 
              undefined
          }
        );
      } else {
        toast.success("Receipt scanned successfully");
      }
    }
  }, [scanReceiptLoading, scannedData]);

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReceiptScan(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
      >
        {scanReceiptLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            <span>Scan Receipt with AI</span>
          </>
        )}
      </Button>
    </div>
  );
}
