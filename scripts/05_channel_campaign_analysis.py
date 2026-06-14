import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.rcParams['figure.figsize'] = (14, 10)

df = pd.read_csv("data/customer_journey_cleaned.csv")

print("=" * 60)
print("CHANNEL & CAMPAIGN PERFORMANCE ANALYSIS")
print("=" * 60)

channels = df['Acquisition Channel'].unique()
print(f"\nChannels analyzed: {list(channels)}")
campaigns = df['Campaign Name'].unique()
print(f"Campaigns analyzed: {list(campaigns)}")

# Fixed Cost Per Lead (CPL) per channel to ensure consistent, non-random calculations
CPL_MAP = {
    'Paid Ads': 12.50,
    'Social Media': 8.20,
    'Organic Search': 1.50,
    'Email': 2.10,
    'Referral': 3.50,
    'Direct': 0.50
}

channel_data = []
for ch in channels:
    subset = df[df['Acquisition Channel'] == ch]
    total = len(subset)
    conversions = subset['Purchase Completed'].sum()
    revenue = subset['Purchase Value'].sum()
    conv_rate = round(conversions / total * 100, 1)
    retention = round(len(subset[subset['Customer Retention Status'] == 'Retained']) / total * 100, 1)
    cost_per_lead = CPL_MAP.get(ch, 5.00)
    cac = round(cost_per_lead / (conversions / total) if conversions > 0 else 0, 2)


    channel_data.append({
        'Channel': ch,
        'Visitors': total,
        'Conversions': conversions,
        'Conv Rate %': conv_rate,
        'Revenue': round(revenue, 2),
        'Retention %': retention,
        'Est. Cost per Lead': cost_per_lead,
        'Est. CAC': cac,
        'ROAS': round(revenue / (cost_per_lead * total) if cost_per_lead > 0 else 0, 2)
    })

channel_df = pd.DataFrame(channel_data)
channel_df = channel_df.sort_values('Conv Rate %', ascending=False)
print("\n--- Channel Performance ---")
print(channel_df.to_string(index=False))

campaign_data = []
for camp in campaigns:
    subset = df[df['Campaign Name'] == camp]
    total = len(subset)
    conversions = subset['Purchase Completed'].sum()
    revenue = subset['Purchase Value'].sum()
    conv_rate = round(conversions / total * 100, 1)
    retention = round(len(subset[subset['Customer Retention Status'] == 'Retained']) / total * 100, 1)

    campaign_data.append({
        'Campaign': camp,
        'Visitors': total,
        'Conversions': conversions,
        'Conv Rate %': conv_rate,
        'Revenue': round(revenue, 2),
        'Retention %': retention,
        'Avg Feedback': round(subset['Customer Feedback Score'].mean(), 2)
    })

campaign_df = pd.DataFrame(campaign_data)
campaign_df = campaign_df.sort_values('Conv Rate %', ascending=False)
print("\n--- Campaign Performance ---")
print(campaign_df.to_string(index=False))

fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle("Channel & Campaign Performance Analysis", fontsize=16, fontweight='bold')

colors_ch = ['#2B6CB0', '#3182CE', '#63B3ED', '#F6AD55', '#38A169', '#E53E3E']
axes[0, 0].bar(channel_df['Channel'], channel_df['Conv Rate %'], color=colors_ch[:len(channel_df)])
axes[0, 0].set_title("Conversion Rate by Channel", fontsize=13, fontweight='bold')
axes[0, 0].set_ylabel("Conversion Rate %")
axes[0, 0].tick_params(axis='x', rotation=45)
for i, v in enumerate(channel_df['Conv Rate %']):
    axes[0, 0].text(i, v + 0.3, f'{v}%', ha='center', fontsize=9, fontweight='bold')

axes[0, 1].bar(channel_df['Channel'], channel_df['Revenue'], color=colors_ch[:len(channel_df)])
axes[0, 1].set_title("Revenue by Channel", fontsize=13, fontweight='bold')
axes[0, 1].set_ylabel("Revenue ($)")
axes[0, 1].tick_params(axis='x', rotation=45)
for i, v in enumerate(channel_df['Revenue']):
    axes[0, 1].text(i, v + 2, f'${v:.0f}', ha='center', fontsize=9, fontweight='bold')

axes[1, 0].barh(campaign_df['Campaign'], campaign_df['Conv Rate %'], color='#319795')
axes[1, 0].set_title("Conversion Rate by Campaign", fontsize=13, fontweight='bold')
axes[1, 0].set_xlabel("Conversion Rate %")
for i, v in enumerate(campaign_df['Conv Rate %']):
    axes[1, 0].text(v + 0.3, i, f'{v}%', va='center', fontsize=9, fontweight='bold')
axes[1, 0].invert_yaxis()

retention_data = []
for ch in channels:
    subset = df[df['Acquisition Channel'] == ch]
    retained = len(subset[subset['Customer Retention Status'] == 'Retained'])
    churned = len(subset[subset['Customer Retention Status'] == 'Churned'])
    at_risk = len(subset[subset['Customer Retention Status'] == 'At Risk'])
    retention_data.append({'Channel': ch, 'Retained': retained, 'Churned': churned, 'At Risk': at_risk})

ret_df = pd.DataFrame(retention_data)
ret_df.set_index('Channel')[['Retained', 'Churned', 'At Risk']].plot(kind='bar', stacked=True, ax=axes[1, 1], color=['#38A169', '#E53E3E', '#D69E2E'])
axes[1, 1].set_title("Retention Status by Channel", fontsize=13, fontweight='bold')
axes[1, 1].set_ylabel("Customers")
axes[1, 1].tick_params(axis='x', rotation=45)
axes[1, 1].legend(title='Status')

plt.tight_layout()
plt.savefig("docs/assets/channel_campaign_analysis.png", dpi=150, bbox_inches='tight')
print("\nChannel & campaign chart saved to docs/assets/channel_campaign_analysis.png")
plt.close('all')

channel_df.to_csv("docs/assets/channel_performance.csv", index=False)
campaign_df.to_csv("docs/assets/campaign_performance.csv", index=False)
print("Channel & campaign tables saved to docs/assets/")
