
import React from 'react'; // Added React import
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

// 1. Add error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React ErrorBoundary caught:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          background: '#ff0000',
          color: '#ffffff',
          fontSize: '1.5rem',
          minHeight: '100vh'
        }}>
          <h1>Application Error</h1>
          <p>Check browser console for details</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// 2. Get root element and add debug styling
const rootElement = document.getElementById("root");
if (rootElement) {
  rootElement.style.border = '5px solid limegreen';
  rootElement.style.padding = '1rem';
  rootElement.style.minHeight = '100vh';
  console.log('Root element found and styled');
} else {
  console.error('Root element not found!');
}

// 3. Add try-catch block for mounting errors
try {
  if (!rootElement) throw new Error('Root element not found!');
  
  const root = createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <App />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  console.log('React app mounted successfully');
} catch (error) {
  console.error('Mounting failed:', error);
  
  // Create fallback UI if mounting fails
  const fallbackUI = document.createElement('div');
  fallbackUI.innerHTML = `
    <div style="padding: 2rem; background: #ff0000; color: #ffffff;">
      <h1>Critical Application Error</h1>
      <p>${(error as Error).message}</p>
      <pre>${(error as Error).stack || 'No stack trace available'}</pre>
    </div>
  `;
  document.body.appendChild(fallbackUI);
}
