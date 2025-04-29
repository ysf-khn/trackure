import { useQuery } from "@tanstack/react-query";

export interface WorkflowStageCount {
  id: string;
  name: string;
  item_count: number;
}

const fetchWorkflowOverview = async (): Promise<WorkflowStageCount[]> => {
  const response = await fetch("/api/dashboard/workflow-overview");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error || `HTTP error! status: ${response.status}`
    );
  }
  const data = await response.json();
  return data;
};

export const useWorkflowOverview = () => {
  return useQuery<WorkflowStageCount[], Error>({
    queryKey: ["dashboard", "workflowOverview"],
    queryFn: fetchWorkflowOverview,
  });
};
