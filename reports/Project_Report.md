# Customer Journey & Funnel Analysis Dashboard — Project Report

## 1. Executive Summary

This project presents a comprehensive **Customer Journey & Funnel Analysis Dashboard** built to analyze customer behavior across the complete buying journey. Using a dataset of 120 customer records spanning 5 funnel stages, 6 acquisition channels, 3 customer segments, and 8 marketing campaigns, this analysis identifies critical drop-off points, evaluates channel and campaign performance, and provides data-backed recommendations to improve conversion rates and customer retention.

**Key Findings:**
- Overall conversion rate: **15.8%** (19 out of 120 visitors purchased)
- Biggest drop-off: **Product Viewed → Add to Cart (53.3%)**
- Second critical drop-off: **Checkout Started → Purchase Completed (51.3%)**
- Best performing channel: **Referral (30.0% conversion rate)**
- Best performing segment: **Premium (33.3% conversion rate)**
- Best performing region: **West (25.8% conversion rate)**
- Total revenue tracked: **$2,129.48**
- Overall retention rate: **28.3%**

---

## 2. Business Problem & Objectives

### Problem Statement
The company is experiencing low conversion rates from website visitors to paying customers. Despite significant marketing spend across multiple channels, a large percentage of prospects drop off at various stages of the customer journey. The business lacks visibility into:
- Where exactly customers are dropping off in the funnel
- Which acquisition channels deliver the highest-quality customers
- Which customer segments are most valuable
- How to improve customer retention

### Objectives
1. Map the complete customer journey from first visit to purchase and retention
2. Identify funnel stages with the highest drop-off rates
3. Evaluate channel performance and ROI
4. Analyze customer segments for targeted optimization
5. Provide actionable recommendations for conversion improvement
6. Build an executive-ready dashboard for ongoing monitoring

---

## 3. Customer Journey Mapping Framework

### Funnel Stages Defined

| Stage | Description | Metric |
|-------|-------------|--------|
| **1. Website Visit** | Customer lands on website | Total Visitors |
| **2. Product Viewed** | Customer views at least one product | Leads Generated |
| **3. Add to Cart** | Customer adds product to cart | Add-to-Cart Rate |
| **4. Checkout Started** | Customer begins checkout process | Checkout Rate |
| **5. Purchase Completed** | Customer completes purchase | Conversion Rate |
| **6. Retention** | Customer returns or remains engaged | Retention Rate |

### Customer Journey Flow
```
Awareness → Interest → Consideration → Intent → Purchase → Retention
  (Visit)    (View)      (Cart)       (Checkout)  (Buy)     (Return)
```

---

## 4. Data Dictionary

| Column | Type | Description |
|--------|------|-------------|
| Customer ID | Text | Unique identifier (CUST0001–CUST0120) |
| Customer Name | Text | Full name of customer |
| Customer Segment | Categorical | Premium / Standard / Budget |
| Age Group | Categorical | 18-24 / 25-34 / 35-44 / 45-54 / 55+ |
| Region | Categorical | North / South / East / West / Central |
| Acquisition Channel | Categorical | Organic Search / Paid Ads / Social Media / Email / Referral / Direct |
| Campaign Name | Categorical | Summer Sale / Winter Fest / New User Offer / Referral Bonus / Holiday Special / Flash Sale / Brand Awareness / Retargeting |
| Website Visit Date | Date | Date of first website visit (Jan–Jun 2024) |
| Page Views | Numeric | Number of pages viewed (1–25) |
| Product Viewed | Binary | 1 = Product viewed, 0 = Not viewed |
| Add to Cart | Binary | 1 = Added to cart, 0 = Did not add |
| Checkout Started | Binary | 1 = Started checkout, 0 = Did not start |
| Purchase Completed | Binary | 1 = Purchased, 0 = Did not purchase |
| Purchase Value | Numeric | Total purchase amount in USD ($15–$250) |
| Session Duration | Numeric | Session length in seconds (10–1800) |
| Bounce Status | Categorical | Bounced / Engaged |
| Customer Feedback Score | Numeric | Rating 1–5 (5 = Best) |
| Customer Retention Status | Categorical | Retained / Churned / At Risk |
| Funnel Stage | Categorical | Current stage in the funnel |
| Conversion Status | Categorical | Converted / Not Converted |

---

## 5. Funnel Analysis Methodology

### Approach
The funnel was analyzed using a **stage-by-stage conversion tracking** methodology:
1. Count customers at each funnel stage
2. Calculate stage-to-stage conversion rates
3. Calculate stage-to-stage drop-off rates
4. Identify critical bottlenecks (>30% drop-off flagged as warning, >50% as critical)

### Funnel Table

| Stage | Count | % of Visitors |
|-------|-------|---------------|
| Website Visit | 120 | 100.0% |
| Product Viewed | 120 | 100.0% |
| Add to Cart | 56 | 46.7% |
| Checkout Started | 39 | 32.5% |
| Purchase Completed | 19 | 15.8% |

### Stage Transition Analysis

| From | To | Customers Lost | Drop-off % | Stage Conversion % |
|------|----|----------------|------------|-------------------|
| Website Visit | Product Viewed | 0 | 0.0% | 100.0% |
| Product Viewed | Add to Cart | 64 | 53.3% | 46.7% |
| Add to Cart | Checkout Started | 17 | 30.4% | 69.6% |
| Checkout Started | Purchase Completed | 20 | 51.3% | 48.7% |

**Critical Findings:**
- **🔴 Critical: View → Cart drop-off at 53.3%** — Half of all interested visitors leave before adding to cart
- **🔴 Critical: Checkout → Purchase drop-off at 51.3%** — Majority of checkout initiations are abandoned
- **🟡 Warning: Cart → Checkout drop-off at 30.4%**

---

## 6. KPI Definitions & Formulas

| KPI | Formula | Value |
|-----|---------|-------|
| **Total Visitors** | Count of all unique visitors | 120 |
| **Leads Generated** | Count of visitors who viewed a product | 120 |
| **Add-to-Cart Rate** | (Add to Cart / Product Viewed) × 100 | 46.7% |
| **Checkout Rate** | (Checkout Started / Add to Cart) × 100 | 69.6% |
| **Conversion Rate** | (Purchase Completed / Total Visitors) × 100 | 15.8% |
| **Customer Acquisition Cost (CAC)** | Estimated marketing cost per converted customer | Varies by channel |
| **Retention Rate** | (Retained Customers / Total Customers) × 100 | 28.3% |
| **Average Purchase Value** | Total Revenue / Purchase Completed Count | $112.08 |
| **Funnel Drop-off Rate** | (Lost Customers / Previous Stage Count) × 100 | See funnel table |
| **Revenue per Customer** | Total Revenue / Total Visitors | $17.75 |

---

## 7. Channel Performance Analysis

| Channel | Visitors | Conversions | Conv Rate % | Revenue | Retention % | Est. CAC | ROAS |
|---------|----------|-------------|-------------|---------|-------------|----------|------|
| Referral | 20 | 6 | 30.0% | $685.87 | 25.0% | $36.63 | 3.12 |
| Direct | 5 | 1 | 20.0% | $103.66 | 20.0% | $46.70 | 2.22 |
| Paid Ads | 28 | 4 | 14.3% | $536.34 | 28.6% | $86.38 | 1.55 |
| Organic Search | 30 | 4 | 13.3% | $483.70 | 23.3% | $53.85 | 2.25 |
| Email | 18 | 2 | 11.1% | $106.75 | 33.3% | $102.96 | 0.52 |
| Social Media | 19 | 2 | 10.5% | $213.16 | 36.8% | $74.01 | 1.44 |

**Key Insights:**
- **Referral** is the highest-converting channel (30%) with best ROAS (3.12×)
- **Organic Search** drives the most traffic (30 visitors) with solid conversion (13.3%)
- **Email** has the highest retention rate (33.3%) but lowest ROAS
- **Social Media** underperforms in conversion (10.5%) despite decent traffic

---

## 8. Customer Segmentation Analysis

### By Segment

| Segment | Total | Converted | Conv Rate | Retention | Avg Revenue |
|---------|-------|-----------|-----------|-----------|-------------|
| Premium | 36 | 12 | 33.3% | 47.2% | $44.70 |
| Standard | 57 | 6 | 10.5% | 21.1% | $8.74 |
| Budget | 27 | 1 | 3.7% | 18.5% | $0.82 |

**Key Insights:**
- **Premium segment converts 9× better than Budget** (33.3% vs 3.7%)
- **Premium retention is 2.5× Budget** (47.2% vs 18.5%)
- Standard segment is largest (57 customers) but underperforms vs Premium

### By Region

| Region | Total | Converted | Conv Rate | Retention | Avg Revenue |
|--------|-------|-----------|-----------|-----------|-------------|
| West | 31 | 8 | 25.8% | 32.3% | $38.03 |
| East | 24 | 5 | 20.8% | 25.0% | $15.86 |
| South | 24 | 3 | 12.5% | 25.0% | $10.40 |
| North | 25 | 3 | 12.0% | 32.0% | $12.80 |
| Central | 16 | 0 | 0.0% | 25.0% | $0.00 |

**Key Insights:**
- **West region leads** with 25.8% conversion and highest avg revenue ($38.03)
- **Central region has 0% conversion** — requires urgent investigation
- East shows strong conversion potential (20.8%)

### By Age Group

| Age | Total | Converted | Conv Rate | Retention | Avg Revenue |
|-----|-------|-----------|-----------|-----------|-------------|
| 55+ | 4 | 1 | 25.0% | 75.0% | $20.11 |
| 18-24 | 16 | 3 | 18.8% | 31.2% | $20.55 |
| 35-44 | 27 | 5 | 18.5% | 22.2% | $28.91 |
| 25-34 | 55 | 9 | 16.4% | 30.9% | $15.68 |
| 45-54 | 18 | 1 | 5.6% | 16.7% | $4.30 |

---

## 9. Campaign Performance Analysis

| Campaign | Visitors | Conversions | Conv Rate | Revenue | Retention |
|----------|----------|-------------|-----------|---------|-----------|
| Summer Sale | 12 | 3 | 25.0% | $409.14 | 50.0% |
| New User Offer | 15 | 3 | 20.0% | $287.72 | 13.3% |
| Winter Fest | 16 | 3 | 18.8% | $317.41 | 31.2% |
| Brand Awareness | 17 | 3 | 17.6% | $381.06 | 29.4% |
| Referral Bonus | 15 | 2 | 13.3% | $309.11 | 20.0% |
| Retargeting | 17 | 2 | 11.8% | $109.63 | 35.3% |
| Flash Sale | 17 | 2 | 11.8% | $271.66 | 17.6% |
| Holiday Special | 11 | 1 | 9.1% | $43.75 | 36.4% |

**Key Insights:**
- **Summer Sale** has highest conversion (25%) and retention (50%)
- **Brand Awareness** drives the most revenue ($381.06) with solid conversion
- **Holiday Special** underperforms — lowest conversion (9.1%) and revenue
- **Retargeting** has decent retention (35.3%) but low immediate conversion

---

## 10. Dashboard Features & Layout

The refined **Executive Customer Journey Intelligence & Revenue Optimization Platform** dashboard includes the following sections:

### 1. Primary & Secondary KPI Row
* **Primary Metrics**: Total Revenue ($2,129.48), Revenue Achievement (71% of $3,000 target), and Revenue at Risk ($2,871 lost at funnel stages).
* **Secondary Metrics**: Conversion Rate (15.8%), Retention Rate (28.3%), Total Visitors (120), and Total Conversions (19).
* **Sparklines**: Mini-trend sparkline overlays on core metrics.

### 2. Executive Intelligence Command Center (Consolidated)
* **Executive Performance Snapshot**: A side-by-side snapshot card featuring the **Business Health Score (BHS)** gauge and breakdown (based on revenue, conversion, retention, ROI, and churn risk), combined with real-time trackers for target achievement gaps (-$871), revenue at risk ($2,871), recovery opportunity ($718–$861), and priority action.
* **Integrated Executive Briefing**: Dynamic panel summarizing critical insights (What, Why, Impact, and recommended Action) placed side-by-side with the performance snapshot above the first fold to improve scanning speed and reduce vertical space.
* **Risk & Opportunity Matrix**: Prioritized risk logs evaluating severity, urgency, and revenue loss values.
* **Revenue Waterfall & Recommendation Summaries**: Visual step-down of leaking revenue and immediate next steps.

### 4. Revenue Leakage & Recovery Intelligence
* **Interactive Funnel**: Interactive horizontal funnel chart showing stage counts (Visit 120 → View 120 → Cart 56 → Checkout 39 → Purchase 19).
* **Recovery Breakdown**: Dedicated cards summarizing the largest leakage point, a stage conversion table, and a projected revenue recovery roadmap.

### 5. Revenue Growth & Customer Intelligence
* **Channel Performance Widget**: Tracks channel volume, conversion rates, and revenue with recommended channel-specific actions.
* **Regional Performance Widget**: Lists regional revenue contributions, conversion rates, and localized risk profiles.
* **Customer Health & Segment Intelligence**: Evaluates customer risk profiles (Healthy vs Churned), segment CLV metrics, and a dynamic customer segment opportunity matrix (Invest vs Optimize categories).

### 6. Executive Action Roadmap
* Timed initiatives split by **Immediate Actions** (0–2 Weeks), **Near-Term Actions** (2–4 Weeks), and **Strategic Initiatives** (1–2 Months).
* **Visual Polish Refinements**: High-density spacing (~12% vertical height reduction), larger priority badges, and color-highlighted KPI chips (Revenue Impact, Timeline, Owner) for instant scannability during leadership presentations.

### 7. Sidebar Filters & Footer Branding
* Multi-select dropdown menus for Region, Segment, Channel, Age Group, and Campaign with a global reset action.
* **Refined Footer**: Features the platform title, preparer signature (*"Built by Girish Shenoy"*), portfolios metadata, and dataset information.

---

## 11. Key Insights Summary

| # | Insight | Severity | Impact |
|---|---------|----------|--------|
| 1 | 53.3% drop-off at View → Cart stage | 🔴 Critical | High |
| 2 | 51.3% drop-off at Checkout → Purchase stage | 🔴 Critical | High |
| 3 | Premium segment converts 9× better than Budget | 🟢 Opportunity | High |
| 4 | Referral channel has 30% conversion (best) | 🟢 Opportunity | High |
| 5 | Central region has 0% conversion | 🔴 Critical | Medium |
| 6 | Social Media underperforms at 10.5% conversion | 🟡 Warning | Medium |
| 7 | Budget segment retention at 18.5% | 🟡 Warning | Medium |
| 8 | Summer Sale campaign converts at 25% | 🟢 Opportunity | Medium |
| 9 | 58 customers churned (48.3% of total) | 🔴 Critical | High |
| 10 | Email channel retains best (33.3%) but converts low | 🟡 Warning | Medium |

---

## 12. Recommendations

### Immediate Actions (0–30 days)
1. **Optimize Cart Flow**: Add exit-intent popups, free shipping threshold ($50+), cart abandonment email sequence
2. **Simplify Checkout**: Reduce form fields to 3-4, add guest checkout, progress indicator, trust badges
3. **Scale Referral Program**: Double down on highest-converting channel

### Short-term Actions (30–60 days)
4. **Premium Segment Expansion**: Create lookalike audiences, exclusive offers, loyalty program
5. **Central Region Analysis**: Investigate market fit, localize campaigns, run A/B tests
6. **Campaign Optimization**: Pause/revise Holiday Special; replicate Summer Sale playbook

### Long-term Actions (60–90 days)
7. **Retention Program**: Implement re-engagement campaigns for At Risk customers (28)
8. **Channel Realignment**: Reduce Social Media spend; increase Referral and Organic Search investment
9. **Feedback Integration**: Use feedback scores (avg 3.62/5) to improve product and experience

---

## 13. Tools & Technologies Used

| Tool | Purpose |
|------|---------|
| **Python** | Data generation, cleaning, analysis, visualization |
| Pandas | Data manipulation and analysis |
| Matplotlib & Seaborn | Statistical visualizations |
| Chart.js | Interactive web dashboard charts |
| HTML/CSS/JavaScript | Dashboard frontend |
| Excel | Pivot tables, KPI calculations, reporting |
| Font Awesome | Dashboard icons |
| Google Fonts (Inter) | Typography |

---

## 14. Conclusion

This Customer Journey & Funnel Analysis Dashboard provides a complete view of the customer buying experience, from first website visit through to purchase and retention. The analysis reveals two critical drop-off points (View→Cart at 53.3% and Checkout→Purchase at 51.3%) that represent significant revenue leakage. By implementing the recommended actions — particularly cart optimization, checkout simplification, and referral scaling — the business can potentially improve overall conversion by 15–20% and increase customer retention by 10–15%.

The dashboard serves as an ongoing monitoring tool for marketing, product, and management teams to track KPIs, evaluate campaign effectiveness, and make data-driven decisions.

---

## 15. Appendix: AI Image Generation Prompt

Generate a realistic dashboard image for GitHub showcase using this prompt:

```
A professional, corporate-style business analytics dashboard on a large desktop monitor. The dashboard has a dark navy and blue color scheme with white cards. Top row shows 5 KPI metric cards: "Total Visitors 1,250", "Leads Generated 875", "Conversion Rate 12.4%", "Retention Rate 68.2%", "Total Revenue $48,230" — each with a small arrow indicator showing trend. Middle section has a horizontal funnel chart on the left showing 5 stages (Visit 1,250 → View 1,050 → Cart 680 → Checkout 530 → Purchase 155) and a Sankey-style customer journey flow diagram on the right. Below that, three bar charts show Channel Performance, Segment Analysis, and Regional Performance. Bottom section has Retention Insights with a line chart and Drop-off Analysis panel with recommendations. Left sidebar has filter dropdown menus. Clean, modern, executive-friendly layout. Photorealistic, 4K quality, soft lighting, sleek office desk setup.
```

---

*Report prepared by Girish Shenoy as part of the Customer Journey & Funnel Analysis Dashboard project.*
*Dataset: 120 customer records | Analysis: Python + Excel | Dashboard: HTML/CSS/JS + Chart.js*
