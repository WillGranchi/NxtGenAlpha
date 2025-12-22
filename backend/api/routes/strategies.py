"""
Strategy API routes for Bitcoin trading strategy backtesting.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import logging

from backend.api.models.strategy_models import StrategyListResponse, StrategyDefinition, StrategyParameter
from backend.api.models.backtest_models import (
    SaveStrategyRequest,
    UpdateStrategyRequest,
    StrategyResponse,
    StrategyListResponse as SavedStrategyListResponse,
    StrategyListItem,
)
from backend.core.database import get_db
from backend.core.auth import get_current_user
from backend.api.models.db_models import Strategy, User
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/strategies", tags=["strategies"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=StrategyListResponse)
async def get_available_strategies() -> StrategyListResponse:
    """
    Get list of available trading strategies and their parameters.
    
    Returns:
        StrategyListResponse: Available strategies with parameter schemas
    """
    try:
        strategies = {
            "SMA": StrategyDefinition(
                name="Simple Moving Average Crossover",
                description="Buy when fast SMA crosses above slow SMA, sell when it crosses below",
                category="Trend Following",
                parameters={
                    "fast_window": StrategyParameter(
                        type="int",
                        min=5,
                        max=50,
                        default=20,
                        description="Fast moving average period"
                    ),
                    "slow_window": StrategyParameter(
                        type="int",
                        min=50,
                        max=200,
                        default=50,
                        description="Slow moving average period"
                    )
                }
            ),
            "RSI": StrategyDefinition(
                name="Relative Strength Index",
                description="Buy when RSI is oversold, sell when RSI is overbought",
                category="Mean Reversion",
                parameters={
                    "rsi_period": StrategyParameter(
                        type="int",
                        min=5,
                        max=30,
                        default=14,
                        description="RSI calculation period"
                    ),
                    "oversold": StrategyParameter(
                        type="int",
                        min=10,
                        max=40,
                        default=30,
                        description="Oversold threshold"
                    ),
                    "overbought": StrategyParameter(
                        type="int",
                        min=60,
                        max=90,
                        default=70,
                        description="Overbought threshold"
                    )
                }
            ),
            "MACD": StrategyDefinition(
                name="MACD Crossover",
                description="Buy when MACD line crosses above signal line, sell when it crosses below",
                category="Trend Following",
                parameters={
                    "fast": StrategyParameter(
                        type="int",
                        min=5,
                        max=20,
                        default=12,
                        description="Fast EMA period"
                    ),
                    "slow": StrategyParameter(
                        type="int",
                        min=20,
                        max=50,
                        default=26,
                        description="Slow EMA period"
                    ),
                    "signal": StrategyParameter(
                        type="int",
                        min=5,
                        max=15,
                        default=9,
                        description="Signal line period"
                    )
                }
            ),
            "Bollinger": StrategyDefinition(
                name="Bollinger Bands",
                description="Buy when price touches lower band, sell when it touches upper band",
                category="Mean Reversion",
                parameters={
                    "window": StrategyParameter(
                        type="int",
                        min=10,
                        max=50,
                        default=20,
                        description="Moving average period"
                    ),
                    "num_std": StrategyParameter(
                        type="float",
                        min=1.0,
                        max=3.0,
                        default=2.0,
                        description="Standard deviation multiplier"
                    )
                }
            ),
            "Combined": StrategyDefinition(
                name="Combined Strategy",
                description="Combined strategy using SMA and RSI indicators",
                category="Multi-Factor",
                parameters={
                    "sma_fast": StrategyParameter(
                        type="int",
                        min=10,
                        max=100,
                        default=50,
                        description="Fast SMA period"
                    ),
                    "sma_slow": StrategyParameter(
                        type="int",
                        min=100,
                        max=300,
                        default=200,
                        description="Slow SMA period"
                    ),
                    "rsi_period": StrategyParameter(
                        type="int",
                        min=5,
                        max=30,
                        default=14,
                        description="RSI calculation period"
                    ),
                    "rsi_oversold": StrategyParameter(
                        type="int",
                        min=10,
                        max=40,
                        default=30,
                        description="RSI oversold threshold"
                    ),
                    "rsi_overbought": StrategyParameter(
                        type="int",
                        min=60,
                        max=90,
                        default=70,
                        description="RSI overbought threshold"
                    )
                }
            )
        }
        
        logger.info(f"Strategy list requested: {len(strategies)} strategies available")
        
        return StrategyListResponse(
            success=True,
            strategies=strategies,
            total_count=len(strategies)
        )
        
    except Exception as e:
        logger.error(f"Error getting strategies: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting strategies: {str(e)}"
        )


@router.get("/{strategy_name}")
async def get_strategy_details(strategy_name: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific strategy.
    
    Args:
        strategy_name: Name of the strategy
        
    Returns:
        Dict[str, Any]: Strategy details
    """
    try:
        # Get all strategies first
        strategies_response = await get_available_strategies()
        
        if strategy_name not in strategies_response.strategies:
            raise HTTPException(
                status_code=404,
                detail=f"Strategy '{strategy_name}' not found"
            )
        
        strategy = strategies_response.strategies[strategy_name]
        
        return {
            "success": True,
            "strategy": strategy.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting strategy details for {strategy_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting strategy details: {str(e)}"
        )


# Saved Strategy CRUD Routes

@router.get("/saved/list", response_model=SavedStrategyListResponse)
async def list_saved_strategies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SavedStrategyListResponse:
    """
    List all saved strategies for the current user.
    """
    try:
        strategies = db.query(Strategy).filter(Strategy.user_id == current_user.id).order_by(Strategy.updated_at.desc()).all()
        
        strategy_items = [
            StrategyListItem(
                id=strategy.id,
                name=strategy.name,
                description=strategy.description,
                created_at=strategy.created_at.isoformat() if strategy.created_at else "",
                updated_at=strategy.updated_at.isoformat() if strategy.updated_at else ""
            )
            for strategy in strategies
        ]
        
        return SavedStrategyListResponse(
            success=True,
            strategies=strategy_items
        )
    except Exception as e:
        logger.error(f"Error listing saved strategies: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing saved strategies: {str(e)}"
        )


@router.get("/saved/{strategy_id}", response_model=StrategyResponse)
async def get_saved_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StrategyResponse:
    """
    Get a specific saved strategy by ID.
    """
    try:
        strategy = db.query(Strategy).filter(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id
        ).first()
        
        if not strategy:
            raise HTTPException(
                status_code=404,
                detail=f"Strategy with ID {strategy_id} not found"
            )
        
        return StrategyResponse(
            id=strategy.id,
            name=strategy.name,
            description=strategy.description,
            indicators=strategy.indicators,
            expressions=strategy.expressions,
            parameters=strategy.parameters,
            created_at=strategy.created_at.isoformat() if strategy.created_at else "",
            updated_at=strategy.updated_at.isoformat() if strategy.updated_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting saved strategy {strategy_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting saved strategy: {str(e)}"
        )


@router.post("/saved", response_model=StrategyResponse, status_code=201)
async def save_strategy(
    request: SaveStrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StrategyResponse:
    """
    Save a new strategy.
    """
    try:
        # Check if strategy with same name already exists for this user
        existing = db.query(Strategy).filter(
            Strategy.user_id == current_user.id,
            Strategy.name == request.name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Strategy with name '{request.name}' already exists"
            )
        
        strategy = Strategy(
            user_id=current_user.id,
            name=request.name,
            description=request.description,
            indicators=[ind.dict() for ind in request.indicators],
            expressions=request.expressions,
            parameters=request.parameters
        )
        
        db.add(strategy)
        db.commit()
        db.refresh(strategy)
        
        logger.info(f"Strategy '{request.name}' saved for user {current_user.id}")
        
        return StrategyResponse(
            id=strategy.id,
            name=strategy.name,
            description=strategy.description,
            indicators=strategy.indicators,
            expressions=strategy.expressions,
            parameters=strategy.parameters,
            created_at=strategy.created_at.isoformat() if strategy.created_at else "",
            updated_at=strategy.updated_at.isoformat() if strategy.updated_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving strategy: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error saving strategy: {str(e)}"
        )


@router.put("/saved/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    request: UpdateStrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StrategyResponse:
    """
    Update an existing saved strategy.
    """
    try:
        strategy = db.query(Strategy).filter(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id
        ).first()
        
        if not strategy:
            raise HTTPException(
                status_code=404,
                detail=f"Strategy with ID {strategy_id} not found"
            )
        
        # Check if new name conflicts with another strategy
        if request.name and request.name != strategy.name:
            existing = db.query(Strategy).filter(
                Strategy.user_id == current_user.id,
                Strategy.name == request.name,
                Strategy.id != strategy_id
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Strategy with name '{request.name}' already exists"
                )
        
        # Update fields
        if request.name is not None:
            strategy.name = request.name
        if request.description is not None:
            strategy.description = request.description
        if request.indicators is not None:
            strategy.indicators = [ind.dict() for ind in request.indicators]
        if request.expressions is not None:
            strategy.expressions = request.expressions
        if request.parameters is not None:
            strategy.parameters = request.parameters
        
        db.commit()
        db.refresh(strategy)
        
        logger.info(f"Strategy {strategy_id} updated for user {current_user.id}")
        
        return StrategyResponse(
            id=strategy.id,
            name=strategy.name,
            description=strategy.description,
            indicators=strategy.indicators,
            expressions=strategy.expressions,
            parameters=strategy.parameters,
            created_at=strategy.created_at.isoformat() if strategy.created_at else "",
            updated_at=strategy.updated_at.isoformat() if strategy.updated_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating strategy {strategy_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating strategy: {str(e)}"
        )


@router.delete("/saved/{strategy_id}", status_code=204)
async def delete_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a saved strategy.
    """
    try:
        strategy = db.query(Strategy).filter(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id
        ).first()
        
        if not strategy:
            raise HTTPException(
                status_code=404,
                detail=f"Strategy with ID {strategy_id} not found"
            )
        
        db.delete(strategy)
        db.commit()
        
        logger.info(f"Strategy {strategy_id} deleted for user {current_user.id}")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting strategy {strategy_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting strategy: {str(e)}"
        )


@router.post("/saved/{strategy_id}/duplicate", response_model=StrategyResponse, status_code=201)
async def duplicate_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StrategyResponse:
    """
    Duplicate an existing saved strategy.
    """
    try:
        original = db.query(Strategy).filter(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id
        ).first()
        
        if not original:
            raise HTTPException(
                status_code=404,
                detail=f"Strategy with ID {strategy_id} not found"
            )
        
        # Generate new name
        base_name = original.name
        counter = 1
        new_name = f"{base_name} (Copy {counter})"
        
        while db.query(Strategy).filter(
            Strategy.user_id == current_user.id,
            Strategy.name == new_name
        ).first():
            counter += 1
            new_name = f"{base_name} (Copy {counter})"
        
        # Create duplicate
        duplicate = Strategy(
            user_id=current_user.id,
            name=new_name,
            description=original.description,
            indicators=original.indicators.copy() if isinstance(original.indicators, list) else original.indicators,
            expressions=original.expressions.copy() if isinstance(original.expressions, dict) else original.expressions,
            parameters=original.parameters.copy() if isinstance(original.parameters, dict) else original.parameters
        )
        
        db.add(duplicate)
        db.commit()
        db.refresh(duplicate)
        
        logger.info(f"Strategy {strategy_id} duplicated as {duplicate.id} for user {current_user.id}")
        
        return StrategyResponse(
            id=duplicate.id,
            name=duplicate.name,
            description=duplicate.description,
            indicators=duplicate.indicators,
            expressions=duplicate.expressions,
            parameters=duplicate.parameters,
            created_at=duplicate.created_at.isoformat() if duplicate.created_at else "",
            updated_at=duplicate.updated_at.isoformat() if duplicate.updated_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error duplicating strategy {strategy_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error duplicating strategy: {str(e)}"
        )
