"""
Database models for user accounts and saved strategies.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean, Float, Index, text, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta

Base = declarative_base()


class User(Base):
    """User account model."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)  # For email/password auth
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    theme = Column(String(20), default="dark", nullable=False)  # 'light' or 'dark'
    profile_picture_url = Column(String(500), nullable=True)  # URL to profile picture
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    strategies = relationship("Strategy", back_populates="user", cascade="all, delete-orphan")
    custom_indicators = relationship("CustomIndicator", back_populates="user", cascade="all, delete-orphan")
    valuations = relationship("Valuation", back_populates="user", cascade="all, delete-orphan")
    fullcycle_presets = relationship("FullCyclePreset", back_populates="user", cascade="all, delete-orphan")


class Strategy(Base):
    """Saved trading strategy model."""
    
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Strategy configuration stored as JSON
    indicators = Column(JSON, nullable=False)  # List of IndicatorConfig
    expressions = Column(JSON, nullable=False)  # {expression, long_expression, cash_expression, short_expression, strategy_type}
    parameters = Column(JSON, nullable=True)  # Additional parameters like initial_capital, date range, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="strategies")


class CustomIndicator(Base):
    """Custom Python indicator model."""
    
    __tablename__ = "custom_indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Indicator code and configuration
    code = Column(Text, nullable=False)  # Python code for the indicator function
    function_name = Column(String(255), nullable=False)  # Name of the function in the code
    parameters = Column(JSON, nullable=False)  # Parameter definitions: {name: {type, default, min, max, description}}
    conditions = Column(JSON, nullable=False)  # Condition definitions: {condition_name: description}
    
    # Metadata
    category = Column(String(50), default="Other", nullable=False)  # Momentum, Trend, Volatility, Volume, Other
    is_public = Column(Boolean, default=False, nullable=False)  # Whether indicator is publicly shareable
    
    # Validation and execution
    is_validated = Column(Boolean, default=False, nullable=False)  # Whether code has been validated
    validation_error = Column(Text, nullable=True)  # Error message if validation failed
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="custom_indicators")


class Valuation(Base):
    """Saved valuation configuration model."""
    
    __tablename__ = "valuations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Valuation configuration
    indicators = Column(JSON, nullable=False)  # List of selected indicator IDs
    zscore_method = Column(String(20), nullable=False)  # 'rolling' or 'all_time'
    rolling_window = Column(Integer, nullable=False)
    average_window = Column(Integer, nullable=True)  # Optional window for smoothing average
    show_average = Column(Boolean, default=False, nullable=False)
    overbought_threshold = Column(Float, nullable=False)
    oversold_threshold = Column(Float, nullable=False)
    symbol = Column(String(20), nullable=False)
    start_date = Column(String(20), nullable=True)
    end_date = Column(String(20), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="valuations")


class FullCyclePreset(Base):
    """Saved Full Cycle Model preset configuration."""
    
    __tablename__ = "fullcycle_presets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Preset configuration stored as JSON
    indicator_params = Column(JSON, nullable=False)  # {indicator_id: {param_name: value}}
    selected_indicators = Column(JSON, nullable=False)  # List of indicator IDs
    start_date = Column(String(20), nullable=True)
    end_date = Column(String(20), nullable=True)
    roc_days = Column(Integer, nullable=False, default=7)
    show_fundamental_average = Column(Boolean, default=True, nullable=False)
    show_technical_average = Column(Boolean, default=True, nullable=False)
    show_overall_average = Column(Boolean, default=True, nullable=False)
    sdca_in = Column(Float, nullable=False, default=-2.0)
    sdca_out = Column(Float, nullable=False, default=2.0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="fullcycle_presets")


class PriceData(Base):
    """Cryptocurrency price data model for storing OHLCV data."""
    
    __tablename__ = "price_data"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)  # e.g., "BTCUSDT"
    exchange = Column(String(50), nullable=False, index=True, default="Binance")  # e.g., "Binance"
    date = Column(DateTime, nullable=False, index=True)  # Date/timestamp for the price data
    
    # OHLCV data
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)  # Volume may be null for some sources
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Composite index for fast range queries: (symbol, exchange, date)
    # This index enables efficient queries like:
    # SELECT * FROM price_data WHERE symbol = ? AND exchange = ? AND date BETWEEN ? AND ? ORDER BY date
    # Partial index for recent data (last 30 days) for faster queries on recent data
    # Unique constraint prevents duplicate entries for same symbol/exchange/date combination
    # Note: Partial index will be created via migration script, not here (to avoid import-time evaluation issues)
    __table_args__ = (
        Index('idx_price_data_symbol_exchange_date', 'symbol', 'exchange', 'date'),
        UniqueConstraint('symbol', 'exchange', 'date', name='uq_price_data_symbol_exchange_date'),
    )

