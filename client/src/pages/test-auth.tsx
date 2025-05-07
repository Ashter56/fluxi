import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { disableHMR } from "../lib/disable-hmr";

// Disable HMR for this test page
if (typeof window !== 'undefined') {
  disableHMR();
}

export default function TestAuth() {
  const [username, setUsername] = useState("testuser");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    
    try {
      console.log("Attempting login with:", { username, password });
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      const data = await response.text();
      console.log("Login response:", response.status, data);
      
      if (response.ok) {
        setResult("Login successful: " + data);
      } else {
        setError('Login failed: ' + data);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Network error: ' + String(err));
    } finally {
      setLoading(false);
    }
  };
  
  const checkUser = async () => {
    try {
      const response = await fetch('/api/user', {
        credentials: 'include'
      });
      
      const data = await response.text();
      console.log("User check response:", response.status, data);
      
      if (response.ok) {
        setResult("Current user: " + data);
      } else {
        setResult("Not logged in: " + data);
      }
    } catch (err) {
      console.error("User check error:", err);
      setError('Network error: ' + String(err));
    }
  };
  
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.text();
      console.log("Logout response:", response.status, data);
      
      if (response.ok) {
        setResult("Logout successful");
      } else {
        setError('Logout failed: ' + data);
      }
    } catch (err) {
      console.error("Logout error:", err);
      setError('Network error: ' + String(err));
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mb-4">
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username">Username</label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
              </Button>
              <Button type="button" variant="outline" onClick={checkUser}>
                Check User
              </Button>
              <Button type="button" variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          {error && (
            <div className="w-full bg-destructive/15 text-destructive p-3 rounded-md text-sm mb-2">
              {error}
            </div>
          )}
          {result && (
            <div className="w-full bg-primary/15 text-primary p-3 rounded-md text-sm">
              {result}
            </div>
          )}
        </CardFooter>
      </Card>
      
      <p className="text-sm text-muted-foreground mt-4">
        This is a test page for authentication without routing to avoid WebSocket issues.
      </p>
    </div>
  );
}