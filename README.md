# HabitFlow — Daily Habit Tracker

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Supabase account (free tier works)

## Project Structure

habitflow/
├── frontend/          # Next.js 14 app
├── backend/           # Express API server
├── package.json       # Root workspace config
└── .env.example       # Environment variable template

## Quick Start

### 1. Clone & Install

git clone https://github.com/your-org/habitflow.git
cd habitflow
npm install

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to **SQL Editor** and run the following schema:

-- Enable UUID extension
extension if not exists "uuid-ossp";

-- Profiles table (auto-created on auth signup)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Habits table
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  color text default '#6366f1',
  icon text default '✅',
  frequency text default 'daily',
  target_days integer default 7,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now()),
  is_archived boolean default false
);

-- Habit completions table
create table public.habit_completions (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(habit_id, completed_date)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Habits policies
create policy "Users can manage own habits" on public.habits
  for all using (auth.uid() = user_id);

-- Completions policies
create policy "Users can manage own completions" on public.habit_completions
  for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

3. Go to **Settings → API** and copy your Project URL and anon key
4. Go to **Settings → API** and also copy the service_role key (keep secret!)

### 3. Configure Environment Variables

cp .env.example .env
# Fill in your Supabase credentials and other values

### 4. Run the Backend

cd backend
npm install
npm run dev
# API runs on http://localhost:4000

### 5. Run the Frontend

cd frontend
npm install
npm run dev
# App runs on http://localhost:3000

### 6. Open the App

## Available Scripts

### Root
| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend concurrently |
| `npm run build` | Build frontend for production |
| `npm run lint` | Lint all workspaces |

### Frontend (`cd frontend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Backend (`cd backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express with nodemon (port 4000) |
| `npm run start` | Start production server |

## API Endpoints

### Auth (handled by Supabase client directly)
- Signup, login, logout via `@supabase/supabase-js`

### Habits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | Get all habits for user |
| POST | `/api/habits` | Create new habit |
| GET | `/api/habits/:id` | Get single habit |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |
| PATCH | `/api/habits/:id/archive` | Archive/unarchive habit |

### Completions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits/:id/completions` | Get completions for habit |
| POST | `/api/habits/:id/complete` | Mark habit complete for date |
| DELETE | `/api/habits/:id/complete` | Unmark habit completion |
| GET | `/api/completions/today` | Get today's completions |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/overview` | Get user habit statistics |
| GET | `/api/stats/streaks` | Get streak data for all habits |

## Features

- 🔐 **Authentication** — Supabase Auth with email/password
- ✅ **Daily Tracking** — Mark habits complete with one click
- 🔥 **Streaks** — Track current and longest streaks per habit
- 📊 **Progress Charts** — Weekly/monthly completion visualization
- 🎨 **Custom Habits** — Color and emoji customization
- 📱 **Responsive** — Mobile-first Tailwind CSS design
- 🌙 **Dark Mode** — System-preference aware theming
- 📅 **Calendar View** — See completion history on a calendar

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS 3 |
| Backend | Node.js + Express 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| State | React Query (TanStack) |
| Charts | Recharts |
| Icons | Lucide React |

## Deployment

### Frontend (Vercel)
cd frontend
npx vercel --prod
# Set environment variables in Vercel dashboard

### Backend (Railway / Render)
# Push to GitHub, connect repo to Railway or Render
# Set environment variables in platform dashboard
# Root directory: backend
# Start command: npm start

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

