import express from "express";
import http from "http";
import path from "path";
import fs from "fs";

const app = express();
const port = process.env.PORT || 5000;

// Client build path configuration
let clientBuildPath = path.join(process.cwd(), "client/dist");

// Log environment variables
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("RENDER:", process.env.RENDER);

// Verify if build directory exists
console.log("Checking build directory:", clientBuildPath);
if (fs.existsSync(clientBuildPath)) {
  console.log("✅ Build directory exists");
} else {
  console.warn("⚠️ Build directory not found. Using client source directory");
  clientBuildPath = path.join(process.cwd(), "client");
}

console.log(`Using client build path: ${clientBuildPath}`);

// Verify index.html exists
const indexPath = path.join(clientBuildPath, "index.html");
console.log("Checking index.html at:", indexPath);
if (fs.existsSync(indexPath)) {
  console.log("✅ index.html found");
} else {
  console.error("❌ index.html not found! Directory contents:");
  console.log(fs.readdirSync(clientBuildPath));
}

// Serve static files
app.use(express.static(clientBuildPath));

// Add request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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
