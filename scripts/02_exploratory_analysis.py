import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)

df = pd.read_csv("data/customer_journey_cleaned.csv")

print("=" * 60)
print("EXPLORATORY DATA ANALYSIS")
print("=" * 60)

print("\n--- Summary Statistics (Numeric Columns) ---")
numeric_cols = ['Page Views', 'Session Duration', 'Customer Feedback Score', 'Purchase Value']
print(df[numeric_cols].describe().to_string())

print("\n--- Categorical Distributions ---")
categorical_cols = ['Customer Segment', 'Age Group', 'Region', 'Acquisition Channel', 'Campaign Name', 'Bounce Status', 'Conversion Status', 'Customer Retention Status']
for col in categorical_cols:
    print(f"\n{col}:")
    print(df[col].value_counts().to_string())
    print(f"  ({df[col].nunique()} unique values)")

fig, axes = plt.subplots(2, 3, figsize=(15, 10))
fig.suptitle("Customer Journey & Funnel Analysis - EDA", fontsize=16, fontweight='bold')

df['Customer Segment'].value_counts().plot(kind='bar', ax=axes[0, 0], color=['#2B6CB0', '#319795', '#D69E2E'])
axes[0, 0].set_title("Customers by Segment")
axes[0, 0].set_xlabel("")

df['Acquisition Channel'].value_counts().plot(kind='bar', ax=axes[0, 1], color='#3182CE')
axes[0, 1].set_title("Customers by Channel")
axes[0, 1].tick_params(axis='x', rotation=45)

df['Age Group'].value_counts().sort_index().plot(kind='bar', ax=axes[0, 2], color='#319795')
axes[0, 2].set_title("Customers by Age Group")

df['Region'].value_counts().plot(kind='bar', ax=axes[1, 0], color='#38A169')
axes[1, 0].set_title("Customers by Region")

df['Conversion Status'].value_counts().plot(kind='pie', ax=axes[1, 1], autopct='%1.1f%%', colors=['#38A169', '#E53E3E'])
axes[1, 1].set_title("Conversion Status")

df['Customer Retention Status'].value_counts().plot(kind='bar', ax=axes[1, 2], color=['#38A169', '#E53E3E', '#D69E2E'])
axes[1, 2].set_title("Retention Status")

plt.tight_layout()
plt.savefig("docs/assets/eda_overview.png", dpi=150, bbox_inches='tight')
print("\nEDA overview chart saved to docs/assets/eda_overview.png")

corr_cols = ['Page Views', 'Add to Cart', 'Checkout Started', 'Purchase Completed', 'Purchase Value', 'Session Duration', 'Customer Feedback Score']
corr_df = df[corr_cols].copy()
plt.figure(figsize=(10, 8))
sns.heatmap(corr_df.corr(), annot=True, cmap='Blues', fmt='.2f', linewidths=0.5)
plt.title("Correlation Matrix - Customer Journey Metrics", fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig("docs/assets/correlation_heatmap.png", dpi=150, bbox_inches='tight')
print("Correlation heatmap saved to docs/assets/correlation_heatmap.png")
plt.close('all')
