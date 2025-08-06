import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import http from "http";

// Calculate paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine client build path
let clientBuildPath = path.join(process.cwd(), "client/dist");

// Fallback to client source directory if dist doesn't exist
if (!fs.existsSync(clientBuildPath)) {
  clientBuildPath = path.join(process.cwd(), "client");
}

console.log(`Using client build path: ${clientBuildPath}`);
console.log("Client directory contents:", fs.readdirSync(clientBuildPath));

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// FIXED: Simplified error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(`[ERROR] ${status} - ${message}`);
});

(async () => {
  try {
    console.log("🚀 Starting server initialization...");
    
    // Create HTTP server first
    const server = http.createServer(app);
    
    // Register routes with enhanced error handling
    console.log("🔄 Registering routes...");
    try {
      await registerRoutes(app);
      console.log("✅ Routes registered successfully");
    } catch (routeError) {
      console.error("🚨 Route registration failed:", routeError);
      throw routeError;
    }

    // Serve static files - FIXED: Explicitly define the root
    app.use(express.static(clientBuildPath, {
      index: false, // Disable automatic index.html serving
      maxAge: "1d"  // Cache static assets
    }));
    
    // FIXED: Simplified and secured SPA routing
    const indexPath = path.join(clientBuildPath, "index.html");
    
    // Verify index.html exists
    if (!fs.existsSync(indexPath)) {
      throw new Error(`SPA index file not found at ${indexPath}`);
    }
    
    console.log(`✅ SPA index file found at ${indexPath}`);
    
    // Handle SPA routing - FIXED: Safe pattern without wildcard issues
    app.get("*", (req, res) => {
      // Only serve index.html for non-API routes
      if (!req.path.startsWith("/api")) {
        return res.sendFile(indexPath);
      }
      
      // For API routes, return 404
      res.status(404).json({ message: "API endpoint not found" });
    });

    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server started on port ${port}`);
      console.log(`🌿 Environment: ${process.env.NODE_ENV || "development"}`);
    });
    
    console.log("🎉 Server initialization complete");
  } catch (error) {
    console.error("🚨 Critical error during server setup:");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      // Avoid logging full stack in production
      if (process.env.NODE_ENV !== "production") {
        console.error("Stack trace:", error.stack);
      }
    } else {
      console.error("Unknown error:", error);
    }
    process.exit(1);
  }
})();
