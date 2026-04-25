/**
 * Enhanced useAuth Hook - Complete Authentication Management
 * Now includes role checking, redirection, and full user context
 */

'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { supabase } from './supabaseClient';
import { normalizeRole } from './roleRouting';

const isMissingRelationError = (error) => {
  const msg = String(error?.message || error?.details || '').toLowerCase();
  return msg.includes('does not exist');
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const profileFetchRef = useRef({ inFlight: false, userId: null });

  useEffect(() => {
    checkAuthStatus();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      // Next.js dev overlay treats console.error as runtime error; keep this as a warning.
      // eslint-disable-next-line no-console
      console.warn('Auth check warning:', err?.message || err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      if (!userId) return null;

      // De-dupe concurrent profile fetches
      if (profileFetchRef.current.inFlight && profileFetchRef.current.userId === userId) {
        return null;
      }
      profileFetchRef.current = { inFlight: true, userId };

      // 1) Load base user profile from 'users'
      const { data: baseProfile, error: baseError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (baseError) {
        console.warn('Base profile fetch warning:', baseError?.message || baseError);
      }

      // 2) Always load auth user metadata and merge as fallback for missing fields
      const { data: authUserData } = await supabase.auth.getUser();
      const authUser = authUserData?.user;

      const meta = authUser?.user_metadata || {};

      let profileCandidate = baseProfile;
      if (!profileCandidate) {
        profileCandidate = {
          id: userId,
          email: authUser?.email ?? null,
          name: meta?.name ?? 'User',
          role: normalizeRole(meta?.role),
          __missing_users_row: true,
        };
      }

      // Merge metadata into profileCandidate only when DB fields are missing
      profileCandidate = {
        ...profileCandidate,
        email: profileCandidate?.email ?? authUser?.email ?? null,
        name: profileCandidate?.name || meta?.name || 'User',
        role: profileCandidate?.role || normalizeRole(meta?.role),
        roll_number: profileCandidate?.roll_number || meta?.roll_number || null,
        department_id: profileCandidate?.department_id || meta?.department_id || null,
        department_name: profileCandidate?.department_name || meta?.department_name || null,
        avatar_url: profileCandidate?.avatar_url || meta?.avatar_url || null,
      };

      const role = normalizeRole(profileCandidate?.role);

      // 3) Load role-specific profile data (Student or Department)
      let studentProfile = null;
      let departmentProfile = null;

      if (role === 'student') {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        studentProfile = data;
      }

      const deptName = profileCandidate?.department || profileCandidate?.department_name || null;
      const deptId = studentProfile?.department_id || profileCandidate?.department_id || null;

      if (deptId) {
        const { data } = await supabase
          .from('departments')
          .select('*')
          .eq('id', deptId)
          .maybeSingle();
        departmentProfile = data;
      } else if (role === 'department' && deptName) {
        const { data } = await supabase
          .from('departments')
          .select('*')
          .eq('name', deptName)
          .maybeSingle();
        departmentProfile = data;
      }

      // For students, resolve department name by department_id if provided in metadata/DB
      let resolvedStudentDepartment = null;
      const studentDepartmentId = studentProfile?.department_id || profileCandidate?.department_id || null;
      if (studentDepartmentId) {
        const { data } = await supabase
          .from('departments')
          .select('*')
          .eq('id', studentDepartmentId)
          .maybeSingle();
        resolvedStudentDepartment = data;
      }

      const normalizedProfile = {
        ...profileCandidate,
        id: userId, // Explicitly keep as Auth UID
        user_id: userId, // Alias for clarity
        role,
        student_profile: studentProfile,
        department_profile: departmentProfile,
        // Common convenience fields
        student_id: studentProfile?.id || null, // The key fix for clearance requests
        roll_number: studentProfile?.roll_number || profileCandidate?.roll_number || null,
        department_name:
          departmentProfile?.name ||
          resolvedStudentDepartment?.name ||
          profileCandidate?.department_name ||
          profileCandidate?.department ||
          null,
        department_id: departmentProfile?.id || studentDepartmentId || null, // Explicitly set department_id
      };

      setProfile(normalizedProfile);
      setError(null);
      return normalizedProfile;
    } catch (err) {
      console.warn('Profile fetch error:', err.message);
      setError(err.message);
      return null;
    } finally {
      profileFetchRef.current = { inFlight: false, userId: null };
    }
  };

  const value = {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user && !!profile,
    hasRole: (roles) => {
      if (!profile) return false;
      const current = normalizeRole(profile.role);
      if (typeof roles === 'string') return current === normalizeRole(roles);
      return Array.isArray(roles) && roles.map((r) => normalizeRole(r)).includes(current);
    },
    refreshProfile: () => fetchUserProfile(user?.id),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
