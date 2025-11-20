"""
Backtest API routes for Bitcoin trading strategy backtesting.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import pandas as pd
import logging
from datetime import datetime

from backend.core.data_loader import load_btc_data, load_crypto_data
from backend.core.strategy import (
    SMAStrategy, RSIStrategy, MACDStrategy, 
    BollingerBandsStrategy, CombinedStrategy
)
from backend.core.backtest import BacktestEngine
from backend.core.metrics import calculate_all_metrics
from backend.api.models.backtest_models import (
    BacktestRequest, BacktestResponse, ModularBacktestRequest, 
    ModularBacktestResponse, BacktestResult, IndicatorConfig,
    ExpressionValidationRequest, ExpressionValidationResponse
)
from backend.core.indicator_registry import (
    get_indicator_metadata, compute_indicators, evaluate_all_conditions,
    get_available_conditions
)
from backend.core.expression import validate_expression, create_signal_series, ValidationResult

router = APIRouter(prefix="/api/backtest", tags=["backtest"])
logger = logging.getLogger(__name__)


@router.post("/validate-expression", response_model=ExpressionValidationResponse)
async def validate_expression_endpoint(
    request: ExpressionValidationRequest
) -> ExpressionValidationResponse:
    """
    Validate an expression without running a backtest.
    
    Args:
        request: Validation request with indicators and expression
        
    Returns:
        ExpressionValidationResponse: Validation result with error details if invalid
    """
    try:
        # Check if expression is empty
        if not request.expression or not request.expression.strip():
            return ExpressionValidationResponse(
                is_valid=False,
                error_message="Expression cannot be empty",
                error_position=0
            )
        
        # Get available conditions from indicators
        indicators_dict = [indicator.dict() for indicator in request.indicators]
        available_conditions = get_available_conditions(indicators_dict)
        
        # Validate expression
        validation_result = validate_expression(request.expression, available_conditions)
        
        return ExpressionValidationResponse(
            is_valid=validation_result.is_valid,
            error_message=validation_result.error_message if not validation_result.is_valid else "",
            error_position=validation_result.error_position if not validation_result.is_valid else -1
        )
    except Exception as e:
        logger.error(f"Expression validation error: {e}")
        return ExpressionValidationResponse(
            is_valid=False,
            error_message=f"Validation error: {str(e)}",
            error_position=-1
        )

# Strategy mapping
STRATEGY_MAP = {
    "SMA": SMAStrategy,
    "RSI": RSIStrategy,
    "MACD": MACDStrategy,
    "Bollinger": BollingerBandsStrategy,
    "Combined": CombinedStrategy
}


@router.post("/", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest) -> BacktestResponse:
    """
    Run a backtest with the specified strategy and parameters.
    
    Args:
        request: Backtest request with strategy, parameters, and settings
        
    Returns:
        BacktestResponse: Backtest results including metrics and equity curve
    """
    try:
        logger.info(f"Starting backtest for strategy: {request.strategy}")
        
        # Validate strategy
        if request.strategy not in STRATEGY_MAP:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown strategy: {request.strategy}. Available strategies: {list(STRATEGY_MAP.keys())}"
            )
        
        # Load cryptocurrency data with caching
        symbol = request.symbol or "BTCUSDT"
        df = load_crypto_data(symbol=symbol)
        
        # Apply date filtering if specified
        if request.start_date:
            start_date = pd.to_datetime(request.start_date)
            df = df[df.index >= start_date]
            logger.info(f"Filtered data from {request.start_date}")
        
        if request.end_date:
            end_date = pd.to_datetime(request.end_date)
            df = df[df.index <= end_date]
            logger.info(f"Filtered data to {request.end_date}")
        
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="No data available for the specified date range"
            )
        
        # Create strategy instance
        StrategyClass = STRATEGY_MAP[request.strategy]
        try:
            strategy = StrategyClass(**request.parameters)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid strategy parameters: {str(e)}"
            )
        
        # Generate signals and run backtest
        logger.info("Generating trading signals and running backtest...")
        try:
            df_with_signals = strategy.generate_signals(df)
            
            # Run backtest
            logger.info("Running backtest simulation...")
            engine = BacktestEngine(initial_capital=request.initial_capital)
            results = engine.run_backtest(df_with_signals, strategy_name=request.strategy)
        except HTTPException:
            # Pass through explicitly raised HTTP errors
            raise
        except (TypeError, ValueError) as e:
            # Parameter-related issues (e.g. wrong types) should return 400
            logger.error(f"Invalid strategy parameters during backtest: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid strategy parameters: {str(e)}"
            )
        except Exception as e:
            # Any other unexpected error will be handled by the outer exception block
            logger.error(f"Unexpected error during backtest execution: {e}")
            raise
        
        # Organize metrics into a single dictionary
        metrics = {
            'total_return': results.get('total_return', 0),
            'cagr': results.get('cagr', 0),
            'sharpe_ratio': results.get('sharpe_ratio', 0),
            'max_drawdown': results.get('max_drawdown', 0),
            'win_rate': results.get('win_rate', 0),
            'final_portfolio_value': results.get('final_portfolio_value', 0),
            'total_trades': results.get('total_trades', 0),
            'profitable_trades': results.get('winning_trades', 0),
            'losing_trades': results.get('total_trades', 0) - results.get('winning_trades', 0),
            'avg_trade_return': 0,  # Will be calculated below
        }
        
        # Calculate additional metrics if equity curve exists
        equity_curve = results.get('equity_curve')
        if equity_curve is not None and (isinstance(equity_curve, list) and len(equity_curve) > 0 or isinstance(equity_curve, pd.DataFrame) and not equity_curve.empty):
            try:
                # Calculate additional metrics using the full results
                additional_metrics = calculate_all_metrics(results)
                metrics.update(additional_metrics)
                
                # Calculate average trade return
                if metrics['total_trades'] > 0:
                    metrics['avg_trade_return'] = metrics['total_return'] / metrics['total_trades']
                
                logger.info("Additional metrics calculated successfully")
            except Exception as e:
                logger.warning(f"Could not calculate additional metrics: {e}")
        
        # Update results with organized metrics
        results['metrics'] = metrics
        
        # Ensure all numeric values are JSON serializable
        results = _make_json_serializable(results)
        
        logger.info(f"Backtest completed successfully. Final portfolio value: {results['metrics'].get('final_portfolio_value', 'N/A')}")
        
        return BacktestResponse(
            success=True,
            results=results,
            message=f"Backtest completed successfully for {request.strategy} strategy"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backtest failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Backtest failed: {str(e)}"
        )


@router.post("/modular", response_model=ModularBacktestResponse)
async def run_modular_backtest(request: ModularBacktestRequest) -> ModularBacktestResponse:
    """
    Run a modular backtest with expression-based strategy building.
    
    Args:
        request: Modular backtest request with indicators, expression, and settings
        
    Returns:
        ModularBacktestResponse: Combined and individual backtest results
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(f"Starting modular backtest with {len(request.indicators)} indicators")
        
        # Determine which expression(s) to use
        use_separate_expressions = request.long_expression is not None or request.cash_expression is not None or request.short_expression is not None
        logger.info(f"Strategy type: {request.strategy_type}")
        if use_separate_expressions:
            logger.info(f"Long expression: {request.long_expression}")
            if request.strategy_type == "long_cash":
                logger.info(f"Cash expression: {request.cash_expression}")
            elif request.strategy_type == "long_short":
                logger.info(f"Short expression: {request.short_expression}")
        else:
            logger.info(f"Legacy expression: {request.expression}")
        
        # Load cryptocurrency data with caching
        symbol = request.symbol or "BTCUSDT"
        df = load_crypto_data(symbol=symbol)
        
        # Apply date filtering if specified
        if request.start_date:
            start_date = pd.to_datetime(request.start_date)
            df = df[df.index >= start_date]
            logger.info(f"Filtered data from {request.start_date}")
        
        if request.end_date:
            end_date = pd.to_datetime(request.end_date)
            df = df[df.index <= end_date]
            logger.info(f"Filtered data to {request.end_date}")
        
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="No data available for the specified date range"
            )
        
        # Validate indicators
        for indicator_config in request.indicators:
            try:
                get_indicator_metadata(indicator_config.id)
            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid indicator: {indicator_config.id}. {str(e)}"
                )
        
        # Get available conditions
        indicators_dict = [indicator.dict() for indicator in request.indicators]
        available_conditions = get_available_conditions(indicators_dict)
        
        # Validate expressions based on which mode is being used
        use_separate_expressions = request.long_expression is not None or request.cash_expression is not None or request.short_expression is not None
        
        if use_separate_expressions:
            # Validate separate expressions
            if not request.long_expression or not request.long_expression.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Invalid expression: Long expression cannot be empty when using separate expressions"
                )
            
            # Validate long expression
            validation_result = validate_expression(request.long_expression, available_conditions)
            if not validation_result.is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid long expression: {validation_result.error_message}"
                )
            
            # Validate based on strategy type
            if request.strategy_type == "long_cash":
                # Validate cash expression if provided (optional - defaults to NOT long_expression)
                if request.cash_expression and request.cash_expression.strip():
                    validation_result = validate_expression(request.cash_expression, available_conditions)
                    if not validation_result.is_valid:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid cash expression: {validation_result.error_message}"
                        )
            elif request.strategy_type == "long_short":
                # For long_short mode, short_expression is required when using separate expressions
                if not request.short_expression or not request.short_expression.strip():
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid expression: Short expression cannot be empty when using long_short strategy type with separate expressions"
                    )
                # Validate short expression
                validation_result = validate_expression(request.short_expression, available_conditions)
                if not validation_result.is_valid:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid short expression: {validation_result.error_message}"
                    )
        else:
            # Legacy mode: validate single expression
            if not request.expression or not request.expression.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Invalid expression: Expression cannot be empty"
                )
            
            # Validate expression syntax and conditions
            validation_result = validate_expression(request.expression, available_conditions)
            if not validation_result.is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid expression: {validation_result.error_message}"
                )
        
        # Compute all indicators and cache results
        logger.info("Computing indicators...")
        df_with_indicators = compute_indicators(df, indicators_dict)
        
        # Evaluate all conditions
        logger.info("Evaluating conditions...")
        all_conditions = evaluate_all_conditions(df_with_indicators, indicators_dict)
        
        # Create combined signal from expression(s)
        logger.info("Creating combined signal from expression...")
        
        if use_separate_expressions:
            # Use separate expressions based on strategy type
            long_signal = create_signal_series(request.long_expression, all_conditions, available_conditions)
            
            if request.strategy_type == "long_cash":
                # Long/Cash mode: LONG (1) or CASH (0)
                # If cash_expression provided, use it; otherwise cash is when NOT long
                if request.cash_expression and request.cash_expression.strip():
                    cash_signal = create_signal_series(request.cash_expression, all_conditions, available_conditions)
                    # Position: LONG when long_signal is true, CASH when cash_signal is true
                    # If both false, default to CASH (0). If both true, prioritize CASH for safety.
                    combined_signal = pd.Series(0, index=df_with_indicators.index, dtype=int)
                    combined_signal[long_signal & ~cash_signal] = 1  # LONG when long is true and cash is false
                else:
                    # Cash is simply NOT long
                    combined_signal = long_signal.astype(int)
            
            elif request.strategy_type == "long_short":
                # Long/Short mode: LONG (1), SHORT (-1), or CASH (0)
                short_signal = create_signal_series(request.short_expression, all_conditions, available_conditions)
                
                # Initialize with CASH (0)
                combined_signal = pd.Series(0, index=df_with_indicators.index, dtype=int)
                
                # Set LONG when long_signal is true and short_signal is false
                combined_signal[long_signal & ~short_signal] = 1
                
                # Set SHORT when short_signal is true and long_signal is false
                combined_signal[~long_signal & short_signal] = -1
                
                # If both are true, prioritize LONG (can be changed to SHORT or raise error)
                # For now, LONG takes precedence when both are true
                combined_signal[long_signal & short_signal] = 1
        else:
            # Legacy mode: use single expression (defaults to long_cash behavior)
            combined_signal = create_signal_series(request.expression, all_conditions, available_conditions)
        
        # Add combined signal to DataFrame
        df_with_indicators['Signal'] = combined_signal
        df_with_indicators['Position'] = combined_signal
        
        # Run combined backtest
        logger.info("Running combined backtest...")
        combined_engine = BacktestEngine(initial_capital=request.initial_capital)
        combined_results = combined_engine.run_backtest(df_with_indicators, strategy_name="Combined")
        
        # Calculate combined metrics
        combined_metrics = calculate_all_metrics(combined_results)
        combined_results['metrics'] = combined_metrics
        combined_results = _make_json_serializable(combined_results)
        
        # Create combined result
        combined_result = BacktestResult(
            metrics=combined_results['metrics'],
            equity_curve=combined_results['equity_curve'],
            trade_log=combined_results['trade_log']
        )
        
        # Run individual backtests
        logger.info("Running individual indicator backtests...")
        individual_results = {}
        
        for indicator_config in request.indicators:
            try:
                # Get the canonical condition for this indicator
                indicator_metadata = get_indicator_metadata(indicator_config.id)
                canonical_condition = list(indicator_metadata.conditions.keys())[0]  # Use first condition
                
                # Create DataFrame with only this indicator's signal
                individual_df = df_with_indicators.copy()
                individual_signal = all_conditions[canonical_condition].astype(int)
                individual_df['Signal'] = individual_signal
                individual_df['Position'] = individual_signal  # Position = Signal for this implementation
                
                # Run backtest
                individual_engine = BacktestEngine(initial_capital=request.initial_capital)
                individual_backtest_results = individual_engine.run_backtest(individual_df, strategy_name=indicator_config.id)
                
                # Calculate metrics
                individual_metrics = calculate_all_metrics(individual_backtest_results)
                individual_backtest_results['metrics'] = individual_metrics
                individual_backtest_results = _make_json_serializable(individual_backtest_results)
                
                # Create individual result
                individual_results[indicator_config.id] = BacktestResult(
                    metrics=individual_backtest_results['metrics'],
                    equity_curve=individual_backtest_results['equity_curve'],
                    trade_log=individual_backtest_results['trade_log']
                )
                
                logger.info(f"Completed individual backtest for {indicator_config.id}")
                
            except Exception as e:
                logger.warning(f"Failed to run individual backtest for {indicator_config.id}: {e}")
                # Create empty result for failed indicator
                individual_results[indicator_config.id] = BacktestResult(
                    metrics={},
                    equity_curve=[],
                    trade_log=[]
                )
        
        # Calculate duration
        duration_s = time.time() - start_time
        
        # Prepare info
        info = {
            "indicators": [indicator.dict() for indicator in request.indicators],
            "strategy_type": request.strategy_type,
            "duration_s": round(duration_s, 2)
        }
        
        # Add expression info based on mode
        if use_separate_expressions:
            info["long_expression"] = request.long_expression
            if request.strategy_type == "long_cash":
                if request.cash_expression and request.cash_expression.strip():
                    info["cash_expression"] = request.cash_expression
                # Keep legacy expression field for backward compatibility
                info["expression"] = f"LONG: {request.long_expression}" + (f" | CASH: {request.cash_expression}" if request.cash_expression and request.cash_expression.strip() else "")
            elif request.strategy_type == "long_short":
                if request.short_expression and request.short_expression.strip():
                    info["short_expression"] = request.short_expression
                info["expression"] = f"LONG: {request.long_expression} | SHORT: {request.short_expression}"
        else:
            info["expression"] = request.expression
        
        logger.info(f"Modular backtest completed in {duration_s:.2f} seconds")
        
        return ModularBacktestResponse(
            success=True,
            combined_result=combined_result,
            individual_results=individual_results,
            info=info,
            message=f"Modular backtest completed successfully with {len(request.indicators)} indicators"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Modular backtest failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Modular backtest failed: {str(e)}"
        )


def _make_json_serializable(obj):
    """
    Convert numpy types and other non-JSON serializable objects to Python native types.
    
    Args:
        obj: Object to make JSON serializable
        
    Returns:
        JSON serializable version of the object
    """
    import numpy as np
    
    if isinstance(obj, dict):
        return {key: _make_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [_make_json_serializable(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict('records')
    elif isinstance(obj, pd.Series):
        return obj.tolist()
    elif hasattr(obj, 'item'):  # numpy scalars
        return obj.item()
    else:
        return obj


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint for backtest service.
    
    Returns:
        Dict[str, str]: Health status
    """
    try:
        # Try to load data and create a strategy to verify service is working
        df = load_crypto_data(symbol="BTCUSDT")  # Use BTCUSDT for health check (backward compatibility)
        strategy = SMAStrategy(20, 50)
        return {"status": "healthy", "data_records": str(len(df))}
    except Exception as e:
        logger.error(f"Backtest health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}


@router.get("/indicators")
async def get_available_indicators():
    """
    Get available indicators and their metadata for modular strategy building.
    
    Returns:
        Dict containing indicator metadata
    """
    try:
        from backend.core.indicator_registry import get_all_indicators
        
        indicators = get_all_indicators()
        
        # Convert to dict format for API response
        result = {}
        for indicator_id, metadata in indicators.items():
            result[indicator_id] = {
                "name": metadata.name,
                "description": metadata.description,
                "parameters": metadata.parameters,
                "conditions": metadata.conditions,
                "category": metadata.category
            }
        
        return {
            "success": True,
            "indicators": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get indicators: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get indicators: {str(e)}"
        )
