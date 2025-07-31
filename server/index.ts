import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";

// Calculate __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Serve static files from client/dist
    const clientBuildPath = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientBuildPath));
    
    // Handle SPA routing with VALID pattern
    app.get("/*", (req, res) => {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });

    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`Server started on port ${port}`);
      log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("🚨 Critical error during server setup:", error);
    process.exit(1);
  }
})();
