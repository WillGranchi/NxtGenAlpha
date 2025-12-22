"""
Custom Indicator API routes
Handles CRUD operations for user-defined Python indicators
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
import logging

from backend.core.database import get_db
from backend.core.auth import get_current_user
from backend.api.models.db_models import CustomIndicator, User
from backend.core.custom_indicator_executor import (
    validate_custom_indicator_code,
    validate_indicator_signature,
    execute_custom_indicator
)
from backend.core.data_loader import load_crypto_data

router = APIRouter(prefix="/api/custom-indicators", tags=["custom-indicators"])
logger = logging.getLogger(__name__)


# Request/Response Models
class CustomIndicatorParameter(BaseModel):
    type: str = Field(..., description="Parameter type: 'int' or 'float'")
    default: float = Field(..., description="Default value")
    min: Optional[float] = Field(None, description="Minimum value")
    max: Optional[float] = Field(None, description="Maximum value")
    description: str = Field("", description="Parameter description")


class CreateCustomIndicatorRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    code: str = Field(..., min_length=10, description="Python code for the indicator function")
    function_name: str = Field(..., min_length=1, max_length=255, description="Name of the function in the code")
    parameters: dict = Field(..., description="Parameter definitions")
    conditions: dict = Field(..., description="Condition definitions")
    category: str = Field(default="Other", description="Indicator category")
    is_public: bool = Field(default=False, description="Whether indicator is publicly shareable")


class UpdateCustomIndicatorRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    code: Optional[str] = Field(None, min_length=10)
    function_name: Optional[str] = Field(None, min_length=1, max_length=255)
    parameters: Optional[dict] = None
    conditions: Optional[dict] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None


class CustomIndicatorResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    function_name: str
    parameters: dict
    conditions: dict
    category: str
    is_public: bool
    is_validated: bool
    validation_error: Optional[str]
    created_at: str
    updated_at: str
    user_id: int


class ValidateIndicatorRequest(BaseModel):
    code: str
    function_name: str


class ValidateIndicatorResponse(BaseModel):
    is_valid: bool
    error_message: Optional[str] = None
    signature_valid: bool = False
    signature_error: Optional[str] = None


# Example template code
EXAMPLE_INDICATOR_CODE = """import pandas as pd
import numpy as np

def my_custom_indicator(df: pd.DataFrame, params: dict) -> pd.Series:
    '''
    Custom indicator example.
    
    Args:
        df: DataFrame with columns: Open, High, Low, Close, Volume
        params: Dictionary with parameters:
            - period: int, default 20
            - multiplier: float, default 2.0
    
    Returns:
        pd.Series: Indicator values (same length as df)
    '''
    period = params.get('period', 20)
    multiplier = params.get('multiplier', 2.0)
    
    # Calculate your indicator here
    # Example: Simple moving average with multiplier
    close = df['Close']
    sma = close.rolling(window=period).mean()
    indicator = sma * multiplier
    
    return indicator
"""


@router.get("/example")
async def get_example_indicator():
    """Get example custom indicator code template."""
    return {
        "success": True,
        "code": EXAMPLE_INDICATOR_CODE,
        "function_name": "my_custom_indicator",
        "parameters": {
            "period": {
                "type": "int",
                "default": 20,
                "min": 5,
                "max": 100,
                "description": "Period for calculation"
            },
            "multiplier": {
                "type": "float",
                "default": 2.0,
                "min": 0.1,
                "max": 10.0,
                "description": "Multiplier value"
            }
        },
        "conditions": {
            "indicator_above_price": "Indicator value above current price",
            "indicator_below_price": "Indicator value below current price",
            "indicator_cross_above_price": "Indicator crosses above price",
            "indicator_cross_below_price": "Indicator crosses below price"
        }
    }


@router.post("/validate", response_model=ValidateIndicatorResponse)
async def validate_indicator_code(request: ValidateIndicatorRequest):
    """
    Validate custom indicator code without saving it.
    """
    try:
        # Validate code safety
        is_valid, error_message = validate_custom_indicator_code(request.code)
        
        if not is_valid:
            return ValidateIndicatorResponse(
                is_valid=False,
                error_message=error_message,
                signature_valid=False
            )
        
        # Validate function signature
        signature_valid, signature_error, _ = validate_indicator_signature(
            request.code,
            request.function_name
        )
        
        return ValidateIndicatorResponse(
            is_valid=True,
            signature_valid=signature_valid,
            signature_error=signature_error
        )
        
    except Exception as e:
        logger.error(f"Error validating indicator: {e}")
        return ValidateIndicatorResponse(
            is_valid=False,
            error_message=f"Validation error: {str(e)}",
            signature_valid=False
        )


@router.post("/", response_model=CustomIndicatorResponse, status_code=201)
async def create_custom_indicator(
    request: CreateCustomIndicatorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new custom indicator.
    """
    try:
        # Validate code
        is_valid, error_message = validate_custom_indicator_code(request.code)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid code: {error_message}"
            )
        
        # Validate function signature
        signature_valid, signature_error, _ = validate_indicator_signature(
            request.code,
            request.function_name
        )
        if not signature_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid function signature: {signature_error}"
            )
        
        # Check if name already exists for this user
        existing = db.query(CustomIndicator).filter(
            CustomIndicator.user_id == current_user.id,
            CustomIndicator.name == request.name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Indicator with name '{request.name}' already exists"
            )
        
        # Create indicator
        indicator = CustomIndicator(
            user_id=current_user.id,
            name=request.name,
            description=request.description,
            code=request.code,
            function_name=request.function_name,
            parameters=request.parameters,
            conditions=request.conditions,
            category=request.category,
            is_public=request.is_public,
            is_validated=True,
            validation_error=None
        )
        
        db.add(indicator)
        db.commit()
        db.refresh(indicator)
        
        logger.info(f"Custom indicator '{request.name}' created by user {current_user.id}")
        
        return CustomIndicatorResponse(
            id=indicator.id,
            name=indicator.name,
            description=indicator.description,
            function_name=indicator.function_name,
            parameters=indicator.parameters,
            conditions=indicator.conditions,
            category=indicator.category,
            is_public=indicator.is_public,
            is_validated=indicator.is_validated,
            validation_error=indicator.validation_error,
            created_at=indicator.created_at.isoformat(),
            updated_at=indicator.updated_at.isoformat(),
            user_id=indicator.user_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating custom indicator: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create indicator: {str(e)}"
        )


@router.get("/", response_model=List[CustomIndicatorResponse])
async def list_custom_indicators(
    include_public: bool = False,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List custom indicators.
    - If authenticated: returns user's indicators + public indicators if include_public=True
    - If not authenticated: returns only public indicators
    """
    try:
        indicators = []
        
        # Get user's own indicators
        if current_user:
            user_indicators = db.query(CustomIndicator).filter(
                CustomIndicator.user_id == current_user.id
            ).all()
            indicators.extend(user_indicators)
        
        # Get public indicators
        if include_public or not current_user:
            public_indicators = db.query(CustomIndicator).filter(
                CustomIndicator.is_public == True
            ).all()
            
            # Filter out duplicates if user already has them
            if current_user:
                user_indicator_ids = {ind.id for ind in user_indicators}
                public_indicators = [ind for ind in public_indicators if ind.id not in user_indicator_ids]
            
            indicators.extend(public_indicators)
        
        return [
            CustomIndicatorResponse(
                id=ind.id,
                name=ind.name,
                description=ind.description,
                function_name=ind.function_name,
                parameters=ind.parameters,
                conditions=ind.conditions,
                category=ind.category,
                is_public=ind.is_public,
                is_validated=ind.is_validated,
                validation_error=ind.validation_error,
                created_at=ind.created_at.isoformat(),
                updated_at=ind.updated_at.isoformat(),
                user_id=ind.user_id
            )
            for ind in indicators
        ]
        
    except Exception as e:
        logger.error(f"Error listing custom indicators: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list indicators: {str(e)}"
        )


@router.get("/{indicator_id}", response_model=CustomIndicatorResponse)
async def get_custom_indicator(
    indicator_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific custom indicator by ID.
    """
    try:
        indicator = db.query(CustomIndicator).filter(
            CustomIndicator.id == indicator_id
        ).first()
        
        if not indicator:
            raise HTTPException(
                status_code=404,
                detail=f"Indicator with ID {indicator_id} not found"
            )
        
        # Check access permissions
        if not indicator.is_public and (not current_user or indicator.user_id != current_user.id):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this indicator"
            )
        
        return CustomIndicatorResponse(
            id=indicator.id,
            name=indicator.name,
            description=indicator.description,
            function_name=indicator.function_name,
            parameters=indicator.parameters,
            conditions=indicator.conditions,
            category=indicator.category,
            is_public=indicator.is_public,
            is_validated=indicator.is_validated,
            validation_error=indicator.validation_error,
            created_at=indicator.created_at.isoformat(),
            updated_at=indicator.updated_at.isoformat(),
            user_id=indicator.user_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting custom indicator {indicator_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get indicator: {str(e)}"
        )


@router.put("/{indicator_id}", response_model=CustomIndicatorResponse)
async def update_custom_indicator(
    indicator_id: int,
    request: UpdateCustomIndicatorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing custom indicator.
    """
    try:
        indicator = db.query(CustomIndicator).filter(
            CustomIndicator.id == indicator_id,
            CustomIndicator.user_id == current_user.id
        ).first()
        
        if not indicator:
            raise HTTPException(
                status_code=404,
                detail=f"Indicator with ID {indicator_id} not found"
            )
        
        # Validate code if provided
        if request.code:
            is_valid, error_message = validate_custom_indicator_code(request.code)
            if not is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid code: {error_message}"
                )
            
            # Validate function signature
            function_name = request.function_name or indicator.function_name
            signature_valid, signature_error, _ = validate_indicator_signature(
                request.code,
                function_name
            )
            if not signature_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid function signature: {signature_error}"
                )
        
        # Check name conflict
        if request.name and request.name != indicator.name:
            existing = db.query(CustomIndicator).filter(
                CustomIndicator.user_id == current_user.id,
                CustomIndicator.name == request.name,
                CustomIndicator.id != indicator_id
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Indicator with name '{request.name}' already exists"
                )
        
        # Update fields
        if request.name is not None:
            indicator.name = request.name
        if request.description is not None:
            indicator.description = request.description
        if request.code is not None:
            indicator.code = request.code
        if request.function_name is not None:
            indicator.function_name = request.function_name
        if request.parameters is not None:
            indicator.parameters = request.parameters
        if request.conditions is not None:
            indicator.conditions = request.conditions
        if request.category is not None:
            indicator.category = request.category
        if request.is_public is not None:
            indicator.is_public = request.is_public
        
        # Re-validate if code changed
        if request.code:
            indicator.is_validated = True
            indicator.validation_error = None
        
        db.commit()
        db.refresh(indicator)
        
        logger.info(f"Custom indicator {indicator_id} updated by user {current_user.id}")
        
        return CustomIndicatorResponse(
            id=indicator.id,
            name=indicator.name,
            description=indicator.description,
            function_name=indicator.function_name,
            parameters=indicator.parameters,
            conditions=indicator.conditions,
            category=indicator.category,
            is_public=indicator.is_public,
            is_validated=indicator.is_validated,
            validation_error=indicator.validation_error,
            created_at=indicator.created_at.isoformat(),
            updated_at=indicator.updated_at.isoformat(),
            user_id=indicator.user_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating custom indicator {indicator_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update indicator: {str(e)}"
        )


@router.delete("/{indicator_id}", status_code=204)
async def delete_custom_indicator(
    indicator_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a custom indicator.
    """
    try:
        indicator = db.query(CustomIndicator).filter(
            CustomIndicator.id == indicator_id,
            CustomIndicator.user_id == current_user.id
        ).first()
        
        if not indicator:
            raise HTTPException(
                status_code=404,
                detail=f"Indicator with ID {indicator_id} not found"
            )
        
        db.delete(indicator)
        db.commit()
        
        logger.info(f"Custom indicator {indicator_id} deleted by user {current_user.id}")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting custom indicator {indicator_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete indicator: {str(e)}"
        )


@router.post("/{indicator_id}/test")
async def test_custom_indicator(
    indicator_id: int,
    params: dict,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test a custom indicator with sample data.
    """
    try:
        indicator = db.query(CustomIndicator).filter(
            CustomIndicator.id == indicator_id
        ).first()
        
        if not indicator:
            raise HTTPException(
                status_code=404,
                detail=f"Indicator with ID {indicator_id} not found"
            )
        
        # Check access
        if not indicator.is_public and (not current_user or indicator.user_id != current_user.id):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to test this indicator"
            )
        
        # Load sample data
        df = load_crypto_data(symbol="BTCUSDT")
        df_sample = df.head(100)  # Use first 100 rows for testing
        
        # Execute indicator
        result = execute_custom_indicator(
            indicator.code,
            indicator.function_name,
            df_sample,
            params
        )
        
        return {
            "success": True,
            "result_length": len(result),
            "sample_values": result.head(10).tolist(),
            "statistics": {
                "mean": float(result.mean()),
                "std": float(result.std()),
                "min": float(result.min()),
                "max": float(result.max()),
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error testing custom indicator {indicator_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test indicator: {str(e)}"
        )

