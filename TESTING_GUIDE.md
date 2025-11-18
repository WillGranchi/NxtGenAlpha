# Testing Guide - Trading Platform UI/UX Enhancement

## What's Been Implemented

### ✅ Completed Features

1. **Design System**
   - Dark mode theme with blue/purple color palette
   - Typography system (Inter + JetBrains Mono)
   - Reusable UI components (Button, Card, Input, Accordion)
   - Smooth animations and transitions

2. **Routing & Navigation**
   - React Router setup
   - Landing page (`/`)
   - Login page (`/login`)
   - Signup page (`/signup`)
   - Dashboard page (`/dashboard`) - protected route
   - Strategy Library page (`/library`) - protected route

3. **Landing Page**
   - Hero section with gradient background
   - Accordion sections:
     - Features
     - How It Works
     - Pricing
     - Examples & Demos
     - Testimonials
   - Footer with links

4. **Authentication System**
   - Email/password signup
   - Email/password login
   - JWT token-based authentication
   - Protected routes
   - User session management

5. **UI Components**
   - Modern button variants (primary, secondary, ghost, danger)
   - Card components with glassmorphism
   - Form inputs with validation
   - Accordion for collapsible sections

## How to Test

### 1. Start the Development Server

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:5173` (or another port if 5173 is taken).

### 2. Start the Backend (Required for Authentication)

```bash
# Make sure you're in the project root
# Activate your virtual environment if needed
cd backend
uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

Or if using Railway/production, the backend should already be running.

### 3. Database Migration

Before testing authentication, you need to add the `password_hash` column to the users table:

**Option A: Using Alembic (Recommended)**
```bash
cd backend
alembic revision --autogenerate -m "add password_hash to users"
alembic upgrade head
```

**Option B: Manual Migration**
```bash
cd backend
python migrations/add_password_hash.py
```

### 4. Testing Checklist

#### Landing Page (`http://localhost:5173/`)

- [ ] **Hero Section**
  - Verify gradient background appears
  - Check "Get Started" and "Sign In" buttons work
  - Buttons should navigate correctly

- [ ] **Accordion Sections**
  - Click each accordion item (Features, How It Works, Pricing, etc.)
  - Verify smooth open/close animations
  - Check content displays correctly
  - Only one section should be open at a time (unless clicking the same one)

- [ ] **Design System**
  - Verify dark mode is applied (pure black background)
  - Check blue/purple gradient colors on buttons
  - Verify typography looks clean and modern
  - Check hover effects on interactive elements

#### Signup Page (`http://localhost:5173/signup`)

- [ ] **Form Validation**
  - Try submitting empty form (should show validation errors)
  - Enter mismatched passwords (should show error)
  - Enter password < 8 characters (should show error)
  - Enter valid email format

- [ ] **Signup Flow**
  - Fill in all fields correctly
  - Submit form
  - Should create account and redirect to `/dashboard`
  - Check browser console for any errors

- [ ] **UI Elements**
  - Verify input fields have dark theme styling
  - Check error messages display correctly
  - Verify loading state on button during submission

#### Login Page (`http://localhost:5173/login`)

- [ ] **Login Flow**
  - Enter email and password from signup
  - Submit form
  - Should authenticate and redirect to `/dashboard`
  - Check that user data loads correctly

- [ ] **Error Handling**
  - Try wrong password (should show error)
  - Try non-existent email (should show error)
  - Verify error messages are user-friendly

#### Dashboard (`http://localhost:5173/dashboard`)

- [ ] **Protected Route**
  - Try accessing `/dashboard` without logging in
  - Should redirect to `/login`

- [ ] **Navigation**
  - Check sidebar navigation appears
  - Verify active route highlighting
  - Check user profile section in sidebar
  - Test logout button

- [ ] **Layout**
  - Verify dark theme is consistent
  - Check card-based layout
  - Verify responsive design (resize browser)

#### Strategy Library (`http://localhost:5173/library`)

- [ ] **Protected Route**
  - Should require authentication
  - Should show placeholder content

### 5. Browser Console Checks

Open browser DevTools (F12) and check:

- [ ] No TypeScript errors
- [ ] No React errors
- [ ] No network errors (CORS, 404s, etc.)
- [ ] API calls are being made correctly
- [ ] JWT tokens are being stored in cookies/localStorage

### 6. Known Issues to Watch For

1. **Database Migration**: If you see "column password_hash does not exist", run the migration first.

2. **CORS Errors**: Make sure `VITE_API_URL` is set correctly in frontend `.env` file:
   ```
   VITE_API_URL=http://localhost:8000
   ```

3. **Backend Not Running**: Authentication won't work if backend is not running.

4. **Port Conflicts**: If 5173 is taken, Vite will use the next available port.

## Testing Authentication Flow

### Complete User Journey

1. **Visit Landing Page** → Click "Get Started"
2. **Signup Page** → Fill form → Create account
3. **Auto-redirect to Dashboard** → Should see navigation sidebar
4. **Click "Strategy Library"** → Should navigate correctly
5. **Click "Logout"** → Should redirect to landing page
6. **Click "Sign In"** → Login with same credentials
7. **Should authenticate and redirect to Dashboard**

## Visual Design Checks

- [ ] Dark mode is pure black (#0A0A0A) not gray
- [ ] Blue/purple gradients on primary buttons
- [ ] Smooth transitions on hover/click
- [ ] Cards have subtle borders and shadows
- [ ] Text is readable (high contrast)
- [ ] Icons from Lucide React display correctly
- [ ] Responsive on mobile (test with browser dev tools)

## Next Steps After Testing

Once you've verified everything works:

1. **Report any bugs or issues**
2. **Note any design inconsistencies**
3. **Suggest improvements**
4. **Ready for next phase**: Drag-and-drop builder implementation

## Quick Commands Reference

```bash
# Frontend dev server
cd frontend && npm run dev

# Backend server
cd backend && uvicorn backend.api.main:app --reload

# Database migration
cd backend && alembic upgrade head

# Build for production
cd frontend && npm run build
```

