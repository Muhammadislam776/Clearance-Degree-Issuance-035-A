# 🎓 Smart Student Clearance & Degree Issuance System

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-degreeclearancesystem.vercel.app-00A4EF?style=for-the-badge)](https://degreeclearancesystem.vercel.app)

> A modern, intelligent system for streamlining student clearance processes and degree issuance workflows in educational institutions.

---

## 🚀 Live Application

**🔗 [degreeclearancesystem.vercel.app](https://degreeclearancesystem.vercel.app)**

---

## 👥 Test Accounts

Use the following credentials to explore different roles:

### 1️⃣ **Admin Account**
```
Email:    islamjut@gmail.com
Password: Islam`123
Role:     System Administrator
Access:   Full system management, user management, analytics
```


### 2️⃣ **Student Account**
```
Email:    is@gmail.com
Password: Islam`123
Role:     Student
Access:   Apply for clearance, track status, upload documents
```

### 3️⃣ **Department Staff Account**
```
Email:    islamju@gmail.com
Password: Islam`123
Role:     Department Coordinator
Access:   Process department clearances, manage reviews
```
### 4️⃣ **Examiner Account**
```
Email:    islamjutt5@gmail.com
Password: Islam`123
Role:     Academic Examiner
Access:   Review clearance requests, approve/reject submissions
```

---

## ✨ Key Features

### 🎯 For Students
- 📋 Apply for degree clearance with step-by-step wizard
- 📁 Upload and manage required documents
- 📊 Real-time clearance status tracking
- 💬 Chat support with department staff
- 🔔 Instant notifications on status updates
- 👤 Comprehensive student profile management

### 👨‍💼 For Department Staff
- ✅ Review pending clearance requests
- 💭 Leave comments and feedback
- 🔄 Approve or reject with explanations
- 📈 Department analytics and statistics
- 🔔 Delegate tasks to examiners

### 🧑‍🔬 For Examiners
- 📋 Queue of pending final reviews
- 🔍 Detailed student record inspection
- ✍️ Final validation and approval
- 📊 Review analytics dashboard
- 🔐 Role-based security controls

### 🔧 For Administrators
- 👥 Complete user management system
- 🏢 Department and staff directory
- 📊 System-wide analytics & reports
- ⚙️ Configuration management
- 🔒 Security and audit logs

---

## 🚀 Complete Project Guide (Viva Edition)

This guide provides a deep-dive into every aspect of the **Smart Student Clearance & Degree Issuance System**. It is designed to help you answer technical and conceptual questions during your viva exam.

### 💡 Project Purpose & Problem Statement
The traditional clearance process in universities is slow, paper-heavy, and requires students to physically visit multiple departments (Library, Finance, Sports, etc.). Our solution digitizes this entire workflow into a **centralized, real-time platform**, reducing the clearance time from weeks to just a few minutes.

---

### 🏛️ Technical Architecture (The Big Picture)
The system is built using a modern **Serverless Architecture**:
1. **Frontend (Next.js 16)**: Handles the UI and user interactions. We use the **App Router** for fast navigation and **React 19** for building dynamic components.
2. **Backend-as-a-Service (Supabase)**:
   - **Auth**: Manages secure logins and role-based permissions.
   - **Database (PostgreSQL)**: Stores all student records, clearance tasks, and chats.
   - **Storage**: Securely holds uploaded documents (Fee slips, Transcripts).
   - **Real-time**: Uses WebSockets to sync data across all users instantly.

---

### 📂 Module-by-Module Functionality

#### 1️⃣ **Student Module**
- **Simplified Application**: A wizard-style form where students apply for clearance and select their reasons.
- **Document Management**: Students upload digital proof (PDF/Images). The system links these to their specific request.
- **Real-time Status Bar**: A visual progress indicator (e.g., "3/5 Departments Cleared").
- **AI Help**: A built-in chatbot that answers common questions about the clearance process instantly.

#### 2️⃣ **Departmental Module (Staff)**
- **Task Queue**: Each department (e.g., Library) has its own private dashboard.
- **Approval Logic**: Staff can click one button to "Approve" or "Reject". 
- **Feedback Loop**: If rejected, staff *must* provide a reason (Remarks), which the student sees instantly.
- **Direct Messaging**: Staff can chat with students to clarify issues without needing emails or phone calls.

#### 3️⃣ **Examiner Module (Academic Office)**
- **Final Gatekeeper**: They only see students who are "Fully Cleared" by all other departments.
- **Verification View**: They can inspect all student documents in one place for a final audit.
- **Official Issuance**: Clicking "Issue Degree" marks the record as completed and ready for graduation.

#### 4️⃣ **Admin Module (System Control)**
- **User Oversight**: Full control over staff and student accounts.
- **Analytics Dashboard**: View aggregate data like "Total Degrees Issued" and "Average Clearance Time".
- **Security Logs**: Monitor system activity to ensure data integrity.

---

### 🛠️ "Under the Hood": Key Technical Features

- **Row Level Security (RLS)**: We don't just hide data in the UI; the database itself blocks unauthorized access. A student can *never* query another student's clearance status via the API.
- **SQL Triggers (Automation)**: To save manual work, the database has a "Trigger" that automatically creates individual tasks for all departments as soon as a student clicks "Apply".
- **Real-time WebSockets**: We use a "Publish-Subscribe" pattern. When a librarian approves a task, the database "Publishes" an event, and the student's dashboard (the "Subscriber") updates instantly.
- **Responsive UI**: Built with a mobile-first approach, ensuring the portal works perfectly on smartphones, which is where most students will use it.

---

### ❓ Viva Voice: Common Q&A

**Q: How does your system handle security between roles?**
> "We use **Role-Based Access Control (RBAC)** combined with **Supabase RLS**. Every database query is checked against the user's JWT token to ensure they have the 'department', 'examiner', or 'admin' role required to see that information."

**Q: What happens if a student loses internet while applying?**
> "The system uses **Atomic Operations**. Either the whole application is saved, or nothing is. This prevents 'partial' or 'broken' requests from entering the database."

**Q: Why use a Chatbot instead of a simple FAQ page?**
> "The **AI Assistant** provides a more interactive experience and can handle specific keywords to give direct advice, making it faster than searching through a long FAQ list."

**Q: How do you handle large file uploads?**
> "Files are uploaded directly to **Supabase Storage Buckets**. We store only the 'File URL' in the database. This keeps our main database lightweight and fast while allowing us to store GBs of student documents."

---

## 🚀 Getting Started (Setup Guide)

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Muhammadislam776/Clearance-Degree-Issuance-035-A.git
   npm install
   ```
2. **Environment**: Setup `.env.local` with your Supabase `URL` and `Anon Key`.
3. **Run**: 
   ```bash
   npm run dev
   ```

---

## 👨‍💻 Author
**Muhammad Islam**  
*Computer Science / Software Engineering Student*

**Project Status**: ✅ Viva Ready | ✅ Production Tested

