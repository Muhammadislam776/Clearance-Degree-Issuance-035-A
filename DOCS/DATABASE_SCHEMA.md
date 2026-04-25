# 🗄️ Database Schema Reference (Supabase)

This document serves as the absolute source of truth for the **Clearance & Degree Issuance System** database structure. Use this as a reference when writing SQL or updating application services.

---

## 🏗️ Tables

### 1. `users` (Public Profiles)
Synced automatically with `auth.users`.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (matches `auth.users.id`) |
| `name` | TEXT | Full name |
| `email` | TEXT | Unique email address |
| `role` | TEXT | `'student'`, `'admin'`, `'department'`, `'examiner'` |
| `department` | TEXT | Department name (optional) |
| `roll_number`| TEXT | Student roll number (optional) |
| `status` | TEXT | `'active'`, `'suspended'` |
| `created_at` | TIMESTAMP | Creation time |

### 2. `students` (Student Profiles)
Created automatically on signup for students.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Reference to `users.id` |
| `name` | TEXT | Student name |
| `email` | TEXT | Student email |
| `roll_number`| TEXT | Unique roll number |
| `department` | TEXT | Student's department |
| `session` | TEXT | e.g., "2023-2027" |
| `created_at` | TIMESTAMP | Creation time |

### 3. `departments` 
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | TEXT | Department name (e.g., "Library", "Accounts") |
| `focal_person`| TEXT | Contact person name |
| `whatsapp_number` | TEXT | Contact WhatsApp |
| `created_at` | TIMESTAMP | Creation time |

### 4. `clearance_requests` 
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `student_id` | UUID | Reference to `students.id` |
| `overall_status`| TEXT | `'pending'`, `'in_progress'`, `'completed'` |
| `degree_issued`| BOOLEAN | Default `FALSE` |
| `reason` | TEXT | **[Added]** Student's reason for clearance |
| `notes` | TEXT | Additional notes |
| `submission_date`| TIMESTAMP| When request was submitted |
| `completion_date`| TIMESTAMP| When final approval granted |
| `created_at` | TIMESTAMP | Creation time |

### 5. `clearance_status` (Departmental Statuses)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `request_id` | UUID | Reference to `clearance_requests.id` |
| `department_id`| UUID | Reference to `departments.id` |
| `status` | TEXT | `'pending'`, `'approved'`, `'rejected'` |
| `remarks` | TEXT | Feedback from department staff |
| `updated_at` | TIMESTAMP | Last update time |

### 6. `documents` 
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `student_id` | UUID | Reference to `students.id` |
| `request_id` | UUID | Reference to `clearance_requests.id` |
| `file_url` | TEXT | Storage URL |
| `file_type` | TEXT | e.g., "pdf", "image" |
| `uploaded_at` | TIMESTAMP | Upload time |

---

## ⚡ Automation (Triggers)

### 1. Atomic Auth Sync
Automatically creates a `users` (and `students` if applicable) record when a new user signs up via Supabase Auth.
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'), 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );

  IF (COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student') THEN
    INSERT INTO public.students (user_id, name, email, roll_number, department, session)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Student'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'roll_number', 'PENDING'),
      'N/A',
      '2023-2027'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Departmental Status Generation
Automatically creates rows in `clearance_status` for every department when a student applies for clearance.
```sql
CREATE OR REPLACE FUNCTION create_clearance_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clearance_status (request_id, department_id)
  SELECT NEW.id, id FROM departments;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔐 Security (RLS)

- **Users**: Public can sign up; users can update own profile.
- **Students**: authenticated students must be able to read their own student row so the app can resolve `student_id`.
- **Clearance requests**: students must be able to insert their own request rows and read their own requests.
- **Documents**: students must be able to upload/read their own supporting files.
- **Admin Policies**: uses JWT metadata to prevent recursive lookups.

```sql
-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- STUDENTS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own student row"
ON public.students
FOR SELECT
USING (user_id = auth.uid());

-- CLEARANCE REQUESTS
ALTER TABLE public.clearance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own clearance request"
ON public.clearance_requests
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Students can read own clearance requests"
ON public.clearance_requests
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- DOCUMENTS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can upload own documents"
ON public.documents
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Students can read own documents"
ON public.documents
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- Admin view policy example
CREATE POLICY "Admin can view all users" ON public.users
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );
```

---

## 🏛️ Additional Tables (Messaging & Staff)

### 7. `chats` (Conversations)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `sender_id` | UUID | Participant 1 |
| `receiver_id` | UUID | Participant 2 |
| `clearance_id` | UUID | Related clearance request |
| `subject` | TEXT | Chat subject |
| `last_message_at`| TIMESTAMP| For sorting |
| `is_active` | BOOLEAN | Default `TRUE` |
| `created_at` | TIMESTAMP | Creation time |

### 8. `chat_messages` (Individual Messages)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `chat_id` | UUID | Reference to `chats.id` |
| `sender_id` | UUID | Message sender |
| `message` | TEXT | Message content |
| `attachments` | JSONB | Optional files |
| `is_read` | BOOLEAN | Read status |
| `created_at` | TIMESTAMP | Creation time |

### 9. `staff_directory` (Staff Contacts)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Reference to `users.id` |
| `department_id`| UUID | Reference to `departments.id` |
| `position` | TEXT | Staff title (e.g., "Librarian") |
| `phone` | TEXT | Work phone |
| `whatsapp_number` | TEXT | WhatsApp for direct student contact |
| `is_public` | BOOLEAN | If student can see this |
| `availability_status` | TEXT | `'available'`, `'busy'`, `'offline'` |
| `created_at` | TIMESTAMP | Creation time |
