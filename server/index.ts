import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Calculate paths - FIXED PATH RESOLUTION
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use process.cwd() to get Render's working directory
const basePath = process.cwd();
const clientBuildPath = path.join(basePath, "client");

// Verify client build directory exists
console.log(`Verifying client build at: ${clientBuildPath}`);
if (!fs.existsSync(clientBuildPath)) {
  console.error("❌ Client build directory not found!");
  console.log("Current working directory:", basePath);
  console.log("Directory contents:", fs.readdirSync(basePath));
} else {
  console.log("✅ Client build directory verified");
  console.log("Files in directory:", fs.readdirSync(clientBuildPath));
}

const log = console.log;
const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Performance logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: any = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // SAFETY WRAPPER FOR ROUTE REGISTRATION
    console.log("Starting route registration...");
    const server = await registerRoutes(app);
    console.log("Route registration completed successfully");
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      log(`[ERROR] ${status} - ${message}`);
      console.error(err);
    });

    // Simple status endpoint
    app.get("/status", (_, res) => {
      res.send("Server is running");
    });

    // Serve static files from client directory
    console.log(`Serving static files from: ${clientBuildPath}`);
    app.use(express.static(clientBuildPath));
    
    // Handle SPA routing - SAFE IMPLEMENTATION
    app.get(/^(?!\/api).*/, (req, res) => {
      const indexPath = path.join(clientBuildPath, "index.html");
      console.log(`Serving index.html for: ${req.path}`);
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`❌ index.html not found at ${indexPath}`);
        res.status(404).send("Page not found");
      }
    });

    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`Server started on port ${port}`);
      log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("🚨 Critical error during server setup:");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
      
      // Add specific diagnostics for route errors
      if (error.message.includes("Missing parameter name")) {
        console.error("\n🔍 ROUTE DIAGNOSTICS:");
        console.error("This error is typically caused by an invalid route pattern");
        console.error("Please check all routes in your application for:");
        console.error("1. Missing parameter names after colons");
        console.error("2. Empty route patterns");
        console.error("3. Special characters in route patterns");
        console.error("4. Middleware with invalid path parameters");
      }
    }
    process.exit(1);
  }
})();
