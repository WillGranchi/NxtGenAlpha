<!-- 369808fd-ce2c-4749-bda0-1c1b8b0c220b 3cc24b06-6e58-4880-a0f6-94643f85b93e -->
# Trading Platform UI/UX Enhancement Plan

## Overview

Transform the trading platform into a modern, professional tool with Sabbiera-inspired colors, QuantCode's minimal aesthetic, drag-and-drop strategy builder, and comprehensive features for both beginners and advanced quants.

## Design System

### Color Palette

- **Primary**: Blue (#3B82F6, #6366F1) - Futuristic blue tones
- **Secondary**: Purple (#8B5CF6, #A855F7) - Vibrant purple accents
- **Background**: Pure dark (#0A0A0A, #111111) - Deep black base
- **Text**: Light grays (#E5E7EB, #F3F4F6) - High contrast
- **Accents**: Cyan (#06B6D4) - Highlight color for interactive elements

### Typography

- **Primary Font**: Inter (current) - Modern, clean
- **Code Font**: JetBrains Mono or Fira Code - For code blocks
- **Headings**: Bold, larger sizes with gradient text effects

### Components

- Card-based layouts with subtle borders/glows
- Smooth animations and transitions
- Glassmorphism effects for modals
- Gradient accents on buttons and highlights

## Phase 1: Foundation & Design System

### 1.1 Design System Implementation

- Create theme configuration (dark mode only for now)
- Define color palette with CSS variables
- Set up typography scale
- Create reusable component library (buttons, cards, inputs)
- Add animation utilities (fade, slide, scale)

### 1.2 Routing & Layout Structure

- Set up React Router for multi-page navigation
- Create landing page route (`/`)
- Create dashboard route (`/dashboard`)
- Create protected route wrapper for authenticated pages
- Add navigation component (sidebar or top nav)

## Phase 2: Landing Page

### 2.1 Hero Section

- Large hero with headline and CTA
- Animated background (gradient mesh or particles)
- "Get Started" button leading to signup

### 2.2 Accordion Sections

- **Features**: Key platform features with icons
- **How It Works**: Step-by-step process (4-5 steps)
- **Pricing**: Pricing tiers (Free, Pro, Enterprise)
- **Examples/Demos**: Strategy examples with previews
- **Testimonials**: User testimonials (if available)

### 2.3 Live Demo Section

- Interactive preview of strategy builder
- Embedded chart examples
- "Try It Free" CTA

### 2.4 Footer

- Links, social media, legal pages

## Phase 3: Authentication System

### 3.1 Email/Password Authentication

- Signup page with email/password
- Login page
- Password reset flow
- Email verification (optional for MVP)

### 3.2 Backend API Updates

- Add email/password endpoints
- Password hashing (bcrypt)
- JWT token generation
- User registration/login routes

### 3.3 User Data Persistence

- Save user accounts to database
- Link strategies to user accounts
- User profile management

### 3.4 Auth UI Components

- Modern login/signup forms
- Error handling and validation
- Loading states
- Success messages

## Phase 4: Drag-and-Drop Strategy Builder

### 4.1 Drag-and-Drop Library Setup

- Install and configure React Beautiful DnD (or React DnD)
- Set up drag context providers
- Create draggable indicator components

### 4.2 Flowchart Canvas

- Create flowchart-style canvas component
- Node-based indicator representation
- Connection lines between indicators
- Zoom and pan functionality
- Grid/snap-to-grid option

### 4.3 Indicator Library Panel

- Replace current indicator catalog
- Draggable indicator cards
- Search and filter indicators
- Category grouping
- Indicator descriptions/tooltips

### 4.4 Side Panel Configuration

- Open side panel when indicator selected
- Parameter inputs for selected indicator
- Visual parameter sliders/inputs
- Real-time preview of changes
- Save/cancel actions

### 4.5 Strategy Logic Flow

- Visual representation of strategy logic
- Conditional connections (if/then)
- Entry/exit signal visualization
- Strategy validation before backtest

## Phase 5: Enhanced Visualizations

### 5.1 Chart Library Migration

- Replace Plotly with Recharts (or Chart.js)
- Implement responsive chart components
- Add dark mode styling to charts
- Smooth animations and transitions

### 5.2 Chart Enhancements

- Enhanced price charts with better styling
- Equity curve improvements
- Drawdown visualization
- Trade markers on charts
- Interactive tooltips

### 5.3 Strategy Comparison

- Overlay charts (tabbed view)
- Side-by-side metrics table
- Buy-and-hold baseline option (toggle on/off)
- Compare up to 3 strategies
- Performance delta calculations

### 5.4 Real-Time Backtesting Progress

- Progress bar with percentage
- Step-by-step status messages
- Estimated time remaining
- Cancel backtest button
- Live chart updates (if feasible)

## Phase 6: Strategy Library & Marketplace

### 6.1 Strategy Storage

- Save strategies to database
- Link strategies to users
- Private/public visibility toggle
- Strategy metadata (name, description, tags)

### 6.2 Strategy Library UI

- Library page/component
- Grid/list view toggle
- Search and filter functionality
- Category/tag filtering
- Sort options (newest, performance, popularity)

### 6.3 Public Marketplace

- Public strategy gallery
- Strategy cards with preview
- Performance metrics display
- Author attribution
- Like/favorite functionality

### 6.4 Strategy Details

- Strategy detail page
- Full backtest results
- Strategy code/view
- Comments/reviews section
- Share functionality

### 6.5 Leaderboard

- Top performing strategies
- Categories (Sharpe, returns, etc.)
- Time period filters
- User rankings

## Phase 7: Onboarding & User Experience

### 7.1 Quick Start Template

- Pre-configured strategy template
- One-click "Get Started" flow
- Guided first backtest
- Success celebration

### 7.2 Beginner/Advanced Mode Toggle

- Mode selector in dashboard
- Simplified UI for beginners
- Advanced features hidden in beginner mode
- Progressive disclosure

### 7.3 Tooltips & Help

- Contextual tooltips
- Help icons with explanations
- Keyboard shortcuts guide
- Video tutorials (future)

### 7.4 Error Handling

- User-friendly error messages
- Validation feedback
- Loading states
- Empty states with CTAs

## Phase 8: Dashboard Redesign

### 8.1 Dashboard Layout

- Modern card-based layout
- Responsive grid system
- Collapsible sections
- Customizable widget positions (future)

### 8.2 Navigation

- Sidebar navigation (or top nav)
- Active route highlighting
- Quick actions menu
- User profile dropdown

### 8.3 Dashboard Sections

- Strategy builder (main focus)
- Recent backtests
- Saved strategies
- Performance overview
- Quick actions

## Technical Implementation Details

### Libraries & Tools

- **Drag-and-Drop**: React Beautiful DnD (scalable, good performance)
- **Charts**: Recharts (React-native, good dark mode support)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion
- **Icons**: Lucide React or Heroicons

### Backend Updates Needed

- Email/password auth endpoints
- Strategy CRUD operations
- User profile management
- Strategy sharing/publication
- Ratings/reviews system
- Leaderboard calculations

### Database Schema Updates

- User table (email, password hash, profile)
- Strategy table (user_id, visibility, metadata)
- Strategy ratings/reviews table
- User preferences table

## File Structure Changes

```
frontend/src/
├── pages/
│   ├── LandingPage.tsx (new)
│   ├── Dashboard.tsx (redesigned)
│   ├── Login.tsx (new)
│   ├── Signup.tsx (new)
│   ├── StrategyLibrary.tsx (new)
│   └── StrategyDetail.tsx (new)
├── components/
│   ├── builder/
│   │   ├── FlowchartCanvas.tsx (new)
│   │   ├── IndicatorNode.tsx (new)
│   │   ├── ConnectionLine.tsx (new)
│   │   └── IndicatorLibrary.tsx (redesigned)
│   ├── charts/
│   │   ├── EnhancedPriceChart.tsx (new)
│   │   ├── ComparisonChart.tsx (new)
│   │   └── ProgressIndicator.tsx (new)
│   ├── comparison/
│   │   ├── StrategyComparison.tsx (new)
│   │   └── MetricsTable.tsx (new)
│   └── library/
│       ├── StrategyCard.tsx (new)
│       ├── StrategyGrid.tsx (new)
│       └── SearchFilters.tsx (new)
├── theme/
│   ├── colors.ts (new)
│   ├── typography.ts (new)
│   └── animations.ts (new)
└── hooks/
    ├── useDragAndDrop.ts (new)
    ├── useStrategyComparison.ts (new)
    └── useBacktestProgress.ts (new)
```

## Implementation Order

1. **Phase 1**: Design system and routing (foundation)
2. **Phase 3**: Authentication (needed for saving strategies)
3. **Phase 2**: Landing page (marketing/public face)
4. **Phase 4**: Drag-and-drop builder (core feature)
5. **Phase 5**: Enhanced visualizations (improve results)
6. **Phase 6**: Strategy library (save/share strategies)
7. **Phase 7**: Onboarding (improve UX)
8. **Phase 8**: Dashboard polish (final touches)

## Success Metrics

- User signup rate
- Strategy creation rate
- Strategy sharing/publication rate
- User retention
- Time to first backtest
- User satisfaction (future surveys)

### To-dos

- [ ] Create design system with dark mode theme, color palette (blue/purple), typography, and reusable components
- [ ] Set up React Router with landing page, dashboard, and protected routes
- [ ] Build landing page with hero section, accordion sections (features, how it works, pricing, examples, testimonials), and live demo
- [ ] Implement email/password authentication endpoints in backend (signup, login, password reset)
- [ ] Create login and signup pages with email/password forms, validation, and error handling
- [ ] Implement user account saving and strategy linking to user accounts in database
- [ ] Install and configure React Beautiful DnD, create drag context and draggable components
- [ ] Build flowchart-style canvas with nodes, connections, zoom/pan, and grid snapping
- [ ] Replace indicator catalog with draggable indicator cards in library panel
- [ ] Create side panel for indicator configuration with parameter inputs and real-time preview
- [ ] Migrate from Plotly to Recharts, implement dark mode styling and responsive charts
- [ ] Enhance price charts, equity curves, add trade markers and interactive tooltips
- [ ] Build strategy comparison with overlay charts (tabbed), side-by-side metrics, and buy-and-hold toggle
- [ ] Implement real-time backtesting progress bar with percentage, status messages, and cancel button
- [ ] Implement strategy saving to database with user linking and private/public visibility
- [ ] Build strategy library page with grid/list view, search, filter, categories, and sorting
- [ ] Implement public marketplace with strategy cards, ratings/reviews, and leaderboard
- [ ] Create quick start template with pre-configured strategy and guided first backtest flow
- [ ] Implement beginner/advanced mode toggle with simplified UI and progressive disclosure
- [ ] Redesign dashboard with modern card layout, navigation, and improved sections organization