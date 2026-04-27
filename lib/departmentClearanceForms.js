const FALLBACK_FORM = {
  id: "general",
  title: "General Department Clearance Details",
  fields: [
    {
      key: "outstandingItems",
      label: "Outstanding Items",
      type: "textarea",
      placeholder: "Mention any pending items, dues, or obligations.",
      required: true,
      rows: 3,
    },
    {
      key: "advisorName",
      label: "Academic Advisor Name",
      type: "text",
      placeholder: "Enter advisor name",
      required: false,
    },
  ],
};

const DEPARTMENT_FORMS = [
  {
    match: ["computer science", "cs", "software engineering", "se", "it", "information technology"],
    id: "cs",
    title: "Computer Science Department Clearance Form",
    fields: [
      {
        key: "fypStatus",
        label: "Final Year Project Status",
        type: "select",
        required: true,
        options: ["Completed", "In Progress", "Not Applicable"],
      },
      {
        key: "labAssetsReturned",
        label: "Lab Assets Returned",
        type: "select",
        required: true,
        options: ["Yes", "No"],
      },
      {
        key: "githubRepoSubmitted",
        label: "Project Repository Submitted",
        type: "select",
        required: true,
        options: ["Yes", "No", "Not Applicable"],
      },
      {
        key: "technicalRemarks",
        label: "Technical Remarks",
        type: "textarea",
        placeholder: "Any technical issues, pending tasks, or supervisor comments.",
        required: false,
        rows: 3,
      },
    ],
  },
  {
    match: ["engineering", "electrical", "mechanical", "civil", "mechatronics"],
    id: "engineering",
    title: "Engineering Department Clearance Form",
    fields: [
      {
        key: "workshopToolsReturned",
        label: "Workshop/Lab Tools Returned",
        type: "select",
        required: true,
        options: ["Yes", "No", "Not Applicable"],
      },
      {
        key: "safetyTrainingCompleted",
        label: "Safety Training Completed",
        type: "select",
        required: true,
        options: ["Yes", "No"],
      },
      {
        key: "projectSupervisorName",
        label: "Project Supervisor Name",
        type: "text",
        placeholder: "Enter supervisor name",
        required: true,
      },
      {
        key: "labDuesDetails",
        label: "Lab Dues/Equipment Notes",
        type: "textarea",
        placeholder: "Mention any outstanding lab dues or equipment obligations.",
        required: false,
        rows: 3,
      },
    ],
  },
  {
    match: ["business", "management", "commerce", "bba", "mba", "finance"],
    id: "business",
    title: "Business Department Clearance Form",
    fields: [
      {
        key: "internshipCompleted",
        label: "Internship Completed",
        type: "select",
        required: true,
        options: ["Yes", "No", "Not Applicable"],
      },
      {
        key: "industryReportSubmitted",
        label: "Industry/Internship Report Submitted",
        type: "select",
        required: true,
        options: ["Yes", "No"],
      },
      {
        key: "financeCaseStudyPending",
        label: "Pending Case Study or Viva",
        type: "select",
        required: true,
        options: ["No", "Yes"],
      },
      {
        key: "businessRemarks",
        label: "Department Remarks",
        type: "textarea",
        placeholder: "Any pending department requirements.",
        required: false,
        rows: 3,
      },
    ],
  },
];

const normalizeDepartmentName = (departmentName = "") => String(departmentName).toLowerCase().trim();

export const getDepartmentClearanceForm = (departmentName) => {
  const normalized = normalizeDepartmentName(departmentName);
  if (!normalized) return FALLBACK_FORM;

  const matched = DEPARTMENT_FORMS.find((form) =>
    form.match.some((keyword) => normalized.includes(keyword))
  );

  return matched || FALLBACK_FORM;
};

export const getDepartmentFormInitialValues = (formDefinition) => {
  const fields = formDefinition?.fields || [];
  return fields.reduce((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});
};

export const formatDepartmentFormForNotes = (formDefinition, values) => {
  const fields = formDefinition?.fields || [];
  if (fields.length === 0) return "";

  const lines = fields.map((field) => {
    const rawValue = values?.[field.key];
    const safeValue = String(rawValue || "N/A").trim() || "N/A";
    return `- ${field.label}: ${safeValue}`;
  });

  return [`Department Form: ${formDefinition?.title || "Department Clearance Form"}`, ...lines].join("\n");
};
