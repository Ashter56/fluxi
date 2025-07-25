import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// NEW: Add request logging middleware
app.use((req, res, next) => {
  log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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

  // NEW: Simple status endpoint
  app.get("/status", (req, res) => {
    res.send("Server is running");
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
      log(`Serving index.html for path: ${req.path}`);
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server started on port ${port}`);
  });
})();
