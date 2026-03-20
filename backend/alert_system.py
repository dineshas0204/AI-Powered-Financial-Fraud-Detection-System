from datetime import datetime
from typing import List, Dict
import uuid

alert_store: List[Dict] = []

def create_alert(risk_assessment, transaction: dict) -> Dict:
    alert = {
        'alert_id': str(uuid.uuid4())[:8].upper(),
        'transaction_id': risk_assessment.transaction_id,
        'user_id': transaction.get('user_id', 'UNKNOWN'),
        'timestamp': datetime.utcnow().isoformat(),
        'risk_level': risk_assessment.risk_level,
        'risk_score': risk_assessment.risk_score,
        'fraud_probability': risk_assessment.fraud_probability,
        'amount': transaction.get('amount', 0),
        'merchant_category': transaction.get('merchant_category', 'unknown'),
        'risk_factors': risk_assessment.risk_factors,
        'recommended_action': risk_assessment.recommended_action,
        'status': 'OPEN',
        'resolved_by': None,
        'resolution_notes': None
    }
    alert_store.append(alert)
    return alert

def get_all_alerts(limit: int = 50) -> List[Dict]:
    return sorted(alert_store, key=lambda x: x['timestamp'], reverse=True)[:limit]

def get_alert_by_id(alert_id: str):
    return next((a for a in alert_store if a['alert_id'] == alert_id), None)

def resolve_alert(alert_id: str, resolved_by: str, notes: str):
    alert = get_alert_by_id(alert_id)
    if alert:
        alert['status'] = 'RESOLVED'
        alert['resolved_by'] = resolved_by
        alert['resolution_notes'] = notes
    return alert

def get_alert_stats() -> Dict:
    total = len(alert_store)
    open_alerts = sum(1 for a in alert_store if a['status'] == 'OPEN')
    critical = sum(1 for a in alert_store if a['risk_level'] == 'CRITICAL')
    high = sum(1 for a in alert_store if a['risk_level'] == 'HIGH')
    return {
        'total_alerts': total,
        'open_alerts': open_alerts,
        'critical_alerts': critical,
        'high_alerts': high,
        'resolved_alerts': total - open_alerts
    }
