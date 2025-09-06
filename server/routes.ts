app.post("/api/tasks", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    console.log("Creating task with data:", req.body);
    console.log("User ID:", (req.user as any).id);
    
    // Create the task data with user ID first
    const taskData = {
      ...req.body,
      userId: (req.user as any).id,
    };
    
    console.log("Task data with user ID:", taskData);
    
    // Validate the complete task data
    const validatedData = insertTaskSchema.parse(taskData);
    
    if (!taskStatus.safeParse(validatedData.status).success) {
      return res.status(400).json({ message: "Invalid task status" });
    }
    
    const task = await storage.createTask(validatedData);
    console.log("Task created successfully:", task);
    
    try {
      const fullTask = await storage.getTask(task.id);
      console.log("Full task retrieved:", fullTask);
      
      try {
        broadcastMessage(WebSocketEvent.NEW_TASK, fullTask);
        console.log("WebSocket broadcast successful");
      } catch (broadcastError) {
        console.error("WebSocket broadcast error:", broadcastError);
        // Don't fail the request if broadcasting fails
      }
      
      return res.status(201).json(fullTask);
    } catch (getTaskError) {
      console.error("Error retrieving full task:", getTaskError);
      // Still return the basic task if we can't get the full enriched task
      return res.status(201).json(task);
    }
  } catch (error) {
    console.error("Task creation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors });
    }
    res.status(500).json({ message: "Failed to create task" });
  }
});
