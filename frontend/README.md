# Lost & Found Frontend

A modern React frontend built with Vite and TypeScript for the Lost & Found Portal.

## Features

- **React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **React Router** for client-side routing
- **React Query** for server state management
- **Zustand** for client state management
- **React Hook Form + Zod** for form validation
- **Axios** for API calls
- **Custom CSS** with Lost & Found theme colors

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout with header/footer
│   └── LoadingSpinner.tsx
├── pages/              # Page components
│   ├── Home.tsx        # Browse items page
│   └── Login.tsx       # Login page
├── services/           # API service layer
│   └── api.ts          # Axios configuration and API calls
├── store/              # State management
│   └── authStore.ts    # Authentication state (Zustand)
├── types/              # TypeScript type definitions
│   └── index.ts        # All application types
├── utils/              # Utility functions
│   └── index.ts        # Helper functions
├── App.tsx             # Main app component with routing
├── main.tsx            # Application entry point
└── index.css           # Global styles and component classes
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Proxy

The Vite development server is configured to proxy `/api` requests to `http://localhost:8080` (the API Gateway).

## Theme

The application uses a Lost & Found themed color palette:
- **Primary**: Orange tones (#ea580c, #f97316)
- **Secondary**: Blue tones (#2563eb, #1d4ed8)
- **Neutral**: Gray tones for text and backgrounds
- **Status colors**: Green (found), Red (lost), Yellow (pending)

## Components

### Layout
- Responsive header with navigation
- Logo and branding
- Authentication-aware navigation
- Footer with branding

### Forms
- Styled form inputs with validation
- Loading states and error handling
- Consistent button styles with hover effects

### Cards
- Item display cards with hover animations
- Badge system for item status
- Responsive grid layouts

## State Management

- **Authentication**: Zustand store with persistence
- **Server State**: React Query for caching and synchronization
- **Forms**: React Hook Form with Zod validation

## Next Steps

Additional pages and components will be added in subsequent tasks:
- Register page
- Item reporting forms (lost/found)
- Item detail pages
- User dashboard (my items, claims)
- Admin dashboard
- Search and filtering