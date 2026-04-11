import { supabase } from "./supabaseClient";
import { normalizeRole } from "./roleRouting";

export const withTimeout = async (promise, ms, label) => {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.ceil(ms / 1000)}s`));
    }, ms);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const toErrorMessage = (error, fallback = "An unexpected error occurred") => {
  return (
    error?.message ||
    error?.error_description ||
    error?.details ||
    (typeof error === "string" ? error : "") ||
    fallback
  );
};

// Validations
export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validatePassword = (password) => password.length >= 8;
export const validateName = (name) => name.trim().length >= 2;

// Check if email exists in our custom users table
export const checkEmailExists = async (email) => {
  if (!email || !validateEmail(email)) return { exists: false, checked: false };
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle(),
      8000,
      "Email Check"
    );
    return { exists: !!data, checked: true };
  } catch {
    return { exists: false, checked: false };
  }
};

// Atomic Resilient Signup - Sync is handled by DB triggers for 100% reliability
export const signupUser = async (email, password, name, role, additionalData = {}) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = normalizeRole(role);

    // One single call. The DB trigger handles 'users' and 'students' table creation.
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            role: normalizedRole,
            roll_number: additionalData.roll_number || null,
            department_id: additionalData.department_id || null,
          },
        },
      }),
      30000,
      "Auth Signup"
    );

    if (error) throw error;

    return { 
      success: true, 
      user: data.user, 
      needsEmailConfirmation: !data.session 
    };
  } catch (error) {
    console.error("Signup Failure:", error);
    return { success: false, error: toErrorMessage(error) };
  }
};

// Clean Login - Reactive to AuthProvider
export const loginUser = async (email, password) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { data: authData, error: authError } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      }),
      20000,
      "Auth Login"
    );

    if (authError) throw authError;

    return { success: true, user: authData.user };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: toErrorMessage(error) };
  }
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
  }
  return { success: true };
};

export const useAuth = () => {
  // Simple check for now, can be expanded
  if (typeof window === "undefined") return { user: null, loading: true };
  const userData = localStorage.getItem("userData");
  return { 
    user: userData ? JSON.parse(userData) : null, 
    profile: userData ? JSON.parse(userData) : null,
    loading: false 
  };
};
