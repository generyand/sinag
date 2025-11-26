# SINAG Web (NextJS Frontend)

Frontend application for the SINAG system built with **NextJS 15**, **TypeScript**, and **Tailwind CSS**.

## 🚀 **Quick Start**

```bash
# From monorepo root
pnpm dev:web

# Or from this directory
pnpm dev
```

The web app will be available at `http://localhost:3000`

## 📋 **Available Commands**

### **Development**
```bash
# Start development server with Turbopack
pnpm dev

# Start via monorepo (recommended)
pnpm dev:web

# Start with regular webpack (if needed)
pnpm dev:webpack
```

### **Building**
```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Build via monorepo
pnpm build --filter=web
```

### **Type Safety & Linting**
```bash
# Run TypeScript type checking
pnpm type-check

# Run ESLint
pnpm lint

# Auto-fix linting issues
pnpm lint --fix

# Generate/sync API types from backend
pnpm generate-types
```

### **Testing**
```bash
# Run tests (when implemented)
# pnpm test

# Run tests in watch mode
# pnpm test:watch

# Run tests with coverage
# pnpm test:coverage
```

## 🔗 **Type-Safe API Integration**

This frontend uses the auto-generated API client from `@sinag/shared`:

```typescript
import { ApiClient, type User, type LoginRequest } from '@sinag/shared';

// Create API client
const api = new ApiClient({ BASE: process.env.NEXT_PUBLIC_API_URL });

// Type-safe API calls
const user = await api.users.getCurrentUserApiUsersMeGet();
const auth = await api.auth.loginApiAuthLoginPost({ requestBody: credentials });
```

### **Sync API Types**
```bash
# Generate TypeScript types from FastAPI backend
pnpm generate-types

# This updates packages/shared/src/generated/ with:
# - Type-safe models (User, Project, etc.)
# - API service classes (AuthService, UsersService, etc.)
# - Complete API client with full typing
```

## 🛠️ **Development Tools**

### **Built-in Tools**
- **Hot Reload**: File changes automatically reload
- **TypeScript**: Full type checking and IntelliSense
- **Tailwind CSS**: Utility-first styling with JIT compilation
- **ESLint**: Code linting with NextJS recommended config

### **Browser DevTools**
- React DevTools (install browser extension)
- Tailwind CSS DevTools (install browser extension)

## 🏗️ **Project Structure**

```
apps/web/
├── src/
│   ├── app/              # NextJS App Router pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/       # Reusable React components
│   │   ├── ui/          # Base UI components (shadcn/ui)
│   │   └── ...          # Feature-specific components
│   └── lib/             # Utilities and configurations
│       ├── utils.ts     # Helper functions
│       └── api.ts       # API client setup
├── public/              # Static assets
├── next.config.ts       # NextJS configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## 🔧 **Environment Variables**

Create a `.env.local` file for local development:

```bash
# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Development settings
NODE_ENV=development

# Database URL (if connecting directly)
# DATABASE_URL=postgresql://user:password@localhost/sinag

# Authentication (when implemented)
# NEXT_PUBLIC_AUTH_URL=http://localhost:8000/auth
# NEXTAUTH_SECRET=your-secret-here
```

### **Environment Files**
- `.env.local` - Local development (ignored by git)
- `.env.development` - Development defaults (committed)
- `.env.production` - Production settings (committed)
- `.env` - Shared across all environments (committed)

## 🎨 **Styling Guidelines**

### **Tailwind CSS**
- Use utility classes for styling
- Create component classes in `globals.css` for complex patterns
- Use `cn()` utility for conditional class merging

### **Components**
- Use shadcn/ui components from `components/ui/`
- Follow the established component patterns
- Maintain consistent spacing and typography

Example:
```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CustomButton({ className, ...props }) {
  return (
    <Button 
      className={cn("bg-primary hover:bg-primary/90", className)}
      {...props}
    />
  );
}
```

## 📱 **Responsive Design**

Use Tailwind's responsive prefixes:
- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)
- `xl:` - Extra large screens (1280px+)

## 🧪 **Testing Guidelines**

*To be documented when testing framework is added*

Recommended setup:
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright or Cypress
- **Component Tests**: Storybook (when component library grows)

## 📦 **Key Dependencies**

### **Framework**
- `next` - NextJS framework
- `react` & `react-dom` - React library
- `typescript` - TypeScript support

### **Styling**
- `tailwindcss` - Utility-first CSS framework
- `@tailwindcss/postcss` - PostCSS integration
- `class-variance-authority` - Component variant management
- `clsx` & `tailwind-merge` - Conditional class handling

### **UI Components**
- `@radix-ui/react-*` - Headless UI primitives
- `lucide-react` - Icon library

### **Type Safety**
- `@sinag/shared` - Auto-generated API types and client

## 🚀 **Deployment Notes**

*To be documented when deployment pipeline is implemented*

Recommended platforms:
- **Vercel** (recommended for NextJS)
- **Netlify**
- **AWS Amplify**
- **Self-hosted** with Docker

## 🔗 **Related Documentation**

- [Root README](../../README.md) - Overall project setup
- [API README](../api/README.md) - Backend documentation
- [Architecture Docs](../../docs/architecture.md) - System design
- [Decision Records](../../docs/decisions.md) - Technical decisions

## 📚 **Learning Resources**

- [NextJS Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [React Documentation](https://react.dev)
