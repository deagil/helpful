// src/lib/mocks/mockApi.ts

// Import mock JSON data
import zapsData from "./zaps.json";
import actionsData from "./actions.json";

// Mock Fetch Function for Zaps
export async function fetchZaps() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(zapsData.zaps), 200); // Simulate network delay
  });
}

// Mock Fetch Function for Actions of a Specific Zap
export async function fetchActions(zapId: string) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(actionsData[zapId] || []), 200); // Simulate network delay
  });
}