import { z } from "zod";

export const createInsertSchema = (table: any) => {
  const schema: Record<string, any> = {};
  
  // Process all columns in the table
  for (const column of Object.values(table)) {
    // Ensure we're looking at a valid column object
    if (column && typeof column === 'object' && 'name' in column) {
      // Create a Zod validator for this column
      schema[column.name] = z.any();
    }
  }
  
  return z.object(schema);
};

// Optional: Add this if you need it
export const createSelectSchema = (table: any) => {
  return createInsertSchema(table);
};
