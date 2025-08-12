import cors from 'cors';
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'https://fluxi-epb6.onrender.com',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configure routes
registerRoutes(app);

// Client paths
const projectRoot = path.join(__dirname, "../..");
const clientBuildPath = path.join(projectRoot, "src/client/dist");
const clientSourcePath = path.join(projectRoot, "src/client");
let finalClientPath = clientBuildPath;

// Check if build directory exists
if (fs.existsSync(clientBuildPath)) {
  finalClientPath = clientBuildPath;
} else if (fs.existsSync(clientSourcePath)) {
  finalClientPath = clientSourcePath;
} else {
  finalClientPath = projectRoot;
}

// Verify index.html exists
const indexPath = path.join(finalClientPath, "index.html");
if (!fs.existsSync(indexPath)) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(finalClientPath)) {
    fs.mkdirSync(finalClientPath, { recursive: true });
  }
  
  // Create a temporary index.html
  fs.writeFileSync(indexPath, `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fluxi App</title>
      <style>body {font-family: sans-serif; padding: 2rem;}</style>
    </head>
    <body>
      <h1>Fluxi App Placeholder</h1>
      <p>Server is running but client files not found.</p>
      <p>Path: ${finalClientPath}</p>
    </body>
    </html>
  `);
}

// Serve static files
app.use(express.static(finalClientPath));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(indexPath);
});

// Start server
const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${port}`);
});
