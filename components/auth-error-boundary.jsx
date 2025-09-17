"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

export function AuthErrorBoundary({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    // Log the error for debugging
    console.error("Authentication error:", error);
  }, [error]);

  const handleRetry = () => {
    // Clear any cached auth state
    if (typeof window !== "undefined") {
      localStorage.removeItem("clerk-session");
      sessionStorage.clear();
    }
    reset();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const isTimeoutError = error?.message?.includes("timeout") || error?.message?.includes("TIMEOUT");
  const isRateLimitError = error?.message?.includes("rate limit") || error?.message?.includes("RATE_LIMIT");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Authentication Error</CardTitle>
          <CardDescription>
            {isTimeoutError && "Request timed out. Please check your internet connection and try again."}
            {isRateLimitError && "Too many requests. Please wait a moment before trying again."}
            {!isTimeoutError && !isRateLimitError && "Something went wrong with authentication. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="w-full">
              Go Home
            </Button>
          </div>
          
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error?.message || "Unknown error"}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
