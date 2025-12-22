"""
Unit tests for expression parser.
"""

import pytest
import pandas as pd
import numpy as np
from backend.core.expression import (
    ExpressionParser, TokenType, Token, ConditionNode, BinaryOpNode,
    ValidationResult, parse_expression, validate_expression, evaluate_expression
)


class TestExpressionParser:
    """Test cases for ExpressionParser class."""
    
    def test_tokenize_simple_expression(self):
        """Test tokenization of simple expressions."""
        parser = ExpressionParser()
        
        # Test simple condition
        tokens = parser.tokenize("rsi_oversold")
        assert len(tokens) == 2  # IDENTIFIER + EOF
        assert tokens[0].type == TokenType.IDENTIFIER
        assert tokens[0].value == "rsi_oversold"
        assert tokens[1].type == TokenType.EOF
        
        # Test AND expression
        tokens = parser.tokenize("rsi_oversold AND macd_cross_up")
        assert len(tokens) == 4  # IDENTIFIER + AND + IDENTIFIER + EOF
        assert tokens[0].type == TokenType.IDENTIFIER
        assert tokens[1].type == TokenType.AND
        assert tokens[2].type == TokenType.IDENTIFIER
        
        # Test OR expression
        tokens = parser.tokenize("rsi_oversold OR macd_cross_up")
        assert len(tokens) == 4
        assert tokens[1].type == TokenType.OR
        
        # Test parentheses
        tokens = parser.tokenize("(rsi_oversold AND macd_cross_up) OR ema_cross_up")
        assert len(tokens) == 8  # ( + ID + AND + ID + ) + OR + ID + EOF
        assert tokens[0].type == TokenType.LPAREN
        assert tokens[4].type == TokenType.RPAREN
    
    def test_validate_simple_expressions(self):
        """Test validation of simple expressions."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up", "ema_cross_up"]
        
        # Valid expressions
        assert parser.validate("rsi_oversold", available_conditions).is_valid
        assert parser.validate("rsi_oversold AND macd_cross_up", available_conditions).is_valid
        assert parser.validate("(rsi_oversold AND macd_cross_up) OR ema_cross_up", available_conditions).is_valid
        
        # Invalid expressions
        result = parser.validate("", available_conditions)
        assert not result.is_valid
        assert "empty" in result.error_message.lower()
        
        result = parser.validate("unknown_condition", available_conditions)
        assert not result.is_valid
        assert "unknown" in result.error_message.lower()
        
        result = parser.validate("rsi_oversold AND", available_conditions)
        assert not result.is_valid
        
        result = parser.validate("(rsi_oversold AND macd_cross_up", available_conditions)
        assert not result.is_valid
    
    def test_validate_complex_expressions(self):
        """Test validation of complex expressions."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up", "ema_cross_up", "bb_price_touch_lower"]
        
        # Complex valid expression
        expr = "((rsi_oversold AND macd_cross_up) OR (ema_cross_up AND bb_price_touch_lower))"
        result = parser.validate(expr, available_conditions)
        assert result.is_valid
        
        # Test max depth validation
        deep_expr = "(" * 7 + "rsi_oversold" + ")" * 7
        result = parser.validate(deep_expr, available_conditions)
        assert not result.is_valid
        assert "depth" in result.error_message.lower()
    
    def test_parse_simple_expressions(self):
        """Test parsing of simple expressions."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up"]
        
        # Simple condition
        ast = parser.parse("rsi_oversold", available_conditions)
        assert isinstance(ast, ConditionNode)
        assert ast.name == "rsi_oversold"
        
        # AND expression
        ast = parser.parse("rsi_oversold AND macd_cross_up", available_conditions)
        assert isinstance(ast, BinaryOpNode)
        assert ast.operator == "AND"
        assert isinstance(ast.left, ConditionNode)
        assert isinstance(ast.right, ConditionNode)
        
        # OR expression
        ast = parser.parse("rsi_oversold OR macd_cross_up", available_conditions)
        assert isinstance(ast, BinaryOpNode)
        assert ast.operator == "OR"
    
    def test_parse_complex_expressions(self):
        """Test parsing of complex expressions with parentheses."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up", "ema_cross_up"]
        
        # Parenthesized expression
        ast = parser.parse("(rsi_oversold AND macd_cross_up) OR ema_cross_up", available_conditions)
        assert isinstance(ast, BinaryOpNode)
        assert ast.operator == "OR"
        assert isinstance(ast.left, BinaryOpNode)
        assert ast.left.operator == "AND"
        assert isinstance(ast.right, ConditionNode)
    
    def test_evaluate_conditions(self):
        """Test evaluation of expressions against condition series."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up"]
        
        # Create test data
        n = 10
        conditions = {
            "rsi_oversold": pd.Series([True, False, True, False, True, False, True, False, True, False]),
            "macd_cross_up": pd.Series([False, True, False, True, False, True, False, True, False, True])
        }
        
        # Test simple condition
        ast = parser.parse("rsi_oversold", available_conditions)
        result = parser.evaluate(ast, conditions)
        expected = conditions["rsi_oversold"]
        pd.testing.assert_series_equal(result, expected)
        
        # Test AND expression
        ast = parser.parse("rsi_oversold AND macd_cross_up", available_conditions)
        result = parser.evaluate(ast, conditions)
        expected = conditions["rsi_oversold"] & conditions["macd_cross_up"]
        pd.testing.assert_series_equal(result, expected)
        
        # Test OR expression
        ast = parser.parse("rsi_oversold OR macd_cross_up", available_conditions)
        result = parser.evaluate(ast, conditions)
        expected = conditions["rsi_oversold"] | conditions["macd_cross_up"]
        pd.testing.assert_series_equal(result, expected)
    
    def test_evaluate_complex_expressions(self):
        """Test evaluation of complex expressions."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up", "ema_cross_up"]
        
        # Create test data
        n = 10
        conditions = {
            "rsi_oversold": pd.Series([True, False, True, False, True, False, True, False, True, False]),
            "macd_cross_up": pd.Series([False, True, False, True, False, True, False, True, False, True]),
            "ema_cross_up": pd.Series([True, True, False, False, True, True, False, False, True, True])
        }
        
        # Test complex expression: (rsi_oversold AND macd_cross_up) OR ema_cross_up
        ast = parser.parse("(rsi_oversold AND macd_cross_up) OR ema_cross_up", available_conditions)
        result = parser.evaluate(ast, conditions)
        
        # Manual calculation
        and_result = conditions["rsi_oversold"] & conditions["macd_cross_up"]
        expected = and_result | conditions["ema_cross_up"]
        
        pd.testing.assert_series_equal(result, expected)


class TestExpressionFunctions:
    """Test cases for standalone expression functions."""
    
    def test_parse_expression_function(self):
        """Test the parse_expression function."""
        available_conditions = ["rsi_oversold", "macd_cross_up"]
        
        ast = parse_expression("rsi_oversold AND macd_cross_up", available_conditions)
        assert isinstance(ast, BinaryOpNode)
        assert ast.operator == "AND"
    
    def test_validate_expression_function(self):
        """Test the validate_expression function."""
        available_conditions = ["rsi_oversold", "macd_cross_up"]
        
        # Valid expression
        result = validate_expression("rsi_oversold AND macd_cross_up", available_conditions)
        assert result.is_valid
        
        # Invalid expression
        result = validate_expression("unknown_condition", available_conditions)
        assert not result.is_valid
    
    def test_evaluate_expression_function(self):
        """Test the evaluate_expression function."""
        available_conditions = ["rsi_oversold", "macd_cross_up"]
        conditions = {
            "rsi_oversold": pd.Series([True, False, True, False]),
            "macd_cross_up": pd.Series([False, True, False, True])
        }
        
        result = evaluate_expression("rsi_oversold AND macd_cross_up", conditions, available_conditions)
        expected = conditions["rsi_oversold"] & conditions["macd_cross_up"]
        pd.testing.assert_series_equal(result, expected)


class TestEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_empty_expression(self):
        """Test handling of empty expressions."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold"]
        
        result = parser.validate("", available_conditions)
        assert not result.is_valid
        
        result = parser.validate("   ", available_conditions)
        assert not result.is_valid
    
    def test_malformed_expressions(self):
        """Test handling of malformed expressions."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up"]
        
        # Missing operand
        result = parser.validate("rsi_oversold AND", available_conditions)
        assert not result.is_valid
        
        # Missing operator
        result = parser.validate("rsi_oversold macd_cross_up", available_conditions)
        assert not result.is_valid
        
        # Unbalanced parentheses
        result = parser.validate("(rsi_oversold AND macd_cross_up", available_conditions)
        assert not result.is_valid
        
        result = parser.validate("rsi_oversold AND macd_cross_up)", available_conditions)
        assert not result.is_valid
    
    def test_unknown_conditions(self):
        """Test handling of unknown conditions."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold"]
        
        result = parser.validate("unknown_condition", available_conditions)
        assert not result.is_valid
        assert "unknown" in result.error_message.lower()
    
    def test_token_limit(self):
        """Test token count limit."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold"]
        
        # Create a very long expression
        long_expr = " AND ".join(["rsi_oversold"] * 30)  # 30 tokens + 29 AND = 59 tokens
        result = parser.validate(long_expr, available_conditions)
        assert not result.is_valid
        assert "complex" in result.error_message.lower() or "tokens" in result.error_message.lower()
    
    def test_missing_condition_in_evaluation(self):
        """Test handling of missing conditions during evaluation."""
        parser = ExpressionParser()
        available_conditions = ["rsi_oversold", "macd_cross_up"]
        conditions = {"rsi_oversold": pd.Series([True, False])}
        
        ast = parser.parse("rsi_oversold AND macd_cross_up", available_conditions)
        
        with pytest.raises(ValueError, match="not found"):
            parser.evaluate(ast, conditions)
