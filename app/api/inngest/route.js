import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import {
  checkBudgetAlerts,
  generateMonthlyReports,
  processRecurringTransaction,
  triggerRecurringTransactions,
} from "@/lib/inngest/function";

// Enable Inngest only when explicitly turned on, or in production
// Now enabled for testing budget alerts
const INNGEST_ENABLED = process.env.INNGEST_ENABLED === "true" || process.env.NODE_ENV === "production";

let handlers = null;
const getHandlers = () => {
  if (!handlers) {
    handlers = serve({
      client: inngest,
      functions: [
        checkBudgetAlerts,
        processRecurringTransaction,
        triggerRecurringTransactions,
        generateMonthlyReports,
      ],
    });
  }
  return handlers;
};

// When disabled, return 204 to stop local registration/heartbeat noise
export const GET = async (...args) => {
  if (!INNGEST_ENABLED) {
    console.log("Inngest disabled in development mode");
    return new Response(null, { status: 204 });
  }
  const { GET } = getHandlers();
  return GET(...args);
};

export const POST = async (...args) => {
  if (!INNGEST_ENABLED) {
    console.log("Inngest disabled in development mode");
    return new Response(null, { status: 204 });
  }
  const { POST } = getHandlers();
  return POST(...args);
};

export const PUT = async (...args) => {
  if (!INNGEST_ENABLED) {
    console.log("Inngest disabled in development mode");
    return new Response(null, { status: 204 });
  }
  const { PUT } = getHandlers();
  return PUT(...args);
};
