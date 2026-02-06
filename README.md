# School Ops Frontend

Next.js frontend for the School Operations management system.

> 📖 **For complete setup instructions, see the main [README.md](../README.md) in the project root.**

## Quick Reference

### Development Commands

```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

### Project Structure

```
frontend/
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── layout/       # Layout components
│   │   └── guards/       # Auth guards
│   ├── contexts/          # React contexts
│   ├── lib/               # Utilities & API client
│   ├── providers/         # App providers
│   └── types/             # TypeScript types
├── public/                # Static assets
├── .env.example           # Environment template
└── package.json           # Dependencies
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```dotenv
# App Configuration
NEXT_PUBLIC_APP_NAME=School Operations
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_API_URL=http://localhost:8000/api/v1

# Feature Flags
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### Tech Stack

- **Next.js 16** - React Framework with App Router
- **React 19** - UI Library
- **TailwindCSS 4** - Styling
- **TanStack Query** - Server State Management
- **React Hook Form + Zod** - Form Handling & Validation
- **Radix UI** - Accessible Component Primitives
- **Lucide Icons** - Icon Library

### Pages Overview

| Route | Description |
|-------|-------------|
| `/` | Dashboard |
| `/auth/login` | Login page |
| `/students` | Student management |
| `/attendance` | Attendance tracking |
| `/exams` | Exam results |
| `/tasks` | Task management |
| `/users` | User management |
| `/roles` | Role & permissions |
| `/settings` | Project settings |
| `/audit-logs` | Audit log viewer |

### Development Tips

1. **API Client**: Use `apiClient` from `@/lib/api-client` for all API calls
2. **Authentication**: Auth context is provided by `AuthProvider`
3. **Project Context**: Multi-tenant project selection via `ProjectProvider`
4. **Toast Notifications**: Use `sonner` toast for user feedback

### Building for Production

```powershell
# Create production build
npm run build

# The output will be in .next folder
# Start with: npm run start
```
