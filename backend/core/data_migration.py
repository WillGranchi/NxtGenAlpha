"""
Data migration utility to migrate CSV price data to PostgreSQL database.

This module provides functions to bulk import existing CSV data into the price_data table.
"""

import os
import logging
import pandas as pd
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.core.database import SessionLocal, engine
from backend.api.models.db_models import PriceData
from backend.core.data_loader import load_crypto_data, _clean_data

logger = logging.getLogger(__name__)


def migrate_csv_to_database(
    symbol: str = "BTCUSDT",
    exchange: str = "Binance",
    csv_file_path: Optional[str] = None,
    batch_size: int = 1000,
    progress_callback: Optional[callable] = None
) -> Dict[str, Any]:
    """
    Migrate CSV price data to PostgreSQL database.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        exchange: Exchange name (e.g., "Binance")
        csv_file_path: Path to CSV file. If None, uses default path from load_crypto_data
        batch_size: Number of records to insert per batch
        progress_callback: Optional callback function(progress, total) for progress updates
        
    Returns:
        Dict with migration results: {
            'success': bool,
            'total_records': int,
            'inserted': int,
            'updated': int,
            'errors': int,
            'date_range': {'start': str, 'end': str}
        }
    """
    logger.info(f"Starting CSV to database migration for {symbol} on {exchange}")
    
    try:
        # Load CSV data using existing function
        if csv_file_path:
            df = load_crypto_data(symbol=symbol, file_path=csv_file_path)
        else:
            df = load_crypto_data(symbol=symbol)
        
        if df.empty:
            logger.warning(f"No data found for {symbol}")
            return {
                'success': False,
                'total_records': 0,
                'inserted': 0,
                'updated': 0,
                'errors': 0,
                'error_message': 'No data found in CSV file'
            }
        
        # Ensure we have the required columns
        required_columns = ['Open', 'High', 'Low', 'Close']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            error_msg = f"Missing required columns: {missing_columns}"
            logger.error(error_msg)
            return {
                'success': False,
                'total_records': 0,
                'inserted': 0,
                'updated': 0,
                'errors': 0,
                'error_message': error_msg
            }
        
        # Reset index to get Date as column
        df_migrate = df.reset_index()
        
        # Ensure Date column exists and is datetime
        if 'Date' not in df_migrate.columns:
            logger.error("Date column not found after reset_index")
            return {
                'success': False,
                'total_records': 0,
                'inserted': 0,
                'updated': 0,
                'errors': 0,
                'error_message': 'Date column not found'
            }
        
        df_migrate['Date'] = pd.to_datetime(df_migrate['Date'])
        
        # Prepare data for bulk insert
        total_records = len(df_migrate)
        inserted = 0
        updated = 0
        errors = 0
        
        logger.info(f"Migrating {total_records} records for {symbol} on {exchange}")
        
        # Use bulk insert with ON CONFLICT DO UPDATE
        # Process in batches to avoid memory issues
        with SessionLocal() as session:
            for i in range(0, total_records, batch_size):
                batch = df_migrate.iloc[i:i + batch_size]
                
                # Prepare batch data
                records = []
                for _, row in batch.iterrows():
                    try:
                        record = {
                            'symbol': symbol,
                            'exchange': exchange,
                            'date': row['Date'],
                            'open': float(row['Open']),
                            'high': float(row['High']),
                            'low': float(row['Low']),
                            'close': float(row['Close']),
                            'volume': float(row['Volume']) if 'Volume' in row and pd.notna(row.get('Volume')) else None,
                        }
                        records.append(record)
                    except Exception as e:
                        logger.warning(f"Error preparing record for date {row.get('Date')}: {e}")
                        errors += 1
                        continue
                
                if not records:
                    continue
                
                # Bulk insert/update using PostgreSQL ON CONFLICT
                try:
                    # Use raw SQL for better performance with bulk operations
                    values_list = []
                    for record in records:
                        date_str = record['date'].strftime('%Y-%m-%d %H:%M:%S')
                        volume_val = record['volume'] if record['volume'] is not None else 'NULL'
                        values_list.append(
                            f"('{symbol}', '{exchange}', '{date_str}', "
                            f"{record['open']}, {record['high']}, {record['low']}, "
                            f"{record['close']}, {volume_val})"
                        )
                    
                    values_sql = ', '.join(values_list)
                    
                    # Use ON CONFLICT DO UPDATE to handle duplicates
                    sql = f"""
                        INSERT INTO price_data (symbol, exchange, date, open, high, low, close, volume, updated_at)
                        VALUES {values_sql}
                        ON CONFLICT (symbol, exchange, date) 
                        DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume,
                            updated_at = CURRENT_TIMESTAMP
                    """
                    
                    result = session.execute(text(sql))
                    session.commit()
                    
                    # Count inserted vs updated (PostgreSQL doesn't return this directly)
                    # We'll estimate: if no conflict, it's an insert; if conflict, it's an update
                    # For simplicity, we'll count all as inserted (actual count would require checking)
                    batch_inserted = len(records)
                    inserted += batch_inserted
                    
                    if progress_callback:
                        progress_callback(min(i + batch_size, total_records), total_records)
                    
                    logger.debug(f"Processed batch {i//batch_size + 1}: {batch_inserted} records")
                    
                except Exception as e:
                    logger.error(f"Error inserting batch starting at index {i}: {e}")
                    session.rollback()
                    errors += len(records)
                    continue
        
        # Get date range
        date_range = {
            'start': df_migrate['Date'].min().strftime('%Y-%m-%d'),
            'end': df_migrate['Date'].max().strftime('%Y-%m-%d')
        }
        
        logger.info(f"Migration completed for {symbol}: {inserted} records processed, {errors} errors")
        
        return {
            'success': True,
            'total_records': total_records,
            'inserted': inserted,
            'updated': updated,  # Note: PostgreSQL doesn't distinguish, so this is 0
            'errors': errors,
            'date_range': date_range
        }
        
    except Exception as e:
        logger.error(f"Error migrating CSV to database for {symbol}: {e}", exc_info=True)
        return {
            'success': False,
            'total_records': 0,
            'inserted': 0,
            'updated': 0,
            'errors': 0,
            'error_message': str(e)
        }


def migrate_all_csv_files(
    data_dir: Optional[str] = None,
    exchange: str = "Binance",
    batch_size: int = 1000
) -> Dict[str, Any]:
    """
    Migrate all CSV files in the data directory to the database.
    
    Args:
        data_dir: Directory containing CSV files. If None, uses default data directory
        exchange: Exchange name to use for all migrations
        batch_size: Number of records to insert per batch
        
    Returns:
        Dict with migration results for each symbol
    """
    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    
    data_path = Path(data_dir)
    if not data_path.exists():
        logger.error(f"Data directory not found: {data_dir}")
        return {'success': False, 'error': 'Data directory not found'}
    
    # Find all CSV files
    csv_files = list(data_path.glob('*_historical_data.csv'))
    csv_files.extend(data_path.glob('Bitcoin Historical Data*.csv'))
    
    results = {}
    
    for csv_file in csv_files:
        # Extract symbol from filename
        # Format: {SYMBOL}_historical_data.csv or Bitcoin Historical Data*.csv
        if 'Bitcoin' in csv_file.name:
            symbol = "BTCUSDT"
        else:
            # Extract symbol from filename (e.g., "ETHUSDT_historical_data.csv" -> "ETHUSDT")
            symbol = csv_file.name.replace('_historical_data.csv', '').upper()
        
        logger.info(f"Migrating {symbol} from {csv_file.name}")
        
        result = migrate_csv_to_database(
            symbol=symbol,
            exchange=exchange,
            csv_file_path=str(csv_file),
            batch_size=batch_size
        )
        
        results[symbol] = result
    
    return {
        'success': True,
        'results': results,
        'total_symbols': len(results)
    }

