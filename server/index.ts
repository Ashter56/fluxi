import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs"; // Added fs module

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add build info route
  app.get('/build-info', (req, res) => {
    const buildPath = path.join(process.cwd(), 'client', 'dist');
    
    try {
      const files = fs.readdirSync(buildPath);
      res.json({
        exists: true,
        files: files.filter(f => f !== 'assets'),
        assetsCount: files.includes('assets') ? fs.readdirSync(path.join(buildPath, 'assets')).length : 0
      });
    } catch (error) {
      res.json({
        exists: false,
        error: error.message
      });
    }
  });

  // Development: Use Vite
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } 
  // Production: Serve static files
  else {
    const clientBuildPath = path.join(process.cwd(), "client", "dist");
    app.use(express.static(clientBuildPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
