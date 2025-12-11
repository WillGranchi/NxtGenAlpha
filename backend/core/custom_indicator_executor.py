"""
Custom Python Indicator Executor
Safely executes user-provided Python code for custom indicators
"""

import ast
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional
import logging
import re

logger = logging.getLogger(__name__)

# Allowed imports (whitelist approach)
ALLOWED_IMPORTS = {
    'pandas': ['pd'],
    'numpy': ['np'],
    'math': ['*'],
    'statistics': ['*'],
}

# Forbidden patterns
FORBIDDEN_PATTERNS = [
    r'import\s+os',
    r'import\s+sys',
    r'import\s+subprocess',
    r'import\s+__builtin__',
    r'import\s+builtins',
    r'eval\s*\(',
    r'exec\s*\(',
    r'__import__\s*\(',
    r'open\s*\(',
    r'file\s*\(',
    r'input\s*\(',
    r'raw_input\s*\(',
]


def validate_custom_indicator_code(code: str) -> Tuple[bool, Optional[str]]:
    """
    Validate custom indicator Python code for safety and syntax.
    
    Args:
        code: Python code string
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Check for forbidden patterns
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, code, re.IGNORECASE):
                return False, f"Forbidden pattern detected: {pattern}"
        
        # Parse AST to check syntax
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return False, f"Syntax error: {str(e)}"
        
        # Check for dangerous AST nodes
        dangerous_nodes = (
            ast.Import, ast.ImportFrom, ast.Call, ast.Attribute,
            ast.Subscript, ast.BinOp, ast.UnaryOp, ast.Compare,
            ast.If, ast.For, ast.While, ast.With, ast.Try,
            ast.FunctionDef, ast.Lambda, ast.ListComp, ast.DictComp,
            ast.GeneratorExp, ast.Yield, ast.YieldFrom,
            ast.Global, ast.Nonlocal, ast.Delete, ast.AugAssign,
            ast.Raise, ast.Assert, ast.Pass, ast.Break, ast.Continue,
            ast.Return, ast.Expr, ast.Assign, ast.AnnAssign,
            ast.Name, ast.Constant, ast.Num, ast.Str, ast.Bytes,
            ast.List, ast.Tuple, ast.Set, ast.Dict,
            ast.BoolOp, ast.IfExp, ast.DictComp, ast.SetComp,
            ast.ListComp, ast.GeneratorExp, ast.Await, ast.AsyncFor,
            ast.AsyncWith, ast.AsyncFunctionDef, ast.ClassDef,
            ast.Starred, ast.Slice, ast.ExtSlice, ast.Index,
            ast.And, ast.Or, ast.Add, ast.Sub, ast.Mult, ast.Div,
            ast.Mod, ast.Pow, ast.LShift, ast.RShift, ast.BitOr,
            ast.BitXor, ast.BitAnd, ast.FloorDiv, ast.MatMult,
            ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
            ast.Is, ast.IsNot, ast.In, ast.NotIn, ast.Not, ast.UAdd,
            ast.USub, ast.Invert, ast.Ellipsis, ast.arg, ast.arguments,
            ast.keyword, ast.alias, ast.withitem, ast.comprehension,
            ast.excepthandler, ast.ExceptHandler, ast.match_case,
            ast.pattern, ast.Match, ast.MatchValue, ast.MatchSingleton,
            ast.MatchSequence, ast.MatchMapping, ast.MatchClass,
            ast.MatchStar, ast.MatchAs, ast.MatchOr,
        )
        
        # Walk AST to check for dangerous operations
        for node in ast.walk(tree):
            # Allow function definitions (user needs to define their indicator)
            if isinstance(node, ast.FunctionDef):
                continue
            
            # Check for imports (only allow specific ones)
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                # We'll check imports more carefully below
                continue
            
            # Check for dangerous function calls
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                    if func_name in ['eval', 'exec', '__import__', 'open', 'file', 'input', 'raw_input']:
                        return False, f"Forbidden function call: {func_name}"
        
        # Check imports more carefully
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name not in ALLOWED_IMPORTS:
                        return False, f"Forbidden import: {alias.name}. Only pandas, numpy, math, and statistics are allowed."
            
            if isinstance(node, ast.ImportFrom):
                if node.module and node.module not in ALLOWED_IMPORTS:
                    return False, f"Forbidden import: {node.module}. Only pandas, numpy, math, and statistics are allowed."
        
        return True, None
        
    except Exception as e:
        logger.error(f"Error validating custom indicator code: {e}")
        return False, f"Validation error: {str(e)}"


def execute_custom_indicator(
    code: str,
    function_name: str,
    df: pd.DataFrame,
    params: Dict[str, Any]
) -> pd.Series:
    """
    Execute custom indicator code safely.
    
    Args:
        code: Python code string containing the indicator function
        function_name: Name of the function to call
        df: DataFrame with OHLCV data
        params: Dictionary of parameters to pass to the function
        
    Returns:
        pd.Series: Indicator values
        
    Raises:
        ValueError: If code is invalid or execution fails
    """
    # Validate code first
    is_valid, error_msg = validate_custom_indicator_code(code)
    if not is_valid:
        raise ValueError(f"Invalid code: {error_msg}")
    
    # Create a restricted execution environment
    restricted_globals = {
        '__builtins__': {
            'abs': abs,
            'all': all,
            'any': any,
            'bool': bool,
            'dict': dict,
            'float': float,
            'int': int,
            'len': len,
            'list': list,
            'max': max,
            'min': min,
            'range': range,
            'round': round,
            'set': set,
            'str': str,
            'sum': sum,
            'tuple': tuple,
            'type': type,
            'zip': zip,
        },
        'pd': pd,
        'np': np,
        'pandas': pd,
        'numpy': np,
        'math': __import__('math'),
        'statistics': __import__('statistics'),
    }
    
    restricted_locals = {}
    
    try:
        # Execute the code in restricted environment
        exec(code, restricted_globals, restricted_locals)
        
        # Get the function
        if function_name not in restricted_locals:
            raise ValueError(f"Function '{function_name}' not found in code")
        
        indicator_func = restricted_locals[function_name]
        
        # Call the function with DataFrame and parameters
        result = indicator_func(df, params)
        
        # Validate result is a Series
        if not isinstance(result, pd.Series):
            raise ValueError(f"Indicator function must return a pandas Series, got {type(result)}")
        
        # Ensure result has same index as input DataFrame
        if not result.index.equals(df.index):
            # Try to align
            result = result.reindex(df.index)
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing custom indicator: {e}")
        raise ValueError(f"Execution error: {str(e)}")


def validate_indicator_signature(code: str, function_name: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Validate that the indicator function has the correct signature.
    
    Expected signature: def indicator_name(df: pd.DataFrame, params: dict) -> pd.Series
    
    Args:
        code: Python code string
        function_name: Expected function name
        
    Returns:
        Tuple of (is_valid, error_message, detected_parameters)
    """
    try:
        tree = ast.parse(code)
        
        # Find the function definition
        function_def = None
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == function_name:
                function_def = node
                break
        
        if not function_def:
            return False, f"Function '{function_name}' not found in code", None
        
        # Check function signature
        if len(function_def.args.args) != 2:
            return False, f"Function must take exactly 2 arguments (df, params), got {len(function_def.args.args)}", None
        
        # Try to extract default parameter values from code (basic parsing)
        # This is a simplified approach - in production, you might want more sophisticated parsing
        params_info = {}
        
        return True, None, params_info
        
    except Exception as e:
        return False, f"Error validating signature: {str(e)}", None

