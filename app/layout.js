import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "FinSight",
  description: "AI-Powered Financial Management Platform",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#000000",
        },
        elements: {
          formButtonPrimary: {
            backgroundColor: "#3b82f6",
            "&:hover": {
              backgroundColor: "#2563eb",
            },
          },
          card: {
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          },
        },
      }}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your account",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Sign up to get started",
          },
        },
      }}
    >
      <html lang="en" className="dark">
        <head>
          <link rel="icon" href="/logo-sm.png" sizes="any" />
        </head>
        <body className={`${inter.className} bg-background text-foreground`}>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Toaster richColors />

          <footer className="bg-blue-50 dark:bg-gray-900 py-12">
            <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
              <p>FinSight - Made for You</p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
