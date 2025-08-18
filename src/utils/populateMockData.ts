import { mockYouthData } from "./mockData";
import { toast } from "sonner";
import { fetchAllYouths, saveYouth } from "./local-storage-utils";

export const populateMockData = () => {
  try {
    // First, check if we already have youth data
    const existingYouths = fetchAllYouths();

    if (existingYouths && existingYouths.length > 0) {
      toast.error("Mock data already exists. Clear the local storage first if you want to reload mock data.");
      return false;
    }

    // Save each youth to local storage
    mockYouthData.forEach(youth => {
      saveYouth(youth);
    });

    toast.success(`Successfully added ${mockYouthData.length} mock youth profiles!`);
    return true;
  } catch (error) {
    console.error("Error populating mock data:", error);
    toast.error("Failed to populate mock data");
    return false;
  }
};