# NxtGenAlpha (TradingPlat) - Codebase Overview

## Project Summary

**NxtGenAlpha** (deployed as `nxtgenalpha.com`) is a comprehensive Bitcoin trading strategy backtesting platform that allows users to:
- Build custom trading strategies using technical indicators
- Backtest strategies against historical cryptocurrency data
- Save and manage strategies (with user authentication)
- View detailed performance metrics and analytics
- Deploy strategies using boolean expressions

## Architecture

### Tech Stack

**Backend:**
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL (with SQLAlchemy ORM)
- **Authentication**: JWT tokens + Google OAuth
- **Data Processing**: Pandas, NumPy
- **Scheduling**: APScheduler (for daily data updates)

**Frontend:**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Plotly.js, Recharts
- **State Management**: React Context API
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod validation

**Deployment:**
- **Platform**: Railway.app
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (frontend), Uvicorn (backend)
- **Domain**: nxtgenalpha.com

---

## Backend Structure

### `/backend/api/` - API Layer

#### `main.py`
- FastAPI application entry point
- CORS configuration (supports multiple origins including nxtgenalpha.com)
- Database initialization on startup
- Scheduled data updates (daily at 2 AM UTC)
- Health check endpoints
- Global error handlers

#### Routes (`/backend/api/routes/`)

**`auth.py`** - Authentication & User Management
- `/api/auth/signup` - Email/password registration
- `/api/auth/login` - Email/password login
- `/api/auth/google/login` - Initiate Google OAuth
- `/api/auth/google/callback` - Handle OAuth callback
- `/api/auth/logout` - Clear auth cookie
- `/api/auth/me` - Get current user (supports guest mode)
- `/api/auth/theme` - Update user theme preference
- `/api/auth/profile` - Update user profile
- `/api/auth/change-password` - Change password

**`backtest.py`** - Backtesting Engine
- `/api/backtest/` - Run traditional strategy backtest (SMA, RSI, MACD, etc.)
- `/api/backtest/modular` - Run expression-based modular backtest
- `/api/backtest/validate-expression` - Validate expression syntax
- `/api/backtest/indicators` - Get available indicators metadata
- `/api/backtest/health` - Health check

**`strategies.py`** - Strategy Management
- `/api/strategies/` - Get available predefined strategies
- `/api/strategies/{name}` - Get strategy details
- `/api/strategies/saved/list` - List user's saved strategies
- `/api/strategies/saved/{id}` - Get/Update/Delete saved strategy
- `/api/strategies/saved/{id}/duplicate` - Duplicate strategy

**`data.py`** - Data Management
- `/api/data/info` - Get dataset information (date range, records, etc.)
- `/api/data/status` - Get data freshness status
- `/api/data/refresh` - Manually refresh data from Binance
- `/api/data/symbols` - Get available cryptocurrency symbols

### `/backend/core/` - Core Business Logic

**`strategy.py`** - Trading Strategy Implementations
- `SMAStrategy` - Simple Moving Average crossover
- `RSIStrategy` - RSI-based mean reversion
- `MACDStrategy` - MACD crossover
- `BollingerBandsStrategy` - Bollinger Bands mean reversion
- `CombinedStrategy` - Multi-indicator combination

**`backtest.py`** - Backtesting Engine
- `BacktestEngine` class - Core simulation engine
- Supports LONG, SHORT, and CASH positions
- Tracks equity curve, trades, and portfolio value
- Calculates trade logs with entry/exit pairs
- Handles transaction fees (default 0.1%)

**`indicators.py`** - Technical Indicators
- `sma()` - Simple Moving Average
- `ema()` - Exponential Moving Average
- `rsi()` - Relative Strength Index
- `macd()` - MACD indicator
- `bollinger_bands()` - Bollinger Bands
- `stochastic()` - Stochastic Oscillator
- `williams_r()` - Williams %R
- `atr()` - Average True Range

**`indicator_registry.py`** - Modular Indicator System
- Registry of available indicators with metadata
- Dynamic indicator computation
- Condition evaluation (e.g., "RSI oversold", "MACD cross up")
- Supports expression-based strategy building
- Categories: Momentum, Trend, Volatility, Other

**`metrics.py`** - Performance Metrics
- `calculate_all_metrics()` - Comprehensive metric calculation
- Returns: CAGR, Sharpe Ratio, Sortino Ratio, Max Drawdown, Win Rate, etc.
- Risk metrics: VaR, CVaR, Volatility, Skewness, Kurtosis
- Trade metrics: Profit Factor, Win Rate, Trade Count

**`data_loader.py`** - Data Loading & Management
- `load_crypto_data()` - Load cached cryptocurrency data
- `fetch_crypto_data_from_binance()` - Fetch from Binance API
- `fetch_btc_data_from_coingecko()` - Fallback to CoinGecko
- Automatic data caching and refresh logic
- Supports multiple symbols (BTCUSDT, ETHUSDT, etc.)

**`expression.py`** - Expression Parser
- `validate_expression()` - Validate boolean expression syntax
- `create_signal_series()` - Convert expression to trading signals
- Supports AND (&), OR (|), NOT (!) operators
- Condition-based signal generation

**`database.py`** - Database Connection
- SQLAlchemy engine and session management
- PostgreSQL connection pooling
- Database initialization
- Environment-based configuration

**`auth.py`** - Authentication Logic
- JWT token creation/validation
- Google OAuth flow handling
- Password hashing (bcrypt)
- User authentication dependencies

### `/backend/api/models/` - Data Models

**`db_models.py`** - Database Models
- `User` - User accounts (email, password_hash, google_id, theme)
- `Strategy` - Saved strategies (indicators, expressions, parameters)

**`backtest_models.py`** - API Request/Response Models
- `BacktestRequest`, `BacktestResponse`
- `ModularBacktestRequest`, `ModularBacktestResponse`
- `IndicatorConfig`, `ExpressionValidationRequest`
- `SaveStrategyRequest`, `StrategyResponse`

**`strategy_models.py`** - Strategy Definition Models
- `StrategyDefinition`, `StrategyParameter`
- `StrategyListResponse`

---

## Frontend Structure

### `/frontend/src/` - React Application

#### Entry Points
- `main.tsx` - Application entry point
- `App.tsx` - Root component with routing

#### Pages (`/frontend/src/pages/`)
- `LandingPage.tsx` - Public landing page
- `LoginPage.tsx` - Login form
- `SignupPage.tsx` - Registration form
- `DashboardPage.tsx` - Main strategy builder interface
- `StrategyLibraryPage.tsx` - Saved strategies library

#### Components (`/frontend/src/components/`)

**Layout:**
- `Layout.tsx` - Main app layout with navigation
- `Navigation.tsx` - Top navigation bar
- `ProtectedRoute.tsx` - Route protection wrapper

**Auth:**
- `AuthGuard.tsx` - Authentication guard component
- `LoginButton.tsx` - Google OAuth login button
- `ProfilePage.tsx` - User profile management

**Dashboard:**
- `Dashboard.tsx` - Main dashboard component
- `TokenSelector.tsx` - Cryptocurrency symbol selector
- `DateRangePicker.tsx` - Date range selection

**Strategy Builder:**
- `StrategyBuilder.tsx` - Main builder interface
- `IndicatorLibrary.tsx` - Available indicators panel
- `IndicatorNode.tsx` - Individual indicator node
- `FlowchartCanvas.tsx` - Visual strategy builder canvas
- `SidePanel.tsx` - Strategy configuration panel
- `ExpressionBuilder.tsx` - Boolean expression builder
- `VisualConditionBuilder.tsx` - Visual condition builder

**Results:**
- `ResultsSection.tsx` - Backtest results display
- `MetricsPanel.tsx` - Performance metrics display
- `MetricsCard.tsx` - Individual metric card
- `EquityChart.tsx` - Equity curve visualization
- `PriceChart.tsx` - Price chart with indicators
- `TradeLogTable.tsx` - Trade log table

**Strategy Management:**
- `StrategySelector.tsx` - Strategy selection dropdown
- `StrategyManager.tsx` - Strategy CRUD operations
- `SaveStrategyModal.tsx` - Save strategy dialog
- `StrategyDescription.tsx` - Strategy description display

**UI Components (`/frontend/src/components/ui/`):**
- `Button.tsx`, `Card.tsx`, `Input.tsx`
- `Accordion.tsx`, `Toast.tsx`

#### Services (`/frontend/src/services/`)
- `api.ts` - API client (axios-based)
  - `TradingAPI` class with all API methods
  - Request/response interceptors
  - Error handling and logging
  - Mixed content detection

#### Contexts (`/frontend/src/contexts/`)
- `AuthContext.tsx` - Authentication state management
  - User session management
  - Login/logout functions
  - Guest mode support

#### Hooks (`/frontend/src/hooks/`)
- Custom React hooks for data fetching and state management

#### Theme (`/frontend/src/theme/`)
- Theme configuration (light/dark mode)
- Tailwind CSS configuration

---

## Key Features

### 1. Modular Strategy Builder
- Drag-and-drop indicator selection
- Visual flowchart builder
- Boolean expression builder
- Support for LONG/CASH and LONG/SHORT strategies
- Real-time expression validation

### 2. Backtesting Engine
- Historical data simulation
- Multiple position types (LONG, SHORT, CASH)
- Transaction fee calculation
- Comprehensive performance metrics
- Trade log with entry/exit pairs

### 3. User Authentication
- Email/password authentication
- Google OAuth integration
- Guest mode (no login required for testing)
- JWT token-based sessions
- HTTP-only cookies for security

### 4. Strategy Management
- Save strategies with names and descriptions
- Load, edit, delete, and duplicate strategies
- User-specific strategy library
- Strategy versioning support

### 5. Data Management
- Automatic data fetching from Binance API
- Daily scheduled updates (2 AM UTC)
- Manual refresh capability
- Multiple cryptocurrency support
- Data caching for performance

### 6. Performance Analytics
- Comprehensive metrics:
  - Returns: Total Return, CAGR
  - Risk: Sharpe Ratio, Sortino Ratio, Max Drawdown
  - Trade Metrics: Win Rate, Profit Factor
  - Advanced: VaR, CVaR, Omega Ratio, Calmar Ratio
- Interactive charts (equity curve, price charts)
- Trade log with detailed entry/exit information

---

## Database Schema

### Users Table
```sql
- id (PK)
- email (unique)
- name
- password_hash (nullable, for email/password auth)
- google_id (nullable, unique, for OAuth)
- theme ('light' or 'dark')
- created_at
- updated_at
```

### Strategies Table
```sql
- id (PK)
- user_id (FK -> users.id)
- name
- description
- indicators (JSON) - Array of IndicatorConfig
- expressions (JSON) - {expression, long_expression, cash_expression, short_expression, strategy_type}
- parameters (JSON) - Additional parameters
- created_at
- updated_at
```

---

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `JWT_SECRET_KEY` - JWT signing secret
- `FRONTEND_URL` - Frontend URL (https://nxtgenalpha.com)
- `BACKEND_URL` - Backend URL
- `CORS_ORIGINS` - Comma-separated allowed origins
- `ENVIRONMENT` - 'development' or 'production'
- `COOKIE_SECURE` - Cookie secure flag
- `COOKIE_SAMESITE` - Cookie SameSite policy

### Frontend
- `VITE_API_URL` - Backend API URL (https://nxtgenalpha.com)

---

## Deployment Architecture

### Railway.app Setup
- **Frontend Service**: React app served via Nginx
- **Backend Service**: FastAPI app via Uvicorn
- **Database Service**: PostgreSQL (Railway managed)

### Docker Configuration
- `Dockerfile.backend` - Backend container
- `Dockerfile.frontend` - Frontend container
- `docker-compose.yml` - Local development setup

### Domain Configuration
- Custom domain: `nxtgenalpha.com`
- SSL certificates managed by Railway
- CORS configured for production domain

---

## Development Workflow

### Local Development
1. Start PostgreSQL (via Docker Compose)
2. Set up environment variables (.env file)
3. Run backend: `uvicorn api.main:app --reload`
4. Run frontend: `npm run dev`

### Testing
- Backend tests: `pytest tests/`
- Frontend tests: `npm test`
- Integration tests available

### Code Quality
- Backend: Black, Flake8, MyPy
- Frontend: ESLint, TypeScript strict mode

---

## Key Design Patterns

1. **Repository Pattern**: Database models separated from business logic
2. **Dependency Injection**: FastAPI dependencies for DB sessions, auth
3. **Factory Pattern**: Strategy classes created dynamically
4. **Registry Pattern**: Indicator registry for modular system
5. **Observer Pattern**: React Context for state management
6. **Builder Pattern**: Strategy builder UI components

---

## Security Considerations

1. **Authentication**: JWT tokens in HTTP-only cookies
2. **CORS**: Strict origin validation
3. **Password Security**: Bcrypt hashing with 72-byte limit
4. **SQL Injection**: SQLAlchemy ORM prevents injection
5. **XSS Protection**: React's built-in escaping
6. **HTTPS**: Enforced in production (mixed content detection)

---

## Performance Optimizations

1. **Data Caching**: LRU cache for cryptocurrency data
2. **Lazy Loading**: React code splitting
3. **Connection Pooling**: PostgreSQL connection pool
4. **Batch Processing**: Efficient pandas operations
5. **Debouncing**: Expression validation debounced

---

## Future Enhancement Areas

1. **Real-time Trading**: Live strategy execution
2. **Paper Trading**: Simulated live trading
3. **More Indicators**: Additional technical indicators
4. **Multi-asset Support**: Beyond Bitcoin
5. **Strategy Sharing**: Public strategy marketplace
6. **Advanced Analytics**: More sophisticated metrics
7. **Backtesting Optimization**: Parallel processing
8. **Mobile App**: React Native version

---

## File Organization Summary

```
TradingPlat/
├── backend/
│   ├── api/              # API routes and models
│   ├── core/             # Business logic
│   ├── data/             # Historical data files
│   ├── tests/            # Backend tests
│   └── utils/            # Utilities
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/    # API client
│   │   ├── contexts/     # React contexts
│   │   └── hooks/        # Custom hooks
│   └── dist/             # Build output
├── scripts/              # Utility scripts
├── outputs/              # Generated reports/logs
├── docker-compose.yml    # Docker setup
├── requirements.txt      # Python dependencies
└── README.md             # Project documentation
```

---

## Contact & Support

For questions or issues:
1. Check troubleshooting documentation
2. Review API documentation at `/docs`
3. Check test files for usage examples
4. Review deployment guides for production setup

---

**Last Updated**: Based on current codebase structure
**Version**: 1.0.0
**Deployment**: Railway.app (nxtgenalpha.com)

