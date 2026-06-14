import pandas as pd
import numpy as np

df = pd.read_csv("data/customer_journey_data.csv")

print("=" * 60)
print("DATA CLEANING REPORT")
print("=" * 60)

print(f"\nOriginal shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

print("\n--- Missing Values ---")
print(df.isnull().sum().to_string())

print("\n--- Data Types ---")
print(df.dtypes.to_string())

df['Customer Feedback Score'] = pd.to_numeric(df['Customer Feedback Score'], errors='coerce')
feedback_median = df['Customer Feedback Score'].median()
df['Customer Feedback Score'] = df['Customer Feedback Score'].fillna(feedback_median)
df['Customer Feedback Score'] = df['Customer Feedback Score'].astype(int)

print(f"\n--- Cleaned Missing Values ---")
print(f"Feedback Score: filled {int(df['Customer Feedback Score'].isna().sum())} missing with median ({feedback_median})")

df['Website Visit Date'] = pd.to_datetime(df['Website Visit Date'])
df['Visit Month'] = df['Website Visit Date'].dt.month_name()
df['Visit Day'] = df['Website Visit Date'].dt.day_name()

kpi_calc = {
    'total_visitors': len(df),
    'leads_generated': df['Product Viewed'].sum(),
    'add_to_cart_count': df['Add to Cart'].sum(),
    'checkout_count': df['Checkout Started'].sum(),
    'purchase_count': df['Purchase Completed'].sum(),
    'total_revenue': df['Purchase Value'].sum(),
    'avg_purchase_value': round(df[df['Purchase Completed'] == 1]['Purchase Value'].mean(), 2),
    'add_to_cart_rate': round(df['Add to Cart'].sum() / df['Product Viewed'].sum() * 100, 1) if df['Product Viewed'].sum() > 0 else 0,
    'checkout_rate': round(df['Checkout Started'].sum() / df['Add to Cart'].sum() * 100, 1) if df['Add to Cart'].sum() > 0 else 0,
    'conversion_rate': round(df['Purchase Completed'].sum() / len(df) * 100, 1),
    'retention_rate': round(len(df[df['Customer Retention Status'] == 'Retained']) / len(df) * 100, 1),
    'bounce_rate': round(len(df[df['Bounce Status'] == 'Bounced']) / len(df) * 100, 1),
    'avg_session_duration': round(df['Session Duration'].mean(), 1),
    'avg_feedback_score': round(df['Customer Feedback Score'].mean(), 2)
}

print("\n--- Key Metrics (Cleaned Dataset) ---")
for k, v in kpi_calc.items():
    print(f"{k}: {v}")

df.to_csv("data/customer_journey_cleaned.csv", index=False)
print("\nCleaned dataset saved to data/customer_journey_cleaned.csv")
