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

// FIXED: Minimal middleware setup to avoid any conflicts
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// FIXED: Simplified error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: "Internal Server Error" });
  console.error(`[ERROR] ${err.message}`);
});

(async () => {
  try {
    console.log("🚀 Starting server initialization...");
    
    // Create HTTP server first
    const server = http.createServer(app);
    
    // Register routes with debug logging
    console.log("🔄 Registering routes...");
    try {
      await registerRoutes(app);
      console.log("✅ Routes registered successfully");
      
      // Debug: Log all registered routes
      console.log("📋 Registered routes:");
      app._router.stack.forEach((layer: any) => {
        if (layer.route && layer.route.path) {
          console.log(`  - ${layer.route.methods} ${layer.route.path}`);
        }
      });
    } catch (routeError) {
      console.error("🚨 Route registration error:", routeError);
      throw routeError;
    }

    // Serve static files
    app.use(express.static(clientBuildPath, {
      index: false,
      maxAge: "1d"
    }));
    
    // FIXED: Explicit SPA routes - add all your client-side routes here
    const indexPath = path.join(clientBuildPath, "index.html");
    const spaRoutes = [
      "/",
      "/login",
      "/register",
      "/dashboard",
      "/profile",
      "/tasks",
      "/tasks/:id",
      "/users/:id",
      "/settings"
    ];
    
    spaRoutes.forEach(route => {
      app.get(route, (req, res) => {
        res.sendFile(indexPath);
      });
    });
    
    // API 404 handler
    app.all("/api/*", (req, res) => {
      res.status(404).json({ message: "API endpoint not found" });
    });
    
    // Generic 404 handler
    app.use((req, res) => {
      res.status(404).json({ message: "Not found" });
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
      
      // FIXED: Special handling for path-to-regexp errors
      if (error.message.includes("pathToRegexpError")) {
        console.error("💡 SOLUTION: Please check all route patterns for invalid syntax");
        console.error("💡 TIP: Look for routes with empty parameters like '/api//endpoint' or missing parameter names");
      }
    }
    process.exit(1);
  }
})();
