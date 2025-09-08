
import { mongoClient } from "./mongoClient";

export const populateMockData = async () => {
  try {
    const result = await mongoClient.populateMockData();
    console.log("Mock data populated successfully:", result.message);
    return true;
  } catch (error) {
    console.error("Error populating mock data:", error);
    throw error;
  }
};
