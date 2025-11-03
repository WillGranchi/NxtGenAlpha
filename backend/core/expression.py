"""
Expression Parser for Modular Strategy Builder.

This module provides a lightweight parser for boolean expressions used in
strategy building, supporting parentheses, AND, OR operators, and condition identifiers.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Union, Optional
from enum import Enum
import re


class TokenType(Enum):
    """Types of tokens in the expression."""
    IDENTIFIER = "IDENTIFIER"
    AND = "AND"
    OR = "OR"
    LPAREN = "LPAREN"
    RPAREN = "RPAREN"
    EOF = "EOF"


class Token:
    """Represents a token in the expression."""
    
    def __init__(self, type_: TokenType, value: str, position: int):
        self.type = type_
        self.value = value
        self.position = position
    
    def __repr__(self):
        return f"Token({self.type.value}, '{self.value}', {self.position})"


class ASTNode:
    """Base class for AST nodes."""
    pass


class ConditionNode(ASTNode):
    """Represents a condition identifier."""
    
    def __init__(self, name: str):
        self.name = name
    
    def __repr__(self):
        return f"ConditionNode('{self.name}')"


class BinaryOpNode(ASTNode):
    """Represents a binary operation (AND, OR)."""
    
    def __init__(self, operator: str, left: ASTNode, right: ASTNode):
        self.operator = operator
        self.left = left
        self.right = right
    
    def __repr__(self):
        return f"BinaryOpNode('{self.operator}', {self.left}, {self.right})"


class ValidationResult:
    """Result of expression validation."""
    
    def __init__(self, is_valid: bool, error_message: str = "", error_position: int = -1):
        self.is_valid = is_valid
        self.error_message = error_message
        self.error_position = error_position
    
    def __repr__(self):
        if self.is_valid:
            return "ValidationResult(valid=True)"
        else:
            return f"ValidationResult(valid=False, error='{self.error_message}', position={self.error_position})"


class ExpressionParser:
    """Parser for boolean expressions with AND, OR, and parentheses."""
    
    def __init__(self):
        self.tokens: List[Token] = []
        self.current_token_index = 0
        self.available_conditions: List[str] = []
        self.max_tokens = 50
        self.max_depth = 6
    
    def tokenize(self, expression: str) -> List[Token]:
        """Tokenize the expression string."""
        tokens = []
        position = 0
        
        # Remove whitespace
        expression = expression.strip()
        
        # Token patterns
        patterns = [
            (r'\bAND\b', TokenType.AND),
            (r'\bOR\b', TokenType.OR),
            (r'\(', TokenType.LPAREN),
            (r'\)', TokenType.RPAREN),
            (r'[a-zA-Z_][a-zA-Z0-9_]*', TokenType.IDENTIFIER),
        ]
        
        while position < len(expression):
            # Skip whitespace
            if expression[position].isspace():
                position += 1
                continue
            
            matched = False
            for pattern, token_type in patterns:
                match = re.match(pattern, expression[position:])
                if match:
                    value = match.group(0)
                    tokens.append(Token(token_type, value, position))
                    position += len(value)
                    matched = True
                    break
            
            if not matched:
                # Invalid character
                tokens.append(Token(TokenType.IDENTIFIER, expression[position], position))
                position += 1
        
        tokens.append(Token(TokenType.EOF, "", len(expression)))
        return tokens
    
    def validate(self, expression: str, available_conditions: List[str]) -> ValidationResult:
        """Validate the expression for syntax and available conditions."""
        try:
            # Check expression length
            if len(expression.strip()) == 0:
                return ValidationResult(False, "Expression cannot be empty", 0)
            
            # Tokenize
            self.tokens = self.tokenize(expression)
            self.available_conditions = available_conditions
            
            # Check token count
            if len(self.tokens) > self.max_tokens:
                return ValidationResult(False, f"Expression too complex (max {self.max_tokens} tokens)", 0)
            
            # Check for empty expression
            if len(self.tokens) == 1:  # Only EOF token
                return ValidationResult(False, "Expression cannot be empty", 0)
            
            # Parse and check for syntax errors
            self.current_token_index = 0
            ast = self._parse_expression()
            
            # Check for extra tokens
            if self.current_token().type != TokenType.EOF:
                return ValidationResult(False, f"Unexpected token: {self.current_token().value}", 
                                      self.current_token().position)
            
            # Validate conditions
            condition_names = self._extract_condition_names(ast)
            for condition in condition_names:
                if condition not in available_conditions:
                    return ValidationResult(False, f"Unknown condition: {condition}", 0)
            
            return ValidationResult(True)
            
        except Exception as e:
            return ValidationResult(False, str(e), 0)
    
    def parse(self, expression: str, available_conditions: List[str]) -> ASTNode:
        """Parse the expression and return an AST."""
        validation = self.validate(expression, available_conditions)
        if not validation.is_valid:
            raise ValueError(f"Invalid expression: {validation.error_message}")
        
        self.tokens = self.tokenize(expression)
        self.available_conditions = available_conditions
        self.current_token_index = 0
        
        ast = self._parse_expression()
        
        if self.current_token().type != TokenType.EOF:
            raise ValueError(f"Unexpected token: {self.current_token().value}")
        
        return ast
    
    def current_token(self) -> Token:
        """Get the current token."""
        if self.current_token_index < len(self.tokens):
            return self.tokens[self.current_token_index]
        return Token(TokenType.EOF, "", -1)
    
    def advance(self):
        """Move to the next token."""
        if self.current_token_index < len(self.tokens):
            self.current_token_index += 1
    
    def _parse_expression(self, depth: int = 0) -> ASTNode:
        """Parse an expression with OR precedence."""
        if depth > self.max_depth:
            raise ValueError(f"Expression too deeply nested (max depth: {self.max_depth})")
        
        left = self._parse_and_expression(depth + 1)
        
        while self.current_token().type == TokenType.OR:
            op = self.current_token().value
            self.advance()
            right = self._parse_and_expression(depth + 1)
            left = BinaryOpNode(op, left, right)
        
        return left
    
    def _parse_and_expression(self, depth: int) -> ASTNode:
        """Parse an AND expression."""
        left = self._parse_primary(depth + 1)
        
        while self.current_token().type == TokenType.AND:
            op = self.current_token().value
            self.advance()
            right = self._parse_primary(depth + 1)
            left = BinaryOpNode(op, left, right)
        
        return left
    
    def _parse_primary(self, depth: int) -> ASTNode:
        """Parse a primary expression (condition or parenthesized expression)."""
        token = self.current_token()
        
        if token.type == TokenType.IDENTIFIER:
            self.advance()
            return ConditionNode(token.value)
        elif token.type == TokenType.LPAREN:
            self.advance()
            expr = self._parse_expression(depth + 1)
            if self.current_token().type != TokenType.RPAREN:
                raise ValueError(f"Expected ')' but found '{self.current_token().value}'")
            self.advance()
            return expr
        else:
            raise ValueError(f"Unexpected token: {token.value}")
    
    def _extract_condition_names(self, ast: ASTNode) -> List[str]:
        """Extract all condition names from the AST."""
        if isinstance(ast, ConditionNode):
            return [ast.name]
        elif isinstance(ast, BinaryOpNode):
            left_names = self._extract_condition_names(ast.left)
            right_names = self._extract_condition_names(ast.right)
            return left_names + right_names
        else:
            return []
    
    def evaluate(self, ast: ASTNode, conditions: Dict[str, pd.Series]) -> pd.Series:
        """Evaluate the AST against condition series."""
        if isinstance(ast, ConditionNode):
            if ast.name not in conditions:
                raise ValueError(f"Condition '{ast.name}' not found in conditions")
            return conditions[ast.name]
        elif isinstance(ast, BinaryOpNode):
            left_result = self.evaluate(ast.left, conditions)
            right_result = self.evaluate(ast.right, conditions)
            
            if ast.operator == "AND":
                return left_result & right_result
            elif ast.operator == "OR":
                return left_result | right_result
            else:
                raise ValueError(f"Unknown operator: {ast.operator}")
        else:
            raise ValueError(f"Unknown AST node type: {type(ast)}")


def parse_expression(expression: str, available_conditions: List[str]) -> ASTNode:
    """Parse an expression and return an AST."""
    parser = ExpressionParser()
    return parser.parse(expression, available_conditions)


def validate_expression(expression: str, available_conditions: List[str]) -> ValidationResult:
    """Validate an expression without parsing."""
    parser = ExpressionParser()
    return parser.validate(expression, available_conditions)


def evaluate_expression(expression: str, conditions: Dict[str, pd.Series], 
                       available_conditions: List[str]) -> pd.Series:
    """Parse and evaluate an expression in one step."""
    parser = ExpressionParser()
    ast = parser.parse(expression, available_conditions)
    return parser.evaluate(ast, conditions)


def create_signal_series(expression: str, conditions: Dict[str, pd.Series], 
                        available_conditions: List[str]) -> pd.Series:
    """Create a signal series from an expression (1=LONG, 0=CASH)."""
    boolean_result = evaluate_expression(expression, conditions, available_conditions)
    return boolean_result.astype(int)
