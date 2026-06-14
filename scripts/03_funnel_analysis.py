import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.rcParams['figure.figsize'] = (10, 7)

df = pd.read_csv("data/customer_journey_cleaned.csv")

print("=" * 60)
print("FUNNEL ANALYSIS")
print("=" * 60)

funnel_stages_order = ["Website Visit", "Product Viewed", "Add to Cart", "Checkout Started", "Purchase Completed"]

funnel_stage_map = {
    "Website Visit": len(df),
    "Product Viewed": df['Product Viewed'].sum(),
    "Add to Cart": df['Add to Cart'].sum(),
    "Checkout Started": df['Checkout Started'].sum(),
    "Purchase Completed": df['Purchase Completed'].sum()
}

funnel_df = pd.DataFrame(list(funnel_stage_map.items()), columns=['Stage', 'Count'])
funnel_df['% of Total Visitors'] = round(funnel_df['Count'] / funnel_df['Count'].iloc[0] * 100, 1)

drop_off = []
for i in range(len(funnel_df) - 1):
    current = funnel_df.iloc[i]['Count']
    next_val = funnel_df.iloc[i + 1]['Count']
    loss = current - next_val
    drop_pct = round((loss / current) * 100, 1) if current > 0 else 0
    drop_off.append({
        'From': funnel_df.iloc[i]['Stage'],
        'To': funnel_df.iloc[i + 1]['Stage'],
        'Lost': loss,
        'Drop-off %': drop_pct,
        'Stage Conversion %': round(next_val / current * 100, 1)
    })

drop_off_df = pd.DataFrame(drop_off)

print("\n--- Funnel Table ---")
print(funnel_df.to_string(index=False))

print("\n--- Stage Transition Analysis ---")
print(drop_off_df.to_string(index=False))

overall_conversion = round(funnel_df.iloc[-1]['Count'] / funnel_df.iloc[0]['Count'] * 100, 1)
print(f"\nOverall Conversion Rate: {overall_conversion}%")

colors = ['#2B6CB0', '#3182CE', '#63B3ED', '#F6AD55', '#38A169']

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
fig.suptitle("Funnel Analysis Dashboard", fontsize=16, fontweight='bold')

bars = ax1.barh(funnel_df['Stage'], funnel_df['Count'], color=colors)
ax1.set_xlabel("Number of Customers")
ax1.set_title("Customer Journey Funnel", fontsize=13, fontweight='bold')
for bar, count, pct in zip(bars, funnel_df['Count'], funnel_df['% of Total Visitors']):
    ax1.text(bar.get_width() + 10, bar.get_y() + bar.get_height() / 2,
             f"{count} ({pct}%)", va='center', fontsize=10, fontweight='bold')
ax1.invert_yaxis()

stages = [d['From'] + " → " + d['To'] for d in drop_off]
drop_pcts = [d['Drop-off %'] for d in drop_off]
conv_pcts = [d['Stage Conversion %'] for d in drop_off]

x = np.arange(len(stages))
width = 0.35
ax2.bar(x - width / 2, drop_pcts, width, label='Drop-off %', color='#E53E3E')
ax2.bar(x + width / 2, conv_pcts, width, label='Stage Conversion %', color='#38A169')
ax2.set_xticks(x)
ax2.set_xticklabels(stages, fontsize=8, rotation=15)
ax2.set_ylabel("Percentage (%)")
ax2.set_title("Stage Transition: Drop-off vs Conversion", fontsize=13, fontweight='bold')
ax2.legend()
ax2.axhline(y=50, color='gray', linestyle='--', alpha=0.5)

plt.tight_layout()
plt.savefig("docs/assets/funnel_analysis.png", dpi=150, bbox_inches='tight')
print("\nFunnel analysis chart saved to docs/assets/funnel_analysis.png")
plt.close('all')

funnel_df.to_csv("docs/assets/funnel_table.csv", index=False)
drop_off_df.to_csv("docs/assets/drop_off_table.csv", index=False)
print("Funnel tables saved to docs/assets/")
