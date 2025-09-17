"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";

const HeroSection = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const features = [
    { icon: <TrendingUp className="h-6 w-6" />, text: "AI-Powered Analytics" },
    { icon: <Shield className="h-6 w-6" />, text: "Secure & Private" },
    { icon: <Zap className="h-6 w-6" />, text: "Real-time Insights" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-40 pb-20 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="container mx-auto text-center relative z-10">
        {/* Animated Feature Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-full px-4 py-2 mb-8 animate-fade-in">
          <div className="text-blue-500 animate-spin-slow">
            {features[currentFeature].icon}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {features[currentFeature].text}
          </span>
        </div>

        {/* Main Heading with Animation */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl pb-6 gradient-title animate-slide-up">
          <span className="block">Smart Finance</span>
          <span className="block text-4xl md:text-5xl lg:text-6xl mt-2 opacity-80">
            Made Simple
          </span>
        </h1>

        {/* Subtitle with Typewriter Effect */}
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto animate-fade-in-delay">
          FinSight transforms your financial data into actionable insights. 
          Track expenses, optimize budgets, and make smarter money decisions with AI-powered analytics.
        </p>

        {/* CTA Buttons with Hover Effects */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-slide-up-delay">
          <Link href="/dashboard">
            <Button 
              size="lg" 
              className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="#features">
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 py-4 text-lg border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transform hover:scale-105 transition-all duration-300"
            >
              Explore Features
            </Button>
          </Link>
        </div>

        {/* Floating Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in-delay-2">
          {[
            { number: "50K+", label: "Active Users", color: "text-blue-600" },
            { number: "₹2B+", label: "Transactions", color: "text-green-600" },
            { number: "99.9%", label: "Uptime", color: "text-purple-600" },
            { number: "4.9/5", label: "Rating", color: "text-orange-600" },
          ].map((stat, index) => (
            <div 
              key={index}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/50 hover:scale-105 transition-transform duration-300"
            >
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.number}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
