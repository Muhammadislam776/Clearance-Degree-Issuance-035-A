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

      // 2) If the users row is missing, we check metadata as a fallback
      let profileCandidate = baseProfile;
      if (!profileCandidate) {
        const { data: authUserData } = await supabase.auth.getUser();
        const authUser = authUserData?.user;
        
        profileCandidate = {
          id: userId,
          email: authUser?.email ?? null,
          name: authUser?.user_metadata?.name ?? 'User',
          role: normalizeRole(authUser?.user_metadata?.role),
          __missing_users_row: true,
        };
      }

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

      // We handle 'department' role
      if (role === 'department') {
        const { data } = await supabase
          .from('departments')
          .select('*')
          .eq('id', profileCandidate.department_id)
          .maybeSingle();
        departmentProfile = data;
      }

      const normalizedProfile = {
        ...profileCandidate,
        role,
        student_profile: studentProfile,
        department_profile: departmentProfile,
        // Common convenience fields
        roll_number: studentProfile?.roll_number || profileCandidate?.roll_number || null,
        department_name: departmentProfile?.name || profileCandidate?.department || null,
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
