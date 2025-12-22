# Bitcoin Trading Strategy Backtesting Tool

A comprehensive web application for building, testing, and saving Bitcoin trading strategies using technical indicators and boolean expressions. Features Google OAuth authentication, modular strategy builder, and detailed backtesting analytics.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Google account (for OAuth setup)
- 2GB+ RAM available

### Setup Steps

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd TradingPlat
   ```

2. **Configure environment**:
   ```bash
   # Option 1: Use interactive setup script (recommended)
   ./scripts/setup_env.sh
   
   # Option 2: Manual setup
   cp .env.example .env
   # Edit .env with your Google OAuth credentials
   ```

3. **Set up Google OAuth** (required for user authentication):
   - See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for detailed instructions
   - Add your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`

4. **Start the application**:
   ```bash
   docker compose up -d
   ```

5. **Initialize database**:
   ```bash
   ./scripts/init_db.sh
   ```

6. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Production Deployment

For deploying to Railway with your domain `nxtgenalpha.com`, see:

- **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** - Complete Railway deployment guide with step-by-step instructions, environment variables, verification checklist, and troubleshooting

### Quick Railway Deployment Checklist

1. ✅ Code pushed to GitHub
2. ✅ Procfile created
3. ⬜ Create Railway project and connect repo
4. ⬜ Add PostgreSQL database
5. ⬜ Configure environment variables
6. ⬜ Set up Google OAuth production credentials
7. ⬜ Configure domain nxtgenalpha.com
8. ⬜ Run database migrations
9. ⬜ Test deployment

See **RAILWAY_DEPLOYMENT.md** for detailed instructions and verification checklist.

## Documentation

### Setup & Deployment
- **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** - Step-by-step guide for configuring Google OAuth
- **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** - Complete Railway deployment guide (includes environment variables and verification checklist)
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Database configuration guide
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Docker installation and troubleshooting guide (if available)

### Troubleshooting
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Comprehensive troubleshooting guide covering authentication, API errors, CORS, frontend issues, and more

### Testing
- **[TESTING.md](./TESTING.md)** - Testing documentation and test scripts

### Architecture
- **[CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md)** - Comprehensive codebase structure and architecture documentation

## Authentication & User Accounts

The application supports Google OAuth for user authentication:

- **Guest Mode**: Users can test strategies without logging in
- **User Accounts**: Sign in with Google to save and manage your strategies
- **Strategy Saving**: Save your custom strategies with names and descriptions
- **Strategy Management**: Load, edit, delete, and duplicate saved strategies

### Setting Up Authentication

1. Follow the [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) guide
2. Configure your Google OAuth credentials in `.env`
3. Restart the backend: `docker compose restart backend`
4. Test login by clicking "Sign in with Google" in the UI

## 🚀 Features

- **Multiple Trading Strategies**: SMA, RSI, MACD, Bollinger Bands, and Combined strategies
- **Interactive Dashboard**: Modern React frontend with real-time charts and metrics
- **RESTful API**: FastAPI backend with comprehensive endpoints
- **Advanced Analytics**: Detailed performance metrics including Sharpe ratio, drawdown, and more
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Comprehensive Testing**: Full test suite with pytest
- **CI/CD Ready**: GitHub Actions workflow included

## 📋 Prerequisites

- Python 3.10+ (3.11 recommended)
- Node.js 18+ (for frontend development)
- Docker & Docker Compose (for containerized deployment)

## 🏗️ Architecture

```
TradingPlat/
├── backend/                    # FastAPI backend
│   ├── api/                   # API routes and models
│   ├── core/                  # Core trading logic
│   ├── utils/                 # Utilities and helpers
│   ├── data/                  # Bitcoin historical data
│   └── tests/                 # Backend tests
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API client
│   │   └── hooks/             # Custom React hooks
│   └── public/                # Static assets
├── docker-compose.yml         # Docker orchestration
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd TradingPlat

# Start with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

#### Backend Setup

```bash
# Kill any existing processes on port 8000
kill -9 $(lsof -ti:8000) 2>/dev/null

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
cd backend
uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify backend is running:**
- Should see: `INFO:     Uvicorn running on http://0.0.0.0:8000`
- Test endpoint: `curl http://localhost:8000/health`
- API docs: http://localhost:8000/docs

#### Frontend Setup

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Option 3: Using Makefile

```bash
# Install all dependencies
make install-dev

# Start both backend and frontend
make start

# Or start individually
make run-backend  # Backend only
make run-frontend # Frontend only
```

## 📊 Usage

### Web Dashboard

1. Open http://localhost:3000 in your browser
2. Select a trading strategy from the dropdown
3. Configure strategy parameters
4. Set initial capital and date range
5. Click "Run Backtest" to see results
6. View interactive charts and performance metrics

### API Usage

#### Get Data Information

```bash
curl http://localhost:8000/api/data/info
```

#### Get Available Strategies

```bash
curl http://localhost:8000/api/strategies
```

#### Run a Backtest

```bash
# SMA Strategy
curl -X POST http://localhost:8000/api/backtest \
     -H "Content-Type: application/json" \
     -d '{
       "strategy": "SMA",
       "parameters": {"fast_window": 50, "slow_window": 200},
       "initial_capital": 10000,
       "start_date": "2020-01-01",
       "end_date": "2023-12-31"
     }'

# RSI Strategy
curl -X POST http://localhost:8000/api/backtest \
     -H "Content-Type: application/json" \
     -d '{
       "strategy": "RSI",
       "parameters": {"rsi_period": 14, "oversold": 30, "overbought": 70},
       "initial_capital": 10000
     }'
```

#### JavaScript/Fetch Example

```javascript
// Run backtest
const response = await fetch('http://localhost:8000/api/backtest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    strategy: 'SMA',
    parameters: { fast_window: 50, slow_window: 200 },
    initial_capital: 10000
  })
});

const results = await response.json();
console.log(results);
```

## 🧪 Testing

### Run All Tests

```bash
make test
```

### Backend Tests Only

```bash
make test-backend
# or
cd backend && pytest tests/ -v
```

### Frontend Tests Only

```bash
make test-frontend
# or
cd frontend && npm test
```

### Test Coverage

```bash
cd backend && pytest tests/ --cov=core --cov=api --cov-report=html
```

## 🔧 Development

### Code Quality

```bash
# Lint code
make lint

# Format code
make format

# Clean generated files
make clean
```

### Adding New Strategies

1. Create strategy class in `backend/core/strategy.py`
2. Add to strategy mapping in `backend/api/routes/backtest.py`
3. Update strategy definitions in `backend/api/routes/strategies.py`
4. Add tests in `backend/tests/test_strategies.py`

### Adding New Metrics

1. Implement calculation in `backend/core/metrics.py`
2. Update `calculate_all_metrics()` function
3. Add to frontend `MetricsPanel` component
4. Add tests for new metric

## 📈 Available Strategies

### Simple Moving Average (SMA)
- **Type**: Trend Following
- **Parameters**: `fast_window`, `slow_window`
- **Logic**: Buy when fast SMA crosses above slow SMA

### Relative Strength Index (RSI)
- **Type**: Mean Reversion
- **Parameters**: `rsi_period`, `oversold`, `overbought`
- **Logic**: Buy when RSI is oversold, sell when overbought

### MACD
- **Type**: Trend Following
- **Parameters**: `fast_period`, `slow_period`, `signal_period`
- **Logic**: Buy when MACD line crosses above signal line

### Bollinger Bands
- **Type**: Mean Reversion
- **Parameters**: `period`, `std_dev`
- **Logic**: Buy when price touches lower band, sell at upper band

### Combined Strategy
- **Type**: Multi-Factor
- **Parameters**: `sma_weight`, `rsi_weight`, `macd_weight`, `bollinger_weight`
- **Logic**: Weighted combination of multiple indicators

## 📊 Performance Metrics

- **Total Return**: Overall portfolio return
- **CAGR**: Compound Annual Growth Rate
- **Sharpe Ratio**: Risk-adjusted return measure
- **Sortino Ratio**: Downside risk-adjusted return
- **Max Drawdown**: Maximum peak-to-trough decline
- **Win Rate**: Percentage of profitable trades
- **VaR/CVaR**: Value at Risk and Conditional VaR
- **Calmar Ratio**: Return to max drawdown ratio
- **Omega Ratio**: Probability-weighted return ratio

## 🐳 Docker Deployment

### Development

```bash
docker-compose up --build
```

### Production

```bash
# Build images
make build-docker

# Deploy
docker-compose up -d

# View logs
make logs

# Stop services
make stop-docker
```

## 🔍 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🛠️ Troubleshooting

For detailed troubleshooting guides, see **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**.

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process using port 8000
   lsof -ti:8000 | xargs kill -9
   ```

2. **Data file not found**
   - Ensure `Bitcoin Historical Data4.csv` is in `backend/data/`
   - Check file permissions
   - See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#data-file-issues)

3. **Frontend not connecting to backend**
   - Verify backend is running on port 8000
   - Check CORS settings in `backend/api/main.py`
   - See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#cors-issues)

4. **Docker build fails**
   ```bash
   # Clean Docker cache
   docker system prune -a
   docker-compose build --no-cache
   ```

5. **Authentication not working**
   - See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#authentication-issues)
   - Verify OAuth configuration in [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

6. **Backend 404 errors**
   - Check backend logs for startup errors
   - Verify backend service is running
   - See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#api-errors)

### Debug Mode

```bash
# Backend with debug logging
cd backend
uvicorn api.main:app --reload --log-level debug

# Frontend with verbose output
cd frontend
npm run dev -- --verbose
```

## 📝 Configuration

### Environment Variables

- `VITE_API_URL`: Frontend API base URL (default: http://localhost:8000)
- `PYTHONPATH`: Python path for imports

### Backend Configuration

Edit `backend/utils/helpers.py` for:
- Default strategy parameters
- Performance thresholds
- Output directory paths

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Frontend powered by [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Charts created with [Plotly.js](https://plotly.com/javascript/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the API documentation
3. Open an issue on GitHub
4. Check the test files for usage examples

---

**Happy Trading! 📈**