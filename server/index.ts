import cors from 'cors';
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
const port = process.env.PORT || 5000;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Middleware to parse JSON bodies
app.use(express.json());

// Corrected paths based on Render's actual structure
const projectRoot = path.join(__dirname, "../..");
const clientBuildPath = path.join(projectRoot, "src/client/dist");
const clientSourcePath = path.join(projectRoot, "src/client");

// Determine which path to use
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

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// Registration endpoint
app.post("/api/register", (req, res) => {
  console.log("Registration attempt:", req.body);
  res.json({ 
    success: true, 
    message: "Registration successful (placeholder)" 
  });
});

// Minimal static file serving
app.use((req, res, next) => {
  // Serve static files manually
  const filePath = path.join(finalClientPath, req.path);
  
  if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
    res.sendFile(filePath);
  } else {
    // Fallback to index.html for SPA routing
    res.sendFile(indexPath);
  }
});

// Start server
const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${port}`);
});
