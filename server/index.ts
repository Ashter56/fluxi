import cors from 'cors';
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes.ts';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// ========== UPDATED CORS CONFIGURATION ========== //
const allowedOrigins = [
  'https://fluxi-epb6.onrender.com',
  'http://localhost:3000' // For local development
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.onrender.com') || // Allow all Render subdomains
        origin.includes('localhost')) {     // Allow localhost variants
      return callback(null, true);
    }
    
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Cookie',
    'Set-Cookie'
  ],
  exposedHeaders: ['Set-Cookie', 'Cookie'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Add headers to every response
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  next();
});
// ========== END OF CORS UPDATE ========== //

// Middleware
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

// Start server directly without database test
const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${port}`);
});
