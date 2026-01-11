"""
Query optimization utilities for verifying database index usage.

This module provides functions to analyze query performance and verify
that database indexes are being used effectively.
"""

import logging
from typing import Dict, Any, Optional, List
from sqlalchemy import text
from backend.core.database import SessionLocal

logger = logging.getLogger(__name__)


def explain_query(query: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Run EXPLAIN ANALYZE on a query to get execution plan and performance metrics.
    
    Args:
        query: SQL query to analyze
        params: Optional query parameters
        
    Returns:
        Dict with execution plan details
    """
    try:
        with SessionLocal() as session:
            # Wrap query with EXPLAIN ANALYZE
            explain_query_sql = f"EXPLAIN (ANALYZE, BUFFERS, VERBOSE) {query}"
            
            result = session.execute(text(explain_query_sql), params or {})
            rows = result.fetchall()
            
            # Parse execution plan
            plan_lines = [row[0] for row in rows]
            plan_text = '\n'.join(plan_lines)
            
            # Extract key metrics
            metrics = {
                'plan': plan_text,
                'uses_index': 'Index Scan' in plan_text or 'Index Only Scan' in plan_text,
                'uses_seq_scan': 'Seq Scan' in plan_text,
                'execution_time': None,
                'planning_time': None,
                'rows': None,
            }
            
            # Try to extract execution time from plan
            for line in plan_lines:
                if 'Execution Time:' in line:
                    try:
                        metrics['execution_time'] = float(line.split('Execution Time:')[1].split()[0])
                    except:
                        pass
                if 'Planning Time:' in line:
                    try:
                        metrics['planning_time'] = float(line.split('Planning Time:')[1].split()[0])
                    except:
                        pass
            
            return metrics
            
    except Exception as e:
        logger.error(f"Error explaining query: {e}")
        return {
            'error': str(e),
            'plan': None,
            'uses_index': False,
            'uses_seq_scan': True,
        }


def verify_price_data_indexes(symbol: str = "BTCUSDT", exchange: str = "Binance") -> Dict[str, Any]:
    """
    Verify that price_data table indexes are being used for common queries.
    
    Args:
        symbol: Trading pair symbol to test
        exchange: Exchange name to test
        
    Returns:
        Dict with index verification results
    """
    results = {
        'symbol': symbol,
        'exchange': exchange,
        'queries': {},
    }
    
    # Test 1: Range query with symbol, exchange, and date filter (should use composite index)
    query1 = """
        SELECT * FROM price_data 
        WHERE symbol = :symbol 
        AND exchange = :exchange 
        AND date BETWEEN :start_date AND :end_date 
        ORDER BY date
    """
    params1 = {
        'symbol': symbol,
        'exchange': exchange,
        'start_date': '2024-01-01',
        'end_date': '2024-12-31'
    }
    
    explain1 = explain_query(query1, params1)
    results['queries']['range_query'] = {
        'query': 'Range query with symbol, exchange, date',
        'uses_index': explain1.get('uses_index', False),
        'uses_seq_scan': explain1.get('uses_seq_scan', False),
        'execution_time_ms': explain1.get('execution_time'),
        'plan': explain1.get('plan', '')[:500]  # First 500 chars
    }
    
    # Test 2: Recent data query (should use partial index for recent dates)
    query2 = """
        SELECT * FROM price_data 
        WHERE symbol = :symbol 
        AND exchange = :exchange 
        AND date > NOW() - INTERVAL '30 days'
        ORDER BY date
    """
    params2 = {
        'symbol': symbol,
        'exchange': exchange
    }
    
    explain2 = explain_query(query2, params2)
    results['queries']['recent_data_query'] = {
        'query': 'Recent data query (last 30 days)',
        'uses_index': explain2.get('uses_index', False),
        'uses_seq_scan': explain2.get('uses_seq_scan', False),
        'execution_time_ms': explain2.get('execution_time'),
        'plan': explain2.get('plan', '')[:500]
    }
    
    # Test 3: Symbol-only query (should use symbol index)
    query3 = """
        SELECT COUNT(*) FROM price_data 
        WHERE symbol = :symbol
    """
    params3 = {'symbol': symbol}
    
    explain3 = explain_query(query3, params3)
    results['queries']['symbol_query'] = {
        'query': 'Symbol-only query',
        'uses_index': explain3.get('uses_index', False),
        'uses_seq_scan': explain3.get('uses_seq_scan', False),
        'execution_time_ms': explain3.get('execution_time'),
        'plan': explain3.get('plan', '')[:500]
    }
    
    # Summary
    all_use_index = all(q.get('uses_index', False) for q in results['queries'].values())
    results['summary'] = {
        'all_queries_use_index': all_use_index,
        'total_queries_tested': len(results['queries']),
        'queries_using_index': sum(1 for q in results['queries'].values() if q.get('uses_index', False)),
        'recommendations': []
    }
    
    # Add recommendations
    if not all_use_index:
        results['summary']['recommendations'].append(
            "Some queries are not using indexes. Consider adding or updating indexes."
        )
    
    if any(q.get('uses_seq_scan', False) for q in results['queries'].values()):
        results['summary']['recommendations'].append(
            "Some queries are using sequential scans. Verify indexes exist and are up to date."
        )
    
    return results


def get_index_statistics() -> Dict[str, Any]:
    """
    Get statistics about indexes on the price_data table.
    
    Returns:
        Dict with index information
    """
    try:
        with SessionLocal() as session:
            # Get index information
            query = """
                SELECT 
                    indexname,
                    indexdef,
                    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
                FROM pg_indexes 
                WHERE tablename = 'price_data'
                ORDER BY indexname
            """
            
            result = session.execute(text(query))
            indexes = []
            
            for row in result.fetchall():
                indexes.append({
                    'name': row[0],
                    'definition': row[1],
                    'size': row[2]
                })
            
            # Get table statistics
            stats_query = """
                SELECT 
                    pg_size_pretty(pg_total_relation_size('price_data')) as total_size,
                    pg_size_pretty(pg_relation_size('price_data')) as table_size,
                    (SELECT COUNT(*) FROM price_data) as row_count
            """
            
            stats_result = session.execute(text(stats_query))
            stats_row = stats_result.fetchone()
            
            return {
                'indexes': indexes,
                'table_statistics': {
                    'total_size': stats_row[0] if stats_row else None,
                    'table_size': stats_row[1] if stats_row else None,
                    'row_count': stats_row[2] if stats_row else None,
                }
            }
            
    except Exception as e:
        logger.error(f"Error getting index statistics: {e}")
        return {
            'error': str(e),
            'indexes': [],
            'table_statistics': {}
        }

