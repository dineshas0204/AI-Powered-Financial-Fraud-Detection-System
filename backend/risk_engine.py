from dataclasses import dataclass
from typing import List, Dict

@dataclass
class RiskAssessment:
    transaction_id: str
    risk_score: float
    risk_level: str
    fraud_probability: float
    risk_factors: List[str]
    recommended_action: str
    requires_alert: bool

RISK_THRESHOLDS = {
    'LOW':      (0,  30),
    'MEDIUM':   (30, 60),
    'HIGH':     (60, 85),
    'CRITICAL': (85, 100)
}

ACTIONS = {
    'LOW':      'Approve transaction automatically',
    'MEDIUM':   'Flag for review — notify customer if pattern continues',
    'HIGH':     'Block transaction — send OTP verification to customer',
    'CRITICAL': 'Block transaction — freeze account — alert fraud team'
}

def compute_risk_factors(transaction: dict) -> List[str]:
    factors = []
    if transaction.get('amount', 0) > 5000:
        factors.append(f"Unusually large transaction: ${transaction['amount']:,.2f}")
    hour = transaction.get('hour_of_day', 12)
    if hour < 5 or hour > 22:
        factors.append(f"Transaction at unusual hour: {hour:02d}:00")
    if transaction.get('location_mismatch', 0) == 1:
        factors.append("Location doesn't match account's usual geography")
    if transaction.get('velocity_last_hour', 0) >= 5:
        factors.append(f"High transaction velocity: {transaction['velocity_last_hour']} txns/hour")
    if transaction.get('distance_from_home_km', 0) > 500:
        factors.append(f"Far from home: {transaction['distance_from_home_km']:.0f} km")
    if transaction.get('failed_attempts_today', 0) > 0:
        factors.append(f"Failed auth attempts today: {transaction['failed_attempts_today']}")
    if transaction.get('is_international', 0) == 1:
        factors.append("International transaction detected")
    cat = transaction.get('merchant_category', '')
    if cat in ['crypto', 'wire_transfer']:
        factors.append(f"High-risk merchant category: {cat}")
    if not factors:
        factors.append("No significant risk indicators")
    return factors

def generate_risk_score(transaction_id, fraud_probability, transaction):
    base_score = fraud_probability * 100
    adjustment = 0
    if transaction.get('velocity_last_hour', 0) >= 8:
        adjustment += 10
    if transaction.get('failed_attempts_today', 0) >= 2:
        adjustment += 8
    if transaction.get('amount', 0) > 9000:
        adjustment += 5
    if transaction.get('location_mismatch') and transaction.get('is_international'):
        adjustment += 7
    risk_score = min(100, base_score + adjustment)
    risk_level = 'LOW'
    for level, (low, high) in RISK_THRESHOLDS.items():
        if low <= risk_score < high:
            risk_level = level
            break
    if risk_score >= 85:
        risk_level = 'CRITICAL'
    return RiskAssessment(
        transaction_id=transaction_id,
        risk_score=round(risk_score, 2),
        risk_level=risk_level,
        fraud_probability=round(fraud_probability, 4),
        risk_factors=compute_risk_factors(transaction),
        recommended_action=ACTIONS[risk_level],
        requires_alert=(risk_level in ['HIGH', 'CRITICAL'])
    )