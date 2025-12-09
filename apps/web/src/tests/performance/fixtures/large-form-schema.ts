/**
 * Large Form Schema for Performance Testing (Story 6.11 - Task 6.11.1)
 *
 * Creates a realistic large assessment form with 50+ fields for performance testing.
 * Tests form rendering, conditional logic, and interaction performance.
 */

export const largeFormSchema = {
  fields: [
    // Section 1: Basic Information (10 fields)
    {
      name: "barangay_name",
      label: "Barangay Name",
      type: "text",
      required: true,
    },
    {
      name: "population",
      label: "Total Population",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "land_area",
      label: "Land Area (hectares)",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "income_classification",
      label: "Income Classification",
      type: "select",
      required: true,
      options: [
        { value: "1st", label: "1st Class" },
        { value: "2nd", label: "2nd Class" },
        { value: "3rd", label: "3rd Class" },
        { value: "4th", label: "4th Class" },
        { value: "5th", label: "5th Class" },
        { value: "6th", label: "6th Class" },
      ],
    },
    {
      name: "urbanization",
      label: "Urbanization Level",
      type: "radio",
      required: true,
      options: [
        { value: "urban", label: "Urban" },
        { value: "rural", label: "Rural" },
      ],
    },
    {
      name: "coastal",
      label: "Is Coastal Barangay?",
      type: "checkbox",
      required: false,
    },
    {
      name: "indigenous_population",
      label: "Indigenous Population Count",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "disaster_prone",
      label: "Disaster Prone Areas",
      type: "checkbox",
      required: false,
    },
    {
      name: "establishment_date",
      label: "Date of Establishment",
      type: "date",
      required: false,
    },
    {
      name: "brief_history",
      label: "Brief History",
      type: "textarea",
      required: false,
      rows: 5,
    },

    // Section 2: Governance Structures (15 fields with conditionals)
    {
      name: "has_sangguniang_barangay",
      label: "Has Active Sangguniang Barangay?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "sb_members_count",
      label: "Number of SB Members",
      type: "number",
      required: true,
      min: 0,
      conditions: [{ field: "has_sangguniang_barangay", operator: "==", value: "yes" }],
    },
    {
      name: "sb_meetings_per_year",
      label: "SB Meetings Per Year",
      type: "number",
      required: true,
      min: 0,
      conditions: [{ field: "has_sangguniang_barangay", operator: "==", value: "yes" }],
    },
    {
      name: "sb_attendance_rate",
      label: "Average SB Attendance Rate (%)",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      conditions: [{ field: "has_sangguniang_barangay", operator: "==", value: "yes" }],
    },
    {
      name: "has_blgf",
      label: "Has Barangay Local Government Fund?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "blgf_budget",
      label: "BLGF Annual Budget (PHP)",
      type: "number",
      required: true,
      min: 0,
      conditions: [{ field: "has_blgf", operator: "==", value: "yes" }],
    },
    {
      name: "budget_utilization_rate",
      label: "Budget Utilization Rate (%)",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      conditions: [{ field: "has_blgf", operator: "==", value: "yes" }],
    },
    {
      name: "has_development_plan",
      label: "Has Barangay Development Plan?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "development_plan_year",
      label: "Development Plan Year",
      type: "number",
      required: true,
      min: 2020,
      max: 2030,
      conditions: [{ field: "has_development_plan", operator: "==", value: "yes" }],
    },
    {
      name: "development_plan_updated",
      label: "Last Updated",
      type: "date",
      required: true,
      conditions: [{ field: "has_development_plan", operator: "==", value: "yes" }],
    },
    {
      name: "has_transparency_board",
      label: "Has Transparency Board?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "transparency_board_location",
      label: "Transparency Board Location",
      type: "text",
      required: true,
      conditions: [{ field: "has_transparency_board", operator: "==", value: "yes" }],
    },
    {
      name: "transparency_board_updated",
      label: "Transparency Board Last Updated",
      type: "date",
      required: true,
      conditions: [{ field: "has_transparency_board", operator: "==", value: "yes" }],
    },
    {
      name: "has_grievance_mechanism",
      label: "Has Grievance Mechanism?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "grievances_handled_count",
      label: "Grievances Handled This Year",
      type: "number",
      required: true,
      min: 0,
      conditions: [{ field: "has_grievance_mechanism", operator: "==", value: "yes" }],
    },

    // Section 3: Social Services (15 fields)
    {
      name: "health_services_available",
      label: "Health Services Available",
      type: "checkbox-group",
      required: true,
      options: [
        { value: "health_center", label: "Barangay Health Center" },
        { value: "nutrition_program", label: "Nutrition Program" },
        { value: "immunization", label: "Immunization Program" },
        { value: "maternal_care", label: "Maternal Care" },
        { value: "family_planning", label: "Family Planning" },
      ],
    },
    {
      name: "health_center_equipped",
      label: "Health Center Adequately Equipped?",
      type: "radio",
      required: false,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "health_workers_count",
      label: "Number of Barangay Health Workers",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "education_support_programs",
      label: "Education Support Programs",
      type: "checkbox-group",
      required: false,
      options: [
        { value: "scholarship", label: "Scholarship Program" },
        { value: "school_supplies", label: "School Supplies Assistance" },
        { value: "feeding", label: "School Feeding Program" },
        { value: "day_care", label: "Day Care Center" },
      ],
    },
    {
      name: "senior_citizen_programs",
      label: "Senior Citizen Programs",
      type: "checkbox-group",
      required: false,
      options: [
        { value: "pension", label: "Pension Assistance" },
        { value: "health_card", label: "Health Card" },
        { value: "social_activities", label: "Social Activities" },
      ],
    },
    {
      name: "pwd_programs",
      label: "PWD Programs",
      type: "checkbox-group",
      required: false,
      options: [
        { value: "assistance", label: "Financial Assistance" },
        { value: "accessibility", label: "Accessibility Facilities" },
        { value: "livelihood", label: "Livelihood Programs" },
      ],
    },
    {
      name: "sports_facilities",
      label: "Sports and Recreation Facilities",
      type: "checkbox-group",
      required: false,
      options: [
        { value: "basketball", label: "Basketball Court" },
        { value: "playground", label: "Playground" },
        { value: "covered_court", label: "Covered Court" },
        { value: "fitness", label: "Fitness Equipment" },
      ],
    },
    {
      name: "cultural_programs",
      label: "Cultural Programs Conducted",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "youth_development_programs",
      label: "Youth Development Programs",
      type: "checkbox-group",
      required: false,
      options: [
        { value: "sk", label: "SK Programs" },
        { value: "skills_training", label: "Skills Training" },
        { value: "sports", label: "Sports Programs" },
        { value: "arts", label: "Arts and Culture" },
      ],
    },
    {
      name: "livelihood_programs",
      label: "Livelihood Programs Available",
      type: "checkbox-group",
      required: false,
      options: [
        { value: "training", label: "Livelihood Training" },
        { value: "capital", label: "Capital Assistance" },
        { value: "cooperative", label: "Cooperative Formation" },
        { value: "market", label: "Market Linkage" },
      ],
    },
    {
      name: "livelihood_beneficiaries",
      label: "Livelihood Program Beneficiaries",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "housing_projects",
      label: "Housing Projects",
      type: "checkbox-group",
      required: false,
      options: [
        { value: "socialized", label: "Socialized Housing" },
        { value: "relocation", label: "Relocation Sites" },
        { value: "improvement", label: "Housing Improvement" },
      ],
    },
    {
      name: "housing_beneficiaries",
      label: "Housing Beneficiaries",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "social_welfare_services",
      label: "Social Welfare Services",
      type: "textarea",
      required: false,
      rows: 3,
    },
    {
      name: "social_services_budget",
      label: "Social Services Budget (PHP)",
      type: "number",
      required: false,
      min: 0,
    },

    // Section 4: Peace and Order (12 fields)
    {
      name: "has_bpoc",
      label: "Has Barangay Peace and Order Committee?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "bpoc_meetings_count",
      label: "BPOC Meetings This Year",
      type: "number",
      required: true,
      min: 0,
      conditions: [{ field: "has_bpoc", operator: "==", value: "yes" }],
    },
    {
      name: "has_tanod",
      label: "Has Barangay Tanod?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "tanod_count",
      label: "Number of Barangay Tanod",
      type: "number",
      required: true,
      min: 0,
      conditions: [{ field: "has_tanod", operator: "==", value: "yes" }],
    },
    {
      name: "crime_incidents",
      label: "Crime Incidents This Year",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "crime_resolution_rate",
      label: "Crime Resolution Rate (%)",
      type: "number",
      required: false,
      min: 0,
      max: 100,
    },
    {
      name: "has_cctv",
      label: "Has CCTV Surveillance?",
      type: "radio",
      required: false,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "cctv_cameras_count",
      label: "Number of CCTV Cameras",
      type: "number",
      required: false,
      min: 0,
      conditions: [{ field: "has_cctv", operator: "==", value: "yes" }],
    },
    {
      name: "street_lighting_coverage",
      label: "Street Lighting Coverage (%)",
      type: "number",
      required: false,
      min: 0,
      max: 100,
    },
    {
      name: "drug_clearing_status",
      label: "Drug Clearing Status",
      type: "select",
      required: false,
      options: [
        { value: "cleared", label: "Drug Cleared" },
        { value: "clearing", label: "Drug Clearing" },
        { value: "affected", label: "Drug Affected" },
      ],
    },
    {
      name: "violence_against_women_cases",
      label: "VAW Cases This Year",
      type: "number",
      required: false,
      min: 0,
    },
    {
      name: "vawc_desk_operational",
      label: "VAWC Desk Operational?",
      type: "radio",
      required: false,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
  ],
};

/**
 * Performance test scenarios
 */
export const performanceScenarios = {
  minimal: {
    // Only required fields with minimal data
    fieldCount: 15,
    conditionalDepth: 0,
  },
  typical: {
    // Average assessment with moderate data
    fieldCount: 35,
    conditionalDepth: 2,
  },
  maximum: {
    // All fields filled with deep conditionals
    fieldCount: 67,
    conditionalDepth: 3,
  },
};
