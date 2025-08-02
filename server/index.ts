import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

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
    const server = await registerRoutes(app);

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

    // Serve static files with proper MIME types
    app.use(express.static(clientBuildPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".js")) {
          res.setHeader("Content-Type", "application/javascript");
        }
        if (filePath.endsWith(".css")) {
          res.setHeader("Content-Type", "text/css");
        }
      }
    }));
    
    // Handle SPA routing
    app.get("*", (req, res) => {
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
    }
    process.exit(1);
  }
})();
