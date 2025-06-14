
import { Youth } from "@/types/app-types";

export const mockYouthData: Omit<Youth, 'id'>[] = [
  {
    firstName: "Michael",
    lastName: "Johnson",
    age: 16,
    dob: new Date("2008-03-15"),
    admissionDate: new Date("2024-01-15"),
    level: 2,
    pointTotal: 145,
    referralSource: "County Social Services",
    referralReason: "Family conflict and truancy issues",
    legalStatus: "Court ordered placement",
    educationInfo: "Currently in 10th grade, struggles with math",
    medicalInfo: "No known allergies, regular checkups",
    mentalHealthInfo: "Diagnosed with ADHD, taking medication",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15")
  },
  {
    firstName: "David",
    lastName: "Williams",
    age: 15,
    dob: new Date("2009-07-22"),
    admissionDate: new Date("2024-02-01"),
    level: 1,
    pointTotal: 89,
    referralSource: "Department of Children Services",
    referralReason: "Behavioral issues at home and school",
    legalStatus: "Voluntary placement",
    educationInfo: "9th grade, good in English and history",
    medicalInfo: "Asthma, uses inhaler as needed",
    mentalHealthInfo: "Anxiety disorder, seeing counselor weekly",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01")
  },
  {
    firstName: "James",
    lastName: "Brown",
    age: 17,
    dob: new Date("2007-11-08"),
    admissionDate: new Date("2024-01-10"),
    level: 3,
    pointTotal: 234,
    referralSource: "Juvenile Court",
    referralReason: "Probation violation and substance abuse",
    legalStatus: "Court ordered residential treatment",
    educationInfo: "11th grade, working toward GED",
    medicalInfo: "Previous sports injury, left knee",
    mentalHealthInfo: "Substance abuse counseling, group therapy",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10")
  },
  {
    firstName: "Christopher",
    lastName: "Davis",
    age: 14,
    dob: new Date("2010-05-30"),
    admissionDate: new Date("2024-03-01"),
    level: 1,
    pointTotal: 56,
    referralSource: "School District",
    referralReason: "Chronic absenteeism and behavioral problems",
    legalStatus: "Educational placement",
    educationInfo: "8th grade, strong in science",
    medicalInfo: "Type 1 diabetes, insulin dependent",
    mentalHealthInfo: "Depression, individual therapy sessions",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01")
  }
];
