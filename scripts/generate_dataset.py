import pandas as pd
import random
import numpy as np
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

num_records = 120

first_names = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Kavya", "Arjun", "Meera", "Rahul", "Sara",
               "Amit", "Neha", "Suresh", "Pooja", "Deepak", "Rekha", "Manish", "Swati", "Vijay", "Anjali",
               "Rajesh", "Divya", "Sanjay", "Nisha", "Gaurav", "Kriti", "Nitin", "Shreya", "Harsh", "Tanya",
               "Kunal", "Isha", "Ravi", "Maya", "Siddharth", "Lata", "Akash", "Ritu", "Prakash", "Geeta",
               "Aditya", "Shweta", "Mohan", "Rashmi", "Tarun", "Jyoti", "Vivek", "Sneha", "Ankur", "Preeti",
               "Dinesh", "Archana", "Karan", "Bhavna", "Lokesh", "Aarti", "Pankaj", "Sunita", "Shubham", "Anita",
               "Rakesh", "Komal", "Jatin", "Deepa", "Naveen", "Rupali", "Ashok", "Vandana", "Hemant", "Smita",
               "Yogesh", "Madhu", "Akshay", "Rohini", "Bharat", "Shalini", "Chirag", "Radhika", "Farhan", "Zara",
               "Imran", "Fatima", "Sameer", "Ayesha", "Kabir", "Natasha", "Dhruv", "Simran", "Varun", "Mira",
               "Rohan", "Aditi", "Krishna", "Lavanya", "Abhishek", "Sonia", "Tushar", "Namrata", "Uday", "Parul",
               "Rishabh", "Nandini", "Sachin", "Bindu", "Mohit", "Devika", "Anuj", "Saumya", "Gagan", "Rituraj",
               "Arvind", "Sheetal", "Nikhil", "Pallavi", "Om", "Kajal", "Dev", "Charu", "Sahil", "Ekta"]

last_names = ["Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Reddy", "Joshi", "Nair", "Mehta",
              "Agarwal", "Rao", "Kapoor", "Malhotra", "Bose", "Sengupta", "Desai", "Chopra", "Thakur", "Das"]

segments = ["Premium", "Standard", "Budget"]
age_groups = ["18-24", "25-34", "35-44", "45-54", "55+"]
regions = ["North", "South", "East", "West", "Central"]
channels = ["Organic Search", "Paid Ads", "Social Media", "Email", "Referral", "Direct"]
campaigns = ["Summer Sale", "Winter Fest", "New User Offer", "Referral Bonus", "Holiday Special", "Flash Sale", "Brand Awareness", "Retargeting"]

segment_weights = [0.25, 0.45, 0.30]
age_weights = [0.15, 0.35, 0.30, 0.15, 0.05]
region_weights = [0.22, 0.20, 0.18, 0.24, 0.16]
channel_weights = [0.22, 0.20, 0.18, 0.14, 0.14, 0.12]

start_date = datetime(2024, 1, 1)
end_date = datetime(2024, 6, 30)

def random_date():
    delta = (end_date - start_date).days
    return start_date + timedelta(days=random.randint(0, delta))

def generate_customer_data(n):
    data = []
    for i in range(1, n + 1):
        cust_id = f"CUST{i:04d}"
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        segment = random.choices(segments, weights=segment_weights, k=1)[0]
        age_group = random.choices(age_groups, weights=age_weights, k=1)[0]
        region = random.choices(regions, weights=region_weights, k=1)[0]
        channel = random.choices(channels, weights=channel_weights, k=1)[0]
        campaign = random.choice(campaigns)
        visit_date = random_date()
        page_views = random.randint(1, 25)
        session_duration = random.randint(10, 1800)

        bounce_mod = 0.8 if page_views <= 2 else 1.0
        bounce = "Bounced" if page_views <= 2 and random.random() < 0.6 * bounce_mod else "Engaged"

        product_viewed = 1 if (bounce == "Engaged" or random.random() < 0.85) else 0

        if product_viewed == 0:
            add_cart = 0
            checkout = 0
            purchase = 0
            purchase_value = 0
        else:
            add_cart_mod = 0.75 if segment == "Premium" else (0.55 if segment == "Standard" else 0.40)
            add_cart_mod *= 1.1 if channel in ["Email", "Referral"] else 1.0
            add_cart = 1 if random.random() < add_cart_mod else 0

            if add_cart == 0:
                checkout = 0
                purchase = 0
                purchase_value = 0
            else:
                checkout_mod = 0.80 if segment == "Premium" else (0.65 if segment == "Standard" else 0.50)
                checkout_mod *= 1.15 if campaign in ["Flash Sale", "Holiday Special"] else 1.0
                checkout = 1 if random.random() < checkout_mod else 0

                if checkout == 0:
                    purchase = 0
                    purchase_value = 0
                else:
                    purchase_mod = 0.55 if segment == "Premium" else (0.40 if segment == "Standard" else 0.25)
                    purchase_mod *= 1.2 if region in ["South", "West"] else 1.0
                    purchase = 1 if random.random() < purchase_mod else 0
                    if purchase == 1:
                        if segment == "Premium":
                            purchase_value = round(random.uniform(80, 250), 2)
                        elif segment == "Standard":
                            purchase_value = round(random.uniform(30, 120), 2)
                        else:
                            purchase_value = round(random.uniform(15, 60), 2)
                    else:
                        purchase_value = 0

        feedback = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.10, 0.20, 0.40, 0.25]) if product_viewed == 1 else None

        if purchase == 1:
            retention = random.choices(["Retained", "Churned", "At Risk"], weights=[0.70, 0.15, 0.15], k=1)[0]
        elif add_cart == 1:
            retention = random.choices(["Retained", "Churned", "At Risk"], weights=[0.30, 0.30, 0.40], k=1)[0]
        else:
            retention = random.choices(["Retained", "Churned", "At Risk"], weights=[0.15, 0.60, 0.25], k=1)[0]

        if product_viewed == 0:
            funnel_stage = "Website Visit"
        elif add_cart == 0:
            funnel_stage = "Product Viewed"
        elif checkout == 0:
            funnel_stage = "Add to Cart"
        elif purchase == 0:
            funnel_stage = "Checkout Started"
        else:
            funnel_stage = "Purchase Completed"

        conversion = "Converted" if purchase == 1 else "Not Converted"

        feedback_score = feedback if feedback is not None else ""

        data.append({
            "Customer ID": cust_id,
            "Customer Name": name,
            "Customer Segment": segment,
            "Age Group": age_group,
            "Region": region,
            "Acquisition Channel": channel,
            "Campaign Name": campaign,
            "Website Visit Date": visit_date.strftime("%Y-%m-%d"),
            "Page Views": page_views,
            "Product Viewed": product_viewed,
            "Add to Cart": add_cart,
            "Checkout Started": checkout,
            "Purchase Completed": purchase,
            "Purchase Value": purchase_value,
            "Session Duration": session_duration,
            "Bounce Status": bounce,
            "Customer Feedback Score": feedback_score,
            "Customer Retention Status": retention,
            "Funnel Stage": funnel_stage,
            "Conversion Status": conversion
        })
    return pd.DataFrame(data)

df = generate_customer_data(num_records)
df.to_csv("data/customer_journey_data.csv", index=False)
print(f"Dataset generated: {len(df)} records saved to data/customer_journey_data.csv")
print(f"\nConversion rate: {df['Purchase Completed'].sum()}/{len(df)} = {df['Purchase Completed'].sum()/len(df)*100:.1f}%")
print(f"Retention rate: {len(df[df['Customer Retention Status']=='Retained'])}/{len(df)} = {len(df[df['Customer Retention Status']=='Retained'])/len(df)*100:.1f}%")
print(f"\nChannel distribution:")
print(df['Acquisition Channel'].value_counts())
print(f"\nSegment distribution:")
print(df['Customer Segment'].value_counts())
print(f"\nFunnel stage distribution:")
print(df['Funnel Stage'].value_counts())
