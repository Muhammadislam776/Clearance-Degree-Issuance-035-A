export const normalizeRole = (role) => {
  const r = String(role ?? "").trim().toLowerCase();
  if (r.includes("department") || r === "dept") return "department";
  if (r === "exam" || r === "examiner") return "examiner";
  if (r === "registrar" || r === "admin") return "admin";
  if (r === "student") return "student";
  return r;
};

export const getDashboardPathForRole = (role) => {
  const r = normalizeRole(role);

  const dashboardMap = {
    student: "/student/dashboard",
    department: "/department/dashboard",
    examiner: "/examiner/dashboard",
    admin: "/admin/dashboard",
  };

  return dashboardMap[r] || "/";
};
