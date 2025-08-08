import express from "express";
import http from "http";

const app = express();
const port = process.env.PORT || 5000;

// Basic test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// Start server
const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${port}`);
});
