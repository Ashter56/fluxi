import express from "express";
import http from "http";
import path from "path";
import fs from "fs";

const app = express();
const port = process.env.PORT || 5000;

// 1. Add logging to verify client build path
let clientBuildPath = path.join(process.cwd(), "client/dist");

// Fallback to client directory if dist doesn't exist
if (!fs.existsSync(clientBuildPath)) {
  clientBuildPath = path.join(process.cwd(), "client");
}

console.log(`Using client build path: ${clientBuildPath}`);
console.log("Client directory contents:", fs.readdirSync(clientBuildPath));

// 2. Serve static files from client build directory
app.use(express.static(clientBuildPath));

// 3. Keep test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// 4. Start server
const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${port}`);
});
