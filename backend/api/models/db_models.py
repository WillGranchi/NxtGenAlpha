"""
Database models for user accounts and saved strategies.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

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

