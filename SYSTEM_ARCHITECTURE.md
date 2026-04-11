# 🏗️ Complete System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16.2.2)                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  app/layout.jsx (AuthProvider wrapper - 'use client') │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
│  ┌────────────────────────┴─────────────────────────────┐   │
│  │                                                       │   │
│  ├─ /login              Firebase Auth UI               │   │
│  ├─ /signup             Role-based registration        │   │
│  │                                                       │   │
│  ├─ /student/dashboard  Student main view             │   │
│  ├─ /student/clearance  Clearance requests            │   │
│  ├─ /student/chat       Messaging interface           │   │
│  ├─ /student/profile    Profile management            │   │
│  ├─ /student/notifications  Notification center       │   │
│  │                                                       │   │
│  ├─ /department/dashboard   Pending clearances        │   │
│  ├─ /examiner/dashboard     Final review              │   │
│  ├─ /admin/dashboard        System analytics          │   │
│  │                                                       │   │
│  └────────────────────────────────────────────────────│   │
│                           │                             │   │
│  ┌────────────────────────┴──────────┐                │   │
│  │   useAuth() Hook (from context)   │                │   │
│  │   - user (Supabase auth)         │                │   │
│  │   - profile (app profiles)        │                │   │
│  │   - hasRole(roles)                │                │   │
│  │   - loading, error states         │                │   │
│  └────────────────────────────────────┘                │   │
└─────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
┌───────────────────────────────┐  ┌───────────────────┐
│  SERVICE LAYER (/lib)         │  │  COMPONENTS       │
│                               │  │                   │
│ - clearanceService.js         │  │ ProtectedRoute ←┐ │
│ - chatService.js              │  │ StudentLayout   │ │
│ - notificationService.js      │  │ DepartmentLayout●─┘
│ - staffDirectoryService.js    │  │ ExaminerLayout
│ - authService.js              │  │ AdminLayout
│ - useAuth.js                  │  │
│ - useAuthEnhanced.js          │  │
│ - supabaseClient.js           │  │
└───────────────────────────────┘  └───────────────────┘
                    │
                    │ Uses
                    ▼
┌─────────────────────────────────────────────────────────┐
│           BACKEND (Supabase Client SDK)                 │
│  - Authentication (JWT tokens)                          │
│  - Real-time Database (postgres_changes)               │
│  - Storage (document uploads)                           │
│  - Serverless Functions (future webhooks)              │
└─────────────────────────────────────────────────────────┘
                    │
                    │ PostgreSQL API
                    ▼
┌─────────────────────────────────────────────────────────┐
│        DATABASE TIER (Supabase PostgreSQL)              │
│                                                          │
│  TABLES (12):                                           │
│  ├─ users (authentication + roles)                     │
│  ├─ clearance_requests                                 │
│  ├─ clearance_tasks                                    │
│  ├─ documents                                           │
│  ├─ chats                                               │
│  ├─ chat_messages                                       │
│  ├─ notifications                                       │
│  ├─ student_profiles                                   │
│  ├─ staff_directory                                    │
│  ├─ departments                                         │
│  ├─ degrees                                             │
│  ├─ audit_logs                                          │
│                                                          │
│  SECURITY (RLS):                                        │
│  ├─ students see only their clearances                 │
│  ├─ dept staff see only their dept tasks               │
│  ├─ examiners see approved clearances                  │
│  ├─ admins see everything                              │
│                                                          │
│  REAL-TIME:                                             │
│  ├─ postgres_changes on INSERT/UPDATE/DELETE           │
│  ├─ Channel-based subscriptions                        │
│  └─ Instant client updates                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### User Login & Dashboard Load

```
User Input (email/password)
           │
           ▼
    authService.login()
           │
           ├─→ supabase.auth.signInWithPassword()
           │           │
           │           ▼
           │    Supabase creates JWT token
           │
           ├─→ fetchUserProfile(userId)
           │
           ├─→ Query users table for:
           │   - user_id, email, role
           │   - full_name, avatar_url
           │   - student_profiles or staff data
           │
           ├─→ Return complete profile object
           │
           ├─→ Store in React state (AuthContext)
           │
           ├─→ ProtectedRoute checks role
           │
           └─→ Redirect to appropriate dashboard
                /student/dashboard    ← if role='student'
                /department/dashboard ← if role='dept_staff'
                /examiner/dashboard   ← if role='examiner'
                /admin/dashboard      ← if role='admin'
                       │
                       ▼
            Dashboard useEffect fires
                       │
                       ├─→ getStudentClearances(userId)
                       │        │
                       │        ├─→ Query clearance_requests table
                       │        ├─→ Filter by student_id = userId
                       │        ├─→ Include related tasks & documents
                       │        └─→ Return sorted by date DESC
                       │
                       ├─→ getUserConversations(userId)
                       │        │
                       │        ├─→ Query chats table
                       │        ├─→ Filter where user is participant
                       │        └─→ Return with last message preview
                       │
                       ├─→ getUserNotifications(userId)
                       │        │
                       │        ├─→ Query notifications table
                       │        ├─→ Count unread (is_read = false)
                       │        └─→ Return recent 10
                       │
                       ▼
            Display dashboard with real data
             (not mock data anymore)
```

---

## 🔄 Real-Time Update Flow

### Clearance Status Changes

```
Department Staff Action
       │
       ├─→ Opens clearance detail
       │
       ├─→ Clicks "Approve" button
       │
       ├─→ updateClearanceStatus(clearanceId, 'approved')
       │
       ├─→ Update clearance_requests table
       │    UPDATE clearance_requests
       │    SET status = 'approved'
       │    WHERE id = clearanceId
       │
       ├─→ Trigger: Supabase postgres_changes event
       │
       ├─→ Broadcast to all connected clients:
       │    Channel: "clearance:{clearanceId}"
       │    Event: { type: 'UPDATE', new: {...}, old: {...} }
       │
       ├─→ Student has subscribeToClearanceUpdates running:
       │
       │    supabase.channel(`clearance:${clearanceId}`)
       │      .on('postgres_changes', {...}, (payload) => {
       │        setClearances(prev =>
       │          prev.map(c => c.id === payload.new.id
       │            ? payload.new
       │            : c
       │          )
       │        )
       │      })
       │
       ├─→ Student dashboard card updates instantly
       │    (no page refresh needed)
       │
       ├─→ Notification triggered automatically
       │
       └─→ Student receives badge "1 new notification"
            And sees "Your clearance was approved" in feed
```

### Chat Message Delivery

```
Student sends message
       │
       ├─→ User types in chat input
       │
       ├─→ Clicks "Send" button
       │
       ├─→ sendMessage({
       │    chatId: '123',
       │    senderId: userIdA,
       │    message: 'Hello!',
       │    messageType: 'text'
       │  })
       │
       ├─→ Insert into chat_messages table
       │    INSERT INTO chat_messages (...)
       │    VALUES (...)
       │
       ├─→ Supabase postgres_changes fires
       │
       ├─→ Broadcast to all subscribers on chat:123
       │
       ├─→ Department staff has subscribeToChat running:
       │
       │    supabase.channel(`chat:${chatId}`)
       │      .on('postgres_changes', {...}, (payload) => {
       │        setMessages(prev => [...prev, payload.new])
       │      })
       │
       ├─→ Message appears in real-time on staff screen
       │
       ├─→ Notification service triggered
       │
       └─→ Staff gets notification badge
            "New message from {student name}"
```

---

## 🔐 Security Architecture

### Row-Level Security (RLS)

```
Database Level Protection

┌─ CLEARANCE_REQUESTS Table
│  
│  RLS Policy 1: "Students see only own clearances"
│  CREATE POLICY student_clearance
│  ON clearance_requests
│  AS SELECT
│  WHERE student_id = auth.uid()
│
│  RLS Policy 2: "Dept staff see only dept clearances"
│  CREATE POLICY dept_staff_clearance
│  ON clearance_requests
│  AS SELECT
│  WHERE clearance_request_id IN (
│    SELECT id FROM clearance_tasks
│    WHERE assigned_to_department = (
│      SELECT department_id FROM users WHERE id = auth.uid()
│    )
│  )
│
│  RLS Policy 3: "Examiners see approved clearances"
│  CREATE POLICY examiner_clearance
│  ON clearance_requests
│  AS SELECT
│  WHERE status = 'approved'
│    AND (SELECT role FROM users WHERE id = auth.uid()) = 'examiner'
│
│  RLS Policy 4: "Admins see all"
│  CREATE POLICY admin_all
│  ON clearance_requests
│  AS SELECT
│  WHERE (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
│
├─ End Result:
│  SELECT * FROM clearance_requests
│  Returns different data based on calling user's role
│
└─  No backend secrets needed!
    Client makes query with JWT token
    Supabase enforces RLS automatically
```

### Frontend Protection

```
┌─ ProtectedRoute Component
│
│  <ProtectedRoute requiredRoles={['student']}>
│
│  Check 1: User authenticated?
│  ├─ if (!user) → redirect to /login
│
│  Check 2: User has required role?
│  ├─ if (!hasRole(['student'])) →
│     redirect to appropriate dashboard
│
│  Check 3: If all checks pass
│  ├─ Render children component
│
└─ Still needs RLS at database level
   (Frontend protection alone isn't enough)
```

---

## 📡 Real-Time Architecture

### Subscription Pattern

```
Component Mount
       │
       ├─→ useEffect(() => {
       │    const channel = supabase.channel('clearance:123')
       │      .on('postgres_changes', {
       │        event: 'UPDATE',
       │        table: 'clearance_requests',
       │        filter: 'id=eq.123'
       │      }, (payload) => {
       │        // Handle update
       │        setClearance(payload.new)
       │      })
       │      .subscribe()
       │
       │    return () => channel.unsubscribe()
       │  }, [clearanceId])
       │
       ├─→ Supabase creates WebSocket connection
       │
       ├─→ Listening for postgres_changes events
       │
       ├─→ When database table changes:
       │   - Supabase detects change
       │   - Broadcasts to relevant channels
       │   - Components receive payload
       │   - State updates trigger re-render
       │
       └─→ Component unmount
            Cleanup unsubscribe() closes listener
            WebSocket connection closed
```

### Connection Management

```
Multiple Subscriptions on One App:
   ├─ subscribeToClearanceUpdates() → WebSocket 1
   ├─ subscribeToChat(chatId) → WebSocket 2
   ├─ subscribeToNotifications() → WebSocket 3
   └─ subscribeToStaffAvailability() → WebSocket 4

Supabase Client:
   └─ Manages 1 underlying connection with multiplexing
      (all subscriptions share same WebSocket)
```

---

## 🎯 API Service Pattern

### Example: clearanceService.js

```javascript
// Pattern used for all services

// 1. Async Function (returns { success, data, error })
export const getStudentClearances = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('clearance_requests')
      .select(`
        id, student_id, type, status,
        clearance_tasks(id, department_id, status),
        documents(id, file_name, status)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      data: null,
      error: err.message
    }
  }
}

// 2. Real-Time Subscription (returns channel object)
export const subscribeToClearanceUpdates = (clearanceId, onUpdate) => {
  return supabase
    .channel(`clearance:${clearanceId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      table: 'clearance_requests',
      filter: `id=eq.${clearanceId}`
    }, (payload) => onUpdate(payload.new))
    .subscribe()
}

// 3. Usage in Component
const Component = () => {
  const [clearance, setClearance] = useState(null)

  useEffect(() => {
    // Fetch initial data
    const result = await getStudentClearances(userId)
    if (result.success) setClearance(result.data[0])

    // Subscribe to updates
    const channel = subscribeToClearanceUpdates(
      clearanceId,
      (updated) => setClearance(updated)
    )

    // Cleanup
    return () => channel.unsubscribe()
  }, [])

  return <div>{clearance?.status}</div>
}
```

---

## 📱 Device Compatibility

```
Desktop (1920x1080+)
├─ Full sidebar navigation
├─ Multi-column layouts
└─ All features visible

Tablet (768px - 1024px)
├─ Collapsible sidebar
├─ 2-column layouts
└─ Touch-friendly buttons

Mobile (320px - 767px)
├─ Drawer navigation
├─ Single column layouts
├─ Bottom navigation bar
└─ Large touch targets
```

---

## 🚀 Performance Optimizations

```
Frontend:
├─ Code splitting with Next.js dynamic imports
├─ Image optimization with next/image
├─ CSS-in-JS for reduced bundle
└─ React hook caching with useCallback/useMemo

Backend:
├─ Database indexes on:
│  ├─ user_id, student_id, department_id
│  ├─ status, created_at columns
│  └─ Foreign key relationships
├─ RLS policies optimized for common queries
├─ Real-time subscriptions filtered at DB level
└─ Pagination for large result sets

Network:
├─ Supabase CDN for static content
├─ JWT token reuse (no re-auth on page nav)
├─ WebSocket reuse for subscriptions
└─ Compression on responses
```

---

**Architecture Status:** Production-ready  
**Last Updated:** Today  
**Version:** 1.0
