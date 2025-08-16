import stabilizeApp from './lib/disable-hmr';
stabilizeApp(); // Added to disable HMR/WebSocket in production

import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter } from 'react-router-dom';

// Wait for DOM to be fully ready
document.addEventListener('DOMContentLoaded', () => {
  // [Keep all your existing debug code unchanged]
  // Remove Replit banner if it exists
  const replitBanner = document.querySelector('.replit-ui-theme-root');
  if (replitBanner) {
    replitBanner.remove();
    console.log('Removed Replit banner');
  }
  
  // Remove Replit badge if it exists
  const replitBadge = document.querySelector('.replit-badge');
  if (replitBadge) {
    replitBadge.remove();
    console.log('Removed Replit badge');
  }

  // 1. Create a debug container that will always be visible
  const debugContainer = document.createElement('div');
  debugContainer.id = 'debug-container';
  debugContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff0000;
    color: white;
    padding: 1rem;
    font-family: monospace;
    font-size: 1.2rem;
    z-index: 9999;
    display: none;
  `;
  document.body.appendChild(debugContainer);

  // 2. Get root element and force debug styles with !important
  const rootElement = document.getElementById("root");
  if (rootElement) {
    // Protect root element from modification
    rootElement.innerHTML = '';
    Object.defineProperty(rootElement, 'innerHTML', {
      writable: false,
      configurable: false
    });

    rootElement.style.setProperty('border', '5px solid limegreen', 'important');
    rootElement.style.setProperty('padding', '1rem', 'important');
    rootElement.style.setProperty('min-height', '100vh', 'important');
    rootElement.style.setProperty('background', 'rgba(0,255,0,0.1)', 'important');
    console.log('Root element found and styled');
  } else {
    const debugMsg = '⚠️ Root element not found!';
    debugContainer.textContent = debugMsg;
    debugContainer.style.display = 'block';
    console.error(debugMsg);
    return;
  }

  // 3. Enhanced error boundary
  class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
    state = { hasError: false, error: null };
    
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error: Error) {
      const debugMsg = `ErrorBoundary: ${error.message}`;
      debugContainer.textContent = debugMsg;
      debugContainer.style.display = 'block';
      console.error(debugMsg, error);
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
            <p>{this.state.error?.toString()}</p>
            <pre>{this.state.error?.stack}</pre>
          </div>
        );
      }
      return this.props.children;
    }
  }

  // 4. Global error handler
  window.addEventListener('error', (event) => {
    const debugMsg = `Global Error: ${event.message}`;
    debugContainer.textContent = debugMsg;
    debugContainer.style.display = 'block';
    console.error(debugMsg, event.error);
  });

  // 5. Try to mount the app
  try {
    const root = createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              {/* Add BrowserRouter here wrapping App */}
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('React app mounted successfully');
  } catch (error) {
    const err = error as Error;
    const debugMsg = `Mounting Failed: ${err.message}`;
    debugContainer.textContent = debugMsg;
    debugContainer.style.display = 'block';
    console.error(debugMsg, error);
    
    // Create fallback UI
    const fallbackUI = document.createElement('div');
    fallbackUI.style.cssText = `
      padding: 2rem;
      background: #ff0000;
      color: #ffffff;
      font-size: 1.5rem;
      min-height: 100vh;
    `;
    fallbackUI.innerHTML = `
      <h1>Critical Application Error</h1>
      <p>${err.message}</p>
      <pre>${err.stack || 'No stack trace available'}</pre>
    `;
    document.body.appendChild(fallbackUI);
  }
});
