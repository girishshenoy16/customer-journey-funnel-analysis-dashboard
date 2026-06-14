import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.rcParams['figure.figsize'] = (14, 8)

df = pd.read_csv("data/customer_journey_cleaned.csv")

print("=" * 60)
print("CUSTOMER SEGMENTATION ANALYSIS")
print("=" * 60)

segment_groups = {
    'Customer Segment': ['Premium', 'Standard', 'Budget'],
    'Age Group': ['18-24', '25-34', '35-44', '45-54', '55+'],
    'Region': ['North', 'South', 'East', 'West', 'Central']
}

fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle("Segment-wise Conversion Analysis", fontsize=16, fontweight='bold')

for idx, (col, values) in enumerate(segment_groups.items()):
    row, col_idx = divmod(idx, 2)
    segment_data = []
    for val in values:
        subset = df[df[col] == val]
        total = len(subset)
        converted = subset['Purchase Completed'].sum()
        conv_rate = round(converted / total * 100, 1) if total > 0 else 0
        retention = round(len(subset[subset['Customer Retention Status'] == 'Retained']) / total * 100, 1) if total > 0 else 0
        avg_rev = round(subset['Purchase Value'].mean(), 2)
        segment_data.append({'Segment': val, 'Total': total, 'Converted': converted, 'Conv Rate': conv_rate, 'Retention': retention, 'Avg Revenue': avg_rev})

    seg_df = pd.DataFrame(segment_data)
    print(f"\n--- {col} ---")
    print(seg_df.to_string(index=False))

    x = np.arange(len(values))
    width = 0.35
    axes[row, col_idx].bar(x - width / 2, seg_df['Conv Rate'], width, label='Conversion Rate %', color='#2B6CB0')
    axes[row, col_idx].bar(x + width / 2, seg_df['Retention'], width, label='Retention Rate %', color='#38A169')

    for i, v in enumerate(seg_df['Conv Rate']):
        axes[row, col_idx].text(i - width / 2, v + 0.5, f'{v}%', ha='center', fontsize=9, fontweight='bold')
    for i, v in enumerate(seg_df['Retention']):
        axes[row, col_idx].text(i + width / 2, v + 0.5, f'{v}%', ha='center', fontsize=9, fontweight='bold')

    axes[row, col_idx].set_xticks(x)
    axes[row, col_idx].set_xticklabels(values, fontsize=10)
    axes[row, col_idx].set_ylabel("Percentage (%)")
    axes[row, col_idx].set_title(f"Conversion & Retention by {col}", fontsize=12, fontweight='bold')
    axes[row, col_idx].legend()
    axes[row, col_idx].set_ylim(0, 100)

axes[1, 1].axis('off')

plt.tight_layout()
plt.savefig("docs/assets/segmentation_analysis.png", dpi=150, bbox_inches='tight')
print("\nSegmentation chart saved to docs/assets/segmentation_analysis.png")
plt.close('all')

for col in segment_groups:
    segment_data = []
    for val in segment_groups[col]:
        subset = df[df[col] == val]
        total = len(subset)
        converted = subset['Purchase Completed'].sum()
        seg_data = {
            col: val,
            'Total Customers': total,
            'Product Viewed': subset['Product Viewed'].sum(),
            'Add to Cart': subset['Add to Cart'].sum(),
            'Checkout Started': subset['Checkout Started'].sum(),
            'Purchase Completed': converted,
            'Conversion Rate %': round(converted / total * 100, 1),
            'Total Revenue': round(subset['Purchase Value'].sum(), 2),
            'Avg Revenue per Customer': round(subset['Purchase Value'].mean(), 2),
            'Retention Rate %': round(len(subset[subset['Customer Retention Status'] == 'Retained']) / total * 100, 1),
            'Avg Feedback Score': round(subset['Customer Feedback Score'].mean(), 2)
        }
        segment_data.append(seg_data)
    seg_detail_df = pd.DataFrame(segment_data)
    seg_detail_df.to_csv(f"docs/assets/segment_detail_{col.replace(' ', '_').lower()}.csv", index=False)
    print(f"Segment details for {col} saved.")
