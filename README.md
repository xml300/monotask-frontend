# MonoTask — Frontend

A minimalist, black-and-white React + TypeScript frontend with semantic status colors, Radix UI primitives, Framer Motion micro-interactions, and a swappable mock/HTTP API transport layer.

---

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS v3 (monochrome light/dark tokens + semantic status colors)
- **UI Primitives:** Radix UI (`Dialog`, `DropdownMenu`, `Tabs`) + custom accessible primitives
- **Motion & Icons:** Framer Motion + Lucide React

---

## Folder Structure

```text
src/
├── components/
│   ├── ui/             # Reusable primitives (Button, Input, Badge, Checkbox, Dialog, Dropdown, Tabs)
│   ├── BulkActionBar.tsx
│   ├── CreateTodoModal.tsx
│   ├── FilterBar.tsx
│   ├── ListModals.tsx
│   ├── TodoInspector.tsx
│   └── TodoRow.tsx
├── hooks/              # Data query & mutation hooks (useAuth, useTodos, useTodoDetail, useLists, useStats, useToast, useTheme)
├── layouts/            # AppLayout (responsive sidebar) & AuthLayout
├── lib/
│   ├── api/
│   │   ├── transport.ts      # Shared ApiTransport interface (.get, .post, .patch, .delete)
│   │   ├── httpTransport.ts  # Real fetch adapter for Express backend
│   │   ├── mockTransport.ts  # Route-matched localStorage mock adapter
│   │   ├── seedData.ts       # Seed data for mock mode
│   │   └── index.ts          # Unified API client built on top of transport
│   ├── types.ts        # Shared entity and DTO types
│   └── utils.ts        # Formatting and class helpers
└── pages/              # AuthPage, TasksPage, StatsPage
```

---

## Getting Started

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

---

## Mock Mode vs. Real Backend

By default, the app runs in **mock mode** using `mockTransport` (backed by `localStorage`) so you can explore every feature immediately without a running server.

- **Demo account (mock mode):** `alex@monotask.dev` / `password123` (or click **Enter Demo Workspace** on the sign-in screen).
- Other seeded teammates for testing shared lists: `sam@monotask.dev`, `maya@monotask.dev`.

### Connecting to Your Backend

Copy `.env.example` to `.env` and switch `VITE_API_MODE` to `http`:

```env
VITE_API_MODE=http
VITE_API_BASE_URL=http://localhost:3000/api
```

Because both `mockTransport` and `httpTransport` implement the same `ApiTransport` interface (`.get`, `.post`, `.patch`, `.delete`) and share one domain API layer in `src/lib/api/index.ts`, no hook or component code needs to change when switching to the live backend.
