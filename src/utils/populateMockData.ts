
import { supabase } from "@/integrations/supabase/client";
import { mockYouthData } from "./mockData";
import { toast } from "sonner";

export const populateMockData = async () => {
  try {
    // First, check if we already have youth data
    const { data: existingYouths, error: checkError } = await supabase
      .from('youths')
      .select('id')
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existingYouths && existingYouths.length > 0) {
      toast.error("Mock data already exists. Clear the database first if you want to reload mock data.");
      return false;
    }

    // Convert mock data to database format
    const dbData = mockYouthData.map(youth => ({
      firstname: youth.firstName,
      lastname: youth.lastName,
      dob: youth.dob?.toISOString() || null,
      age: youth.age,
      admissiondate: youth.admissionDate?.toISOString() || null,
      level: youth.level,
      pointtotal: youth.pointTotal,
      referralsource: youth.referralSource || '',
      referralreason: youth.referralReason || '',
      legalstatus: youth.legalStatus || '',
      educationinfo: youth.educationInfo || '',
      medicalinfo: youth.medicalInfo || '',
      mentalhealthinfo: youth.mentalHealthInfo || '',
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('youths')
      .insert(dbData);

    if (error) {
      throw error;
    }

    toast.success(`Successfully added ${mockYouthData.length} mock youth profiles!`);
    return true;
  } catch (error) {
    console.error("Error populating mock data:", error);
    toast.error("Failed to populate mock data");
    return false;
  }
};
