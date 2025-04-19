import { useQuery } from "@tanstack/react-query";
import {
  // getWorkflowStructure, // No longer call directly
  type WorkflowStructure,
} from "@/lib/queries/workflow";

export const WORKFLOW_QUERY_KEY = ["workflow", "structure"];

// Define the fetcher function
const fetchWorkflowStructure = async (): Promise<WorkflowStructure> => {
  const response = await fetch("/api/workflow");
  if (!response.ok) {
    // Attempt to parse error message from response body
    const errorBody = await response.json().catch(() => ({})); // Gracefully handle non-JSON errors
    throw new Error(
      errorBody.message || `HTTP error! status: ${response.status}`
    );
  }
  return response.json();
};

export function useWorkflow() {
  return useQuery<WorkflowStructure, Error>({
    queryKey: WORKFLOW_QUERY_KEY,
    queryFn: fetchWorkflowStructure, // Use the new fetcher function
    // Add any options like staleTime, gcTime if needed
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
