import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

NUM_TRANSACTIONS = 50000
FRAUD_RATIO = 0.02

def generate_transactions(n=NUM_TRANSACTIONS):
    transactions = []
    start_date = datetime(2024, 1, 1)
    for i in range(n):
        is_fraud = random.random() < FRAUD_RATIO
        txn_date = start_date + timedelta(days=random.randint(0, 364), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        if is_fraud:
            amount = round(np.random.choice([np.random.uniform(1, 10), np.random.uniform(900, 1000), np.random.uniform(5000, 20000)]), 2)
            merchant_category = random.choice(['online', 'crypto', 'wire_transfer', 'atm'])
            hour = random.choice(list(range(0, 5)) + list(range(22, 24)))
            location_mismatch = 1
            velocity = random.randint(5, 20)
            distance_from_home = random.uniform(500, 5000)
        else:
            amount = round(min(np.random.lognormal(mean=4, sigma=1.5), 5000), 2)
            merchant_category = random.choice(['grocery', 'restaurant', 'gas', 'retail', 'healthcare', 'online'])
            hour = txn_date.hour
            location_mismatch = random.choice([0, 0, 0, 0, 1])
            velocity = random.randint(1, 4)
            distance_from_home = random.uniform(0, 200)
        transactions.append({
            'transaction_id': f'TXN{i+1:08d}',
            'user_id': f'USR{random.randint(1, 5000):05d}',
            'amount': amount,
            'merchant_category': merchant_category,
            'hour_of_day': hour,
            'day_of_week': txn_date.weekday(),
            'location_mismatch': location_mismatch,
            'velocity_last_hour': velocity,
            'distance_from_home_km': round(distance_from_home, 2),
            'prev_txn_amount': round(random.uniform(10, 3000), 2),
            'account_age_days': random.randint(30, 3650),
            'failed_attempts_today': random.randint(0, 3) if is_fraud else 0,
            'is_international': 1 if distance_from_home > 1000 else 0,
            'timestamp': txn_date.isoformat(),
            'is_fraud': int(is_fraud)
        })
    df = pd.DataFrame(transactions)
    df.to_csv('transactions.csv', index=False)
    print(f"✅ Generated {n} transactions ({df['is_fraud'].sum()} fraud cases)")
    return df

if __name__ == '__main__':
    generate_transactions()