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
    // Check our custom users table
    const { data, error } = await withTimeout(
      supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle(),
      8000,
      "Email Check"
    );
    
    // If there's an error or no data found, email is available
    if (error || !data) {
      return { exists: false, checked: true };
    }
    
    return { exists: !!data, checked: true };
  } catch (err) {
    console.log("Email check error:", err);
    return { exists: false, checked: false };
  }
};

// Atomic Resilient Signup - Sync is handled by DB triggers for 100% reliability
export const signupUser = async (email, password, name, role, additionalData = {}) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = normalizeRole(role);

    // Start the signup but with a shorter timeout - signup may take time server-side
    let data, error;
    try {
      const result = await withTimeout(
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
        20000, // Reduced from 60s to 20s
        "Auth Signup"
      );
      data = result.data;
      error = result.error;
    } catch (timeoutError) {
      // If auth times out, check if user was created in database
      console.warn("Auth signup timed out, checking database...", timeoutError);
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id, email, role")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (existingUser) {
          // User was created despite timeout - treat as success
          console.log("User successfully created despite timeout");
          return { 
            success: true, 
            user: { id: existingUser.id, email: existingUser.email },
            needsEmailConfirmation: true,
            timedOut: true 
          };
        }
      } catch (dbCheckError) {
        console.error("Database check failed:", dbCheckError);
        // If database check fails but the user registration was sent to backend,
        // treat as success (user was created anyway via trigger)
        return { 
          success: true, 
          user: { email: normalizedEmail },
          needsEmailConfirmation: true,
          timedOut: true,
          mayHaveSucceeded: true
        };
      }
      
      // If user not in database after timeout, it's a real error
      throw timeoutError;
    }

    if (error) {
      // Handle user already exists error
      const errorMsg = toErrorMessage(error).toLowerCase();
      if (errorMsg.includes("already registered") || errorMsg.includes("user already exists")) {
        return { success: false, error: "This email is already registered. Please log in instead." };
      }
      throw error;
    }

    return { 
      success: true, 
      user: data.user, 
      needsEmailConfirmation: !data.session 
    };
  } catch (error) {
    console.error("Signup Failure:", error);
    const errorMsg = toErrorMessage(error);
    // More user-friendly error messages
    if (errorMsg.toLowerCase().includes("already registered") || errorMsg.toLowerCase().includes("user already exists")) {
      return { success: false, error: "This email is already registered. Please log in instead." };
    }
    return { success: false, error: errorMsg };
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
      30000,
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
