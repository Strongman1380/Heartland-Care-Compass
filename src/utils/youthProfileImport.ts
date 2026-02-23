import type { YouthFormData, TreatmentFocus, CommunityResources } from "@/hooks/useYouthForm";

type AnyRecord = Record<string, any>;

const isBlank = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const firstDefined = (source: AnyRecord, keys: string[]): any => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
};

const normalizeString = (value: any): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const v = value.trim();
    return v.length > 0 ? v : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
};

const normalizeDate = (value: any): string | undefined => {
  const text = normalizeString(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
};

const normalizeBoolean = (value: any): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : undefined;
  const text = normalizeString(value)?.toLowerCase();
  if (!text) return undefined;
  if (["yes", "y", "true", "1"].includes(text)) return true;
  if (["no", "n", "false", "0"].includes(text)) return false;
  return undefined;
};

const normalizeStringArray = (value: any): string[] | undefined => {
  if (Array.isArray(value)) {
    const items = value.map(normalizeString).filter(Boolean) as string[];
    return items.length > 0 ? items : undefined;
  }
  const text = normalizeString(value);
  if (!text) return undefined;
  const items = text
    .split(/[\n,;|]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

const extractNested = (value: any, key: string): string | undefined => {
  if (!value || typeof value !== "object") return undefined;
  return normalizeString(value[key]);
};

const splitPeople = (value: any): string[] => {
  const text = normalizeString(value);
  if (!text) return [];
  return text
    .split(/\s*(?:&| and |\/|;|\|)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
};

export function mapImportedProfileToFormPatch(parsedData: AnyRecord): Partial<YouthFormData> {
  const patch: Partial<YouthFormData> = {};

  const legalGuardian = firstDefined(parsedData, ["legalGuardian", "guardian"]);
  const probationOfficer = firstDefined(parsedData, ["probationOfficer", "probation"]);
  const mother = parsedData.mother;
  const father = parsedData.father;
  const nextOfKin = firstDefined(parsedData, ["nextOfKin", "nok"]);
  const caseworker = parsedData.caseworker;
  const guardianAdLitem = firstDefined(parsedData, ["guardianAdLitem", "gal"]);

  // Handle address - flatten object to string if needed
  const addressRaw = parsedData.address;
  let addressString: string | undefined;
  if (typeof addressRaw === "string") {
    addressString = addressRaw;
  } else if (addressRaw && typeof addressRaw === "object") {
    const parts = [addressRaw.street, addressRaw.city, [addressRaw.state, addressRaw.zip].filter(Boolean).join(" ")].filter(Boolean);
    addressString = parts.join(", ");
  }

  // Handle physicalDescription - extract individual fields from nested object
  const physDesc = parsedData.physicalDescription;

  const stringMappings: Array<{ formKey: keyof YouthFormData; values: any[] }> = [
    { formKey: "firstName", values: [firstDefined(parsedData, ["firstName", "first_name", "givenName"])] },
    { formKey: "lastName", values: [firstDefined(parsedData, ["lastName", "last_name", "surname", "familyName"])] },
    { formKey: "sex", values: [firstDefined(parsedData, ["sex", "gender"])] },
    { formKey: "race", values: [parsedData.race] },
    { formKey: "religion", values: [parsedData.religion] },
    { formKey: "placeOfBirth", values: [firstDefined(parsedData, ["placeOfBirth", "birthPlace"])] },
    { formKey: "socialSecurityNumber", values: [firstDefined(parsedData, ["socialSecurityNumber", "ssn"])] },
    { formKey: "address", values: [addressString] },
    { formKey: "height", values: [parsedData.height, extractNested(physDesc, "height")] },
    { formKey: "weight", values: [parsedData.weight, extractNested(physDesc, "weight")] },
    { formKey: "hairColor", values: [parsedData.hairColor, extractNested(physDesc, "hairColor")] },
    { formKey: "eyeColor", values: [parsedData.eyeColor, extractNested(physDesc, "eyeColor")] },
    { formKey: "tattoosScars", values: [firstDefined(parsedData, ["tattoosScars", "tattoos", "scars"]), extractNested(physDesc, "tattoosScars")] },
    { formKey: "legalGuardian", values: [typeof legalGuardian === "string" ? legalGuardian : extractNested(legalGuardian, "name")] },
    { formKey: "guardianRelationship", values: [parsedData.guardianRelationship, extractNested(legalGuardian, "relationship")] },
    { formKey: "guardianContact", values: [parsedData.guardianContact, extractNested(legalGuardian, "contact")] },
    { formKey: "guardianPhone", values: [parsedData.guardianPhone, extractNested(legalGuardian, "phone")] },
    { formKey: "guardianEmail", values: [parsedData.guardianEmail, extractNested(legalGuardian, "email")] },
    { formKey: "probationOfficer", values: [typeof probationOfficer === "string" ? probationOfficer : extractNested(probationOfficer, "name")] },
    { formKey: "probationContact", values: [parsedData.probationContact, extractNested(probationOfficer, "contact"), extractNested(probationOfficer, "email"), extractNested(probationOfficer, "phone")] },
    { formKey: "probationPhone", values: [parsedData.probationPhone, extractNested(probationOfficer, "phone")] },
    { formKey: "motherName", values: [parsedData.motherName, extractNested(mother, "name")] },
    { formKey: "motherPhone", values: [parsedData.motherPhone, extractNested(mother, "phone")] },
    { formKey: "fatherName", values: [parsedData.fatherName, extractNested(father, "name")] },
    { formKey: "fatherPhone", values: [parsedData.fatherPhone, extractNested(father, "phone")] },
    { formKey: "nextOfKinName", values: [parsedData.nextOfKinName, extractNested(nextOfKin, "name")] },
    { formKey: "nextOfKinRelationship", values: [parsedData.nextOfKinRelationship, extractNested(nextOfKin, "relationship")] },
    { formKey: "nextOfKinPhone", values: [parsedData.nextOfKinPhone, extractNested(nextOfKin, "phone")] },
    { formKey: "placingAgencyCounty", values: [parsedData.placingAgencyCounty] },
    { formKey: "caseworkerName", values: [parsedData.caseworkerName, extractNested(caseworker, "name")] },
    { formKey: "caseworkerPhone", values: [parsedData.caseworkerPhone, extractNested(caseworker, "phone")] },
    { formKey: "guardianAdLitemName", values: [parsedData.guardianAdLitemName, extractNested(guardianAdLitem, "name")] },
    { formKey: "attorney", values: [parsedData.attorney] },
    { formKey: "judge", values: [parsedData.judge] },
    { formKey: "estimatedStay", values: [parsedData.estimatedStay] },
    { formKey: "referralSource", values: [parsedData.referralSource] },
    { formKey: "referralReason", values: [parsedData.referralReason] },
    { formKey: "numPriorPlacements", values: [parsedData.numPriorPlacements] },
    { formKey: "lengthRecentPlacement", values: [parsedData.lengthRecentPlacement] },
    { formKey: "admissionTime", values: [parsedData.admissionTime] },
    { formKey: "rcsIn", values: [parsedData.rcsIn] },
    { formKey: "rcsOut", values: [parsedData.rcsOut] },
    { formKey: "lastSchoolAttended", values: [firstDefined(parsedData, ["lastSchoolAttended", "previousSchool"])] },
    { formKey: "currentSchool", values: [parsedData.currentSchool] },
    { formKey: "grade", values: [firstDefined(parsedData, ["grade", "currentGrade"])] },
    { formKey: "academicStrengths", values: [parsedData.academicStrengths] },
    { formKey: "academicChallenges", values: [parsedData.academicChallenges] },
    { formKey: "educationGoals", values: [parsedData.educationGoals] },
    { formKey: "schoolContact", values: [parsedData.schoolContact] },
    { formKey: "schoolPhone", values: [parsedData.schoolPhone] },
    { formKey: "physician", values: [parsedData.physician] },
    { formKey: "physicianPhone", values: [parsedData.physicianPhone] },
    { formKey: "insuranceProvider", values: [parsedData.insuranceProvider] },
    { formKey: "policyNumber", values: [parsedData.policyNumber] },
    { formKey: "allergies", values: [parsedData.allergies] },
    { formKey: "currentMedications", values: [parsedData.currentMedications] },
    { formKey: "significantHealthConditions", values: [parsedData.significantHealthConditions] },
    { formKey: "medicalConditions", values: [firstDefined(parsedData, ["medicalConditions", "significantHealthConditions"])] },
    { formKey: "medicalRestrictions", values: [parsedData.medicalRestrictions] },
    { formKey: "currentDiagnoses", values: [firstDefined(parsedData, ["currentDiagnoses", "diagnoses"])] },
    { formKey: "diagnoses", values: [firstDefined(parsedData, ["diagnoses", "currentDiagnoses"])] },
    { formKey: "previousTreatment", values: [parsedData.previousTreatment] },
    { formKey: "therapistName", values: [parsedData.therapistName] },
    { formKey: "therapistContact", values: [parsedData.therapistContact] },
    { formKey: "sessionFrequency", values: [parsedData.sessionFrequency] },
    { formKey: "sessionTime", values: [parsedData.sessionTime] },
    { formKey: "lastIncidentDate", values: [parsedData.lastIncidentDate] },
    { formKey: "hyrnaRiskLevel", values: [parsedData.hyrnaRiskLevel] },
    { formKey: "hyrnaScore", values: [parsedData.hyrnaScore] },
    { formKey: "hyrnaAssessmentDate", values: [parsedData.hyrnaAssessmentDate] },
    // Behavioral / Psychosocial
    { formKey: "getAlongWithOthers", values: [parsedData.getAlongWithOthers] },
    { formKey: "strengthsTalents", values: [firstDefined(parsedData, ["strengthsTalents", "strengths"])] },
    { formKey: "interests", values: [parsedData.interests] },
    { formKey: "dislikesAboutSelf", values: [parsedData.dislikesAboutSelf] },
    { formKey: "angerTriggers", values: [parsedData.angerTriggers] },
    { formKey: "behaviorProblems", values: [parsedData.behaviorProblems] },
    { formKey: "socialStrengths", values: [parsedData.socialStrengths] },
    { formKey: "socialDeficiencies", values: [parsedData.socialDeficiencies] },
    { formKey: "drugTestingDates", values: [parsedData.drugTestingDates] },
    { formKey: "treatmentGoals", values: [parsedData.treatmentGoals] },
    { formKey: "realColorsResult", values: [parsedData.realColorsResult] },
    // Discharge Planning
    { formKey: "dischargeCategory", values: [parsedData.dischargeCategory] },
    { formKey: "dischargeReason", values: [parsedData.dischargeReason] },
    { formKey: "dischargeNotes", values: [parsedData.dischargeNotes] },
    { formKey: "dischargedBy", values: [parsedData.dischargedBy] },
    { formKey: "estimatedLengthOfStayMonths", values: [parsedData.estimatedLengthOfStayMonths] },
  ];

  stringMappings.forEach(({ formKey, values }) => {
    for (const value of values) {
      const normalized = normalizeString(value);
      if (!isBlank(normalized)) {
        patch[formKey] = normalized as any;
        break;
      }
    }
  });

  // Sync diagnoses fields so both always have a value
  if (patch.currentDiagnoses && !patch.diagnoses) patch.diagnoses = patch.currentDiagnoses;
  if (patch.diagnoses && !patch.currentDiagnoses) patch.currentDiagnoses = patch.diagnoses;

  const dob = normalizeDate(parsedData.dob);
  if (dob) patch.dob = dob;

  const admissionDate = normalizeDate(parsedData.admissionDate);
  if (admissionDate) patch.admissionDate = admissionDate;

  const hyrnaAssessmentDate = normalizeDate(parsedData.hyrnaAssessmentDate);
  if (hyrnaAssessmentDate) patch.hyrnaAssessmentDate = hyrnaAssessmentDate;

  const dischargeDate = normalizeDate(parsedData.dischargeDate);
  if (dischargeDate) patch.dischargeDate = dischargeDate;

  const dischargeTime = normalizeString(parsedData.dischargeTime);
  if (dischargeTime) patch.dischargeTime = dischargeTime;

  const age = Number(firstDefined(parsedData, ["age"]));
  if (Number.isFinite(age) && age > 0) patch.age = String(age);

  // Auto-calculate age from DOB if not provided
  if (!patch.age && patch.dob) {
    const birth = new Date(patch.dob);
    const today = new Date();
    let calcAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) calcAge--;
    if (calcAge > 0) patch.age = String(calcAge);
  }

  const levelRaw = firstDefined(parsedData, ["level", "currentLevel"]);
  if (levelRaw !== undefined && levelRaw !== null) {
    const levelText = String(levelRaw).toLowerCase();
    const level = levelText === "orientation" ? 0 : Number(levelRaw);
    if (Number.isFinite(level) && level >= 0 && level <= 10) {
      patch.level = String(level);
      patch.currentLevel = level;
    }
  }

  const pointsInCurrentLevel = Number(parsedData.pointsInCurrentLevel);
  if (Number.isFinite(pointsInCurrentLevel)) patch.pointsInCurrentLevel = pointsInCurrentLevel;

  const dailyPointsForPrivileges = Number(parsedData.dailyPointsForPrivileges);
  if (Number.isFinite(dailyPointsForPrivileges)) patch.dailyPointsForPrivileges = dailyPointsForPrivileges;

  const boolMappings: Array<{ formKey: keyof YouthFormData; value: any }> = [
    { formKey: "hasIEP", value: parsedData.hasIEP },
    { formKey: "hasSafetyPlan", value: parsedData.hasSafetyPlan },
    { formKey: "onSubsystem", value: parsedData.onSubsystem },
    // Risk & Recovery
    { formKey: "tobaccoPast6To12Months", value: parsedData.tobaccoPast6To12Months },
    { formKey: "alcoholPast6To12Months", value: parsedData.alcoholPast6To12Months },
    { formKey: "drugsVapingMarijuanaPast6To12Months", value: parsedData.drugsVapingMarijuanaPast6To12Months },
    { formKey: "gangInvolvement", value: parsedData.gangInvolvement },
    { formKey: "historyPhysicallyHurting", value: parsedData.historyPhysicallyHurting },
    { formKey: "historyVandalism", value: parsedData.historyVandalism },
    { formKey: "familyViolentCrimes", value: parsedData.familyViolentCrimes },
  ];

  boolMappings.forEach(({ formKey, value }) => {
    const normalized = normalizeBoolean(value);
    if (normalized !== undefined) patch[formKey] = normalized as any;
  });

  const placementAuthority = normalizeStringArray(parsedData.placementAuthority);
  if (placementAuthority) patch.placementAuthority = placementAuthority;

  const priorPlacements = normalizeStringArray(parsedData.priorPlacements);
  if (priorPlacements) patch.priorPlacements = priorPlacements;

  // Auto-fill numPriorPlacements from priorPlacements array length
  if (!patch.numPriorPlacements && priorPlacements && priorPlacements.length > 0) {
    patch.numPriorPlacements = String(priorPlacements.length);
  }

  const courtInvolvement = normalizeStringArray(parsedData.courtInvolvement);
  if (courtInvolvement) patch.courtInvolvement = courtInvolvement;

  const traumaHistory = normalizeStringArray(parsedData.traumaHistory);
  if (traumaHistory) patch.traumaHistory = traumaHistory;

  const currentCounseling = normalizeStringArray(parsedData.currentCounseling);
  if (currentCounseling) patch.currentCounseling = currentCounseling;

  const selfHarmHistory = normalizeStringArray(parsedData.selfHarmHistory);
  if (selfHarmHistory) patch.selfHarmHistory = selfHarmHistory;

  // Build professionals array from parsed contact data
  const professionals: Array<{ type: string; name: string; phone?: string | null; email?: string | null }> = [];

  const cwName = normalizeString(patch.caseworkerName) || normalizeString(parsedData.caseworkerName) || extractNested(caseworker, "name");
  const cwPhone = normalizeString(patch.caseworkerPhone) || normalizeString(parsedData.caseworkerPhone) || extractNested(caseworker, "phone");
  const cwEmail = normalizeString(parsedData.caseworkerEmail) || extractNested(caseworker, "email");
  if (cwName && cwName !== "N/A") {
    professionals.push({ type: "caseworker", name: cwName, phone: cwPhone || null, email: cwEmail || null });
  }

  const poName = normalizeString(patch.probationOfficer);
  const poPhone = normalizeString(patch.probationPhone) || extractNested(probationOfficer, "phone");
  const poEmail = normalizeString(parsedData.probationEmail) || extractNested(probationOfficer, "email");
  if (poName && poName !== "N/A") {
    professionals.push({ type: "probationOfficer", name: poName, phone: poPhone || null, email: poEmail || null });
  }

  const attName = normalizeString(patch.attorney);
  if (attName && attName !== "N/A") {
    professionals.push({ type: "attorney", name: attName, phone: null, email: null });
  }

  const judgeName = normalizeString(patch.judge);
  if (judgeName && judgeName !== "N/A") {
    professionals.push({ type: "judge", name: judgeName, phone: null, email: null });
  }

  const galName = normalizeString(patch.guardianAdLitemName) || extractNested(guardianAdLitem, "name");
  const galPhone = normalizeString(parsedData.guardianAdLitemPhone) || extractNested(guardianAdLitem, "phone");
  if (galName && galName !== "N/A" && galName !== "Yes") {
    professionals.push({ type: "guardianAdLitem", name: galName, phone: galPhone || null, email: null });
  }

  if (professionals.length > 0) {
    patch.professionals = professionals as any;
  }

  // Map treatment focus object (16 boolean fields)
  const tfRaw = parsedData.treatmentFocus;
  if (tfRaw && typeof tfRaw === "object") {
    const tfKeys: (keyof TreatmentFocus)[] = [
      "excessiveDependency", "withdrawalIsolation", "parentChildRelationship",
      "peerRelationship", "acceptanceOfAuthority", "lying",
      "poorAcademicAchievement", "poorSelfEsteem", "manipulative",
      "propertyDestruction", "hyperactivity", "anxiety",
      "verbalAggression", "assaultive", "depression", "stealing",
    ];
    const tf: Partial<TreatmentFocus> = {};
    let hasAny = false;
    for (const key of tfKeys) {
      const val = normalizeBoolean(tfRaw[key]);
      if (val !== undefined) {
        tf[key] = val;
        hasAny = true;
      }
    }
    if (hasAny) {
      patch.treatmentFocus = {
        excessiveDependency: false, withdrawalIsolation: false,
        parentChildRelationship: false, peerRelationship: false,
        acceptanceOfAuthority: false, lying: false,
        poorAcademicAchievement: false, poorSelfEsteem: false,
        manipulative: false, propertyDestruction: false,
        hyperactivity: false, anxiety: false,
        verbalAggression: false, assaultive: false,
        depression: false, stealing: false,
        ...tf,
      };
    }
  }

  // Parse treatment focus from treatmentGoals string (fallback)
  if (!patch.treatmentFocus && patch.treatmentGoals) {
    const g = patch.treatmentGoals.toLowerCase();
    const tf: TreatmentFocus = {
      excessiveDependency: g.includes("excessive dependency"),
      withdrawalIsolation: g.includes("withdrawal"),
      parentChildRelationship: g.includes("parent/child") || g.includes("parent-child"),
      peerRelationship: g.includes("peer relationship"),
      acceptanceOfAuthority: g.includes("acceptance of authority"),
      lying: g.includes("lying"),
      poorAcademicAchievement: g.includes("poor academic"),
      poorSelfEsteem: g.includes("poor self"),
      manipulative: g.includes("manipulative"),
      propertyDestruction: g.includes("property destruction"),
      hyperactivity: g.includes("hyperactivity"),
      anxiety: g.includes("anxiety"),
      verbalAggression: g.includes("verbal aggression"),
      assaultive: g.includes("assaultive"),
      depression: g.includes("depression"),
      stealing: g.includes("stealing"),
    };
    if (Object.values(tf).some(Boolean)) {
      patch.treatmentFocus = tf;
    }
  }

  // Map community resources object
  const crRaw = parsedData.communityResources;
  if (crRaw && typeof crRaw === "object") {
    const cr: CommunityResources = {
      dayTreatmentServices: normalizeBoolean(crRaw.dayTreatmentServices) ?? false,
      intensiveInHomeServices: normalizeBoolean(crRaw.intensiveInHomeServices) ?? false,
      daySchoolPlacement: normalizeBoolean(crRaw.daySchoolPlacement) ?? false,
      oneOnOneSchoolCounselor: normalizeBoolean(crRaw.oneOnOneSchoolCounselor) ?? false,
      mentalHealthSupportServices: normalizeBoolean(crRaw.mentalHealthSupportServices) ?? false,
      other: normalizeString(crRaw.other) || "",
    };
    if (Object.values(cr).some(v => v === true || (typeof v === "string" && v.length > 0))) {
      patch.communityResources = cr;
    }
  }

  // Fan out family/contact details so data lands in all relevant form fields.
  const guardianName = normalizeString(patch.legalGuardian);
  const parsedMotherName = normalizeString(parsedData.motherName) || extractNested(mother, "name");
  const parsedFatherName = normalizeString(parsedData.fatherName) || extractNested(father, "name");

  if (!patch.motherName && parsedMotherName) patch.motherName = parsedMotherName;
  if (!patch.fatherName && parsedFatherName) patch.fatherName = parsedFatherName;

  if (guardianName && (!patch.motherName || !patch.fatherName)) {
    const names = splitPeople(guardianName);
    if (!patch.motherName && names[0]) patch.motherName = names[0];
    if (!patch.fatherName && names[1]) patch.fatherName = names[1];
  }

  if (!patch.legalGuardian) {
    const inferredGuardian = [patch.motherName, patch.fatherName].filter(Boolean).join(" & ");
    if (inferredGuardian) patch.legalGuardian = inferredGuardian;
  }

  if (!patch.nextOfKinName) {
    const inferredNok = patch.legalGuardian || patch.motherName || patch.fatherName;
    if (inferredNok) patch.nextOfKinName = inferredNok;
  }

  const parsedMotherPhone = normalizeString(parsedData.motherPhone) || extractNested(mother, "phone");
  const parsedFatherPhone = normalizeString(parsedData.fatherPhone) || extractNested(father, "phone");
  const parsedNokPhone = normalizeString(parsedData.nextOfKinPhone) || extractNested(nextOfKin, "phone");
  if (!patch.motherPhone && parsedMotherPhone) patch.motherPhone = parsedMotherPhone;
  if (!patch.fatherPhone && parsedFatherPhone) patch.fatherPhone = parsedFatherPhone;
  if (!patch.nextOfKinPhone && parsedNokPhone) patch.nextOfKinPhone = parsedNokPhone;

  if (!patch.guardianPhone) {
    patch.guardianPhone = patch.motherPhone || patch.fatherPhone || patch.nextOfKinPhone || patch.guardianContact || "";
  }
  if (!patch.guardianContact && patch.guardianPhone) {
    patch.guardianContact = patch.guardianPhone;
  }
  if (!patch.guardianEmail && patch.guardianContact?.includes("@")) {
    patch.guardianEmail = patch.guardianContact;
  }

  if (patch.guardianPhone) {
    if (!patch.motherPhone && patch.motherName) patch.motherPhone = patch.guardianPhone;
    if (!patch.fatherPhone && patch.fatherName) patch.fatherPhone = patch.guardianPhone;
    if (!patch.nextOfKinPhone && patch.nextOfKinName) patch.nextOfKinPhone = patch.guardianPhone;
  }

  // Fan out probation email to probationContact if no contact set
  if (!patch.probationContact && poEmail) {
    patch.probationContact = poEmail;
  }

  return patch;
}
