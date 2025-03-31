import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    console.error(`Response not OK: ${res.status} ${res.statusText}`);
    // Try to parse the response as JSON first
    let errorText;
    try {
      const clonedRes = res.clone();
      console.log("Attempting to parse error response as JSON");
      const errorJson = await clonedRes.json();
      console.log("Error JSON:", errorJson);
      errorText = errorJson.error || errorJson.message || res.statusText;
    } catch (e) {
      console.error("Error parsing JSON response:", e);
      // If JSON parsing fails, use text instead
      const responseText = await res.text();
      console.log("Error response text:", responseText);
      errorText = responseText || res.statusText;
    }
    console.error("Final error text:", errorText);
    throw new Error(errorText);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`API Response: ${res.status} ${res.statusText}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Error: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle array-based query keys to support hierarchical API paths
    let url: string;
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      // If the first segment is '/api/cohorts', make sure we use plural form
      let firstSegment = queryKey[0] as string;
      
      // Fix common singular/plural inconsistencies
      if (firstSegment === '/api/cohort') {
        firstSegment = '/api/cohorts';
      }
      
      // Convert to '/api/cohorts/{cohortId}/posts'
      url = queryKey.reduce((path, segment, index) => {
        if (index === 0) return firstSegment;
        return `${path}/${segment}`;
      }, '');
    } else {
      // Simple string path
      url = queryKey[0] as string;
      
      // Fix common singular/plural inconsistencies for simple paths
      if (url.startsWith('/api/cohort/')) {
        url = url.replace('/api/cohort/', '/api/cohorts/');
      }
    }
    console.log(`Fetching from: ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
