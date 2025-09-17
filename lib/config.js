// Configuration helper for environment variables and settings

export const config = {
  // Clerk Configuration
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in",
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up",
    afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/dashboard",
    afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/dashboard",
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  // AI Configuration
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
  },

  // Email Configuration
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
  },

  // Security Configuration
  security: {
    arcjetKey: process.env.ARCJET_KEY,
  },

  // Background Jobs Configuration
  jobs: {
    inngestEnabled: process.env.INNGEST_ENABLED === "true" && process.env.NODE_ENV === "production",
  },

  // Environment
  env: {
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
  },

  // Timeout configurations
  timeouts: {
    auth: 30000, // 30 seconds
    api: 10000,  // 10 seconds
    middleware: 30000, // 30 seconds
  },
};

// Validation function to check required environment variables
export function validateConfig() {
  const required = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "DATABASE_URL",
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing);
    return false;
  }

  return true;
}

// Development helper to log configuration status
export function logConfigStatus() {
  if (config.env.isDevelopment) {
    console.log("🔧 Development Configuration:");
    console.log("✅ Clerk:", config.clerk.publishableKey ? "Configured" : "Missing");
    console.log("✅ Database:", config.database.url ? "Configured" : "Missing");
    console.log("✅ AI:", config.ai.geminiApiKey ? "Configured" : "Missing");
    console.log("✅ Email:", config.email.resendApiKey ? "Configured" : "Missing");
    console.log("✅ Security:", config.security.arcjetKey ? "Configured" : "Missing");
    console.log("✅ Inngest:", config.jobs.inngestEnabled ? "Enabled" : "Disabled");
  }
}
