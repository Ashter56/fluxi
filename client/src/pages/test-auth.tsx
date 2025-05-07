import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TestAuth() {
  const [username, setUsername] = useState("testuser");
  const [password, setPassword] = useState("password123");
  const [result, setResult] = useState<{success: boolean, message: string, data?: any} | null>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult({
          success: true,
          message: 'Login successful!',
          data
        });
      } else {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.message || errorText;
        } catch (e) {
          // If parsing fails, use the text as is
        }
        
        setResult({
          success: false,
          message: `Login failed: ${errorText}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testGetUser = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult({
          success: true,
          message: 'Got user data successfully!',
          data
        });
      } else {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.message || errorText;
        } catch (e) {
          // If parsing fails, use the text as is
        }
        
        setResult({
          success: false,
          message: `Getting user failed: ${errorText}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testLogout = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult({
          success: true,
          message: 'Logout successful!',
          data
        });
      } else {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.message || errorText;
        } catch (e) {
          // If parsing fails, use the text as is
        }
        
        setResult({
          success: false,
          message: `Logout failed: ${errorText}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Login</CardTitle>
            <CardDescription>
              Try logging in with the test user credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-4">
            <div className="flex space-x-2 w-full">
              <Button onClick={testLogin} disabled={loading} className="flex-1">
                Test Login
              </Button>
              <Button onClick={testGetUser} disabled={loading} variant="outline" className="flex-1">
                Get Current User
              </Button>
              <Button onClick={testLogout} disabled={loading} variant="destructive" className="flex-1">
                Logout
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>
              The result of your authentication test will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading...</p>}
            
            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
            
            {result?.data && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h3 className="font-medium mb-2">Response Data:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}