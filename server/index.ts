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

// Corrected build path - using Render's project root
const projectRoot = path.join(__dirname, "../..");  // Go up to project root
let clientBuildPath = path.join(projectRoot, "client/dist");  // Fixed path

// Log environment variables
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("RENDER:", process.env.RENDER);
console.log("Project root:", projectRoot);  // Added for debugging

// Verify if build directory exists
console.log("Checking build directory:", clientBuildPath);
if (fs.existsSync(clientBuildPath)) {
  console.log("✅ Build directory exists");
} else {
  console.warn("⚠️ Build directory not found. Using client source directory");
  clientBuildPath = path.join(projectRoot, "client");  // Fixed fallback path
}

console.log(`Using client build path: ${clientBuildPath}`);

// Verify index.html exists
const indexPath = path.join(clientBuildPath, "index.html");
console.log("Checking index.html at:", indexPath);

if (fs.existsSync(indexPath)) {
  console.log("✅ index.html found");
} else {
  console.error("❌ index.html not found! Attempting to create temporary file...");
  
  // Create a temporary index.html for debugging
  try {
    fs.writeFileSync(indexPath, "<h1>Fluxi App Placeholder</h1>");
    console.warn("⚠️ Created temporary index.html");
  } catch (error) {
    console.error("❌ Failed to create index.html:", error);
    console.log("Current directory contents:", fs.readdirSync(clientBuildPath));
  }
}

// Serve static files from the build directory
app.use(express.static(clientBuildPath));

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// Handle SPA routing - must be last
app.get("*", (req, res) => {
  console.log(`Serving index.html for: ${req.path}`);
  res.sendFile(indexPath);
});

// Start server
const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${port}`);
});
