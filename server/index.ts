import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Corrected paths based on Render's actual structure
const projectRoot = path.join(__dirname, "../..");
const clientBuildPath = path.join(projectRoot, "src/client/dist");
const clientSourcePath = path.join(projectRoot, "src/client");

// Determine which path to use
let finalClientPath = clientBuildPath;

// Log environment variables
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("RENDER:", process.env.RENDER);
console.log("Project root:", projectRoot);

// Check if build directory exists
console.log("Checking build directory:", clientBuildPath);
if (fs.existsSync(clientBuildPath)) {
  console.log("✅ Build directory exists");
  finalClientPath = clientBuildPath;
} 
// Fallback to source directory
else if (fs.existsSync(clientSourcePath)) {
  console.warn("⚠️ Build directory not found. Using client source directory");
  finalClientPath = clientSourcePath;
} 
// Last resort: use process root
else {
  console.error("❌ Client directory not found! Using project root as fallback");
  finalClientPath = projectRoot;
}

console.log(`Using client path: ${finalClientPath}`);

// Verify index.html exists
const indexPath = path.join(finalClientPath, "index.html");
console.log("Checking index.html at:", indexPath);

if (fs.existsSync(indexPath)) {
  console.log("✅ index.html found");
} else {
  console.error("❌ index.html not found! Creating temporary file...");
  
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
  console.warn("⚠️ Created temporary index.html");
}

// Serve static files
app.use(express.static(finalClientPath));

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// Handle SPA routing
app.get("*", (req, res) => {
  console.log(`Serving index.html for: ${req.path}`);
  res.sendFile(indexPath);
});

// Start server
const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${port}`);
});
