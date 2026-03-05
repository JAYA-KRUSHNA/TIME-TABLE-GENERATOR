# 🗓️ OptiSchedule — AI-Powered Academic Timetable Generator

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite" />
  <img src="https://img.shields.io/badge/Algorithm-Scored_CSP-6366f1?style=for-the-badge" />
</p>

**OptiSchedule** is a full-stack intelligent timetable generation system that creates conflict-free, optimized academic schedules using a Scored Constraint Satisfaction Problem (CSP) algorithm with post-generation optimization.

---

## ✨ Features

### 🧠 AI-Powered Timetable Generation
- **Scored CSP Algorithm** — Every possible slot gets a quality score across 6 factors, and the best slot wins
- **4-Phase Generation** — Labs → Theory → Free Periods → Optimization
- **Post-Generation Optimization** — 200-iteration swap pass to improve overall quality
- **Zero-Conflict Guarantee** — Faculty, room, lab, and section conflicts are all prevented

### 🏫 Room & Lab Management
- Smart room/lab allocation with occupancy tracking
- Visual usage bars showing real-time utilization
- Room consistency (same section uses same room when possible)

### 📊 Scoring Factors
| Factor | Weight | Description |
|---|---|---|
| Day Spread | +50 | Subjects spread across different days |
| No Repeat Same Day | -100 | Prevents same subject twice on same day |
| Time Preference | +15 | Theory → morning, Labs → afternoon |
| Anti-Clustering | +10 | Avoids same subject in adjacent periods |
| Even Distribution | +8 | Balances load across days |
| Room Consistency | +3 | Same room for same section |

### 🔐 Authentication System
- JWT-based auth with httpOnly cookies
- Three roles: **Student**, **Faculty**, **Admin/SuperAdmin**
- OTP email verification for registration
- Faculty requires admin approval after OTP verification
- Password reset via OTP flow

### 🎨 Premium UI
- Dark glassmorphism design system
- Framer Motion animations throughout
- Particle field landing page with typewriter effect
- Color-coded timetable cells (Theory / Lab / Free Period)
- Responsive admin sidebar with collapse

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Database** | SQLite via better-sqlite3 |
| **ORM** | Prisma (schema only) |
| **Auth** | JWT + bcryptjs |
| **Email** | Nodemailer (SMTP) |
| **UI** | React + Framer Motion |
| **Styling** | Custom CSS (glassmorphism) |
| **Icons** | Lucide React |
| **Fonts** | Inter + Poppins (Google Fonts) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **npm** 9+
- A Gmail account (or SMTP provider) for OTP emails

### 1. Clone the repo
```bash
git clone https://github.com/JAYA-KRUSHNA/TIME-TABLE-GENERATOR.git
cd TIME-TABLE-GENERATOR
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-secret-key
```

> **Note:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password).

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> The SQLite database is automatically created and seeded on first run (15 classrooms, 3 labs, departments, sections, and a default superadmin).

### 5. Default Admin Login
```
Email: admin@optischedule.com
Password: Admin@123
```

---

## 📁 Project Structure

```
optischedule/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── admin/              # Admin dashboard & pages
│   │   │   ├── timetable/      # Timetable generator wizard
│   │   │   ├── timetables/     # View generated timetables
│   │   │   ├── rooms/          # Room & lab management
│   │   │   ├── users/          # User management
│   │   │   └── approvals/      # Faculty approval
│   │   ├── auth/               # Auth pages (login/register/OTP)
│   │   ├── api/                # API routes
│   │   │   ├── timetable/generate/  # CSP Algorithm
│   │   │   ├── auth/           # Auth endpoints
│   │   │   ├── admin/          # Admin endpoints
│   │   │   └── data/           # Data CRUD
│   │   ├── student/            # Student dashboard
│   │   └── faculty/            # Faculty dashboard
│   ├── components/
│   │   ├── admin/              # AdminSidebar
│   │   ├── auth/               # AuthLayout
│   │   └── landing/            # ParticleField, Typewriter
│   ├── lib/
│   │   ├── db.ts               # SQLite connection & seeding
│   │   ├── auth.ts             # JWT helpers
│   │   ├── email.ts            # Nodemailer
│   │   └── validators.ts       # Input validation
│   └── middleware.ts           # Route protection
├── .env.example                # Environment template
├── .gitignore
└── package.json
```

---

## 🗓️ Timetable Schedule

| Period | Time |
|---|---|
| P1 | 9:00 AM - 9:50 AM |
| P2 | 9:50 AM - 10:40 AM |
| ☕ Break | 10:40 AM - 11:00 AM |
| P3 | 11:00 AM - 11:50 AM |
| P4 | 11:50 AM - 12:40 PM |
| 🍽️ Lunch | 12:40 PM - 1:50 PM |
| P5 | 1:50 PM - 2:40 PM |
| P6 | 2:40 PM - 3:30 PM |
| P7 | 3:30 PM - 4:20 PM |

**Days:** Monday through Saturday (42 slots per section)

---

## 📝 Timetable Generator Wizard (6 Steps)

1. **Select Classes** — Choose year/section combinations
2. **Configure Subjects** — Add/manage theory and lab subjects
3. **Select Classrooms** — Pick rooms (shows occupancy %)
4. **Select Labs** — Pick labs (shows occupancy %)
5. **Add Free Periods** — MOOCs, Library, Career Enhancement, etc.
6. **Set Rules & Generate** — Configure constraints and run

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is built for the academic hackathon at JNTU-A.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/JAYA-KRUSHNA">Jaya Krushna</a>
</p>
