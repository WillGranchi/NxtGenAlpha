import pandas as pd
from datetime import datetime
import os

# Get the correct file path
csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Bitcoin Historical Data4.csv')
print(f"Looking for CSV at: {csv_path}")
print(f"File exists: {os.path.exists(csv_path)}")

# Read the CSV with correct date format
df = pd.read_csv(csv_path, parse_dates=['Date'], date_format='%m/%d/%Y')

print("\nData shape:", df.shape)
print("\nFirst 5 rows:")
print(df.head())
print("\nData types:")
print(df.dtypes)
print("\nDate range:")
print(f"From: {df['Date'].min()}")
print(f"To: {df['Date'].max()}")
print("\nColumn names:")
print(df.columns.tolist())