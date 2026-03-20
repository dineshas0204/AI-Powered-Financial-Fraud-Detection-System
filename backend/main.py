from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import joblib
import json
import numpy as np
import os
import random
from datetime import datetime
from risk_engine import generate_risk_score
from alert_system import create_alert, get_all_alerts, resolve_alert, get_alert_stats

app = FastAPI(title="Fraud Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = os.path.dirname(__file__)
rf_model = None
gb_model = None
scaler = None
label_encoder_map = {}

@app.on_event("startup")
async def load_models():
    global rf_model, gb_model, scaler, label_encoder_map
    try:
        rf_model = joblib.load(os.path.join(MODEL_DIR, 'rf_model.pkl'))
        gb_model = joblib.load(os.path.join(MODEL_DIR, 'gb_model.pkl'))
        scaler   = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
        with open(os.path.join(MODEL_DIR, 'label_encoder.json')) as f:
            label_encoder_map = json.load(f)
        print("✅ ML models loaded successfully")
    except FileNotFoundError:
        print("⚠️  Model files not found. Run model.py first.")

FEATURE_COLS = [
    'amount', 'hour_of_day', 'day_of_week', 'location_mismatch',
    'velocity_last_hour', 'distance_from_home_km', 'prev_txn_amount',
    'account_age_days', 'failed_attempts_today', 'is_international',
    'merchant_category_encoded'
]

class TransactionRequest(BaseModel):
    transaction_id: Optional[str] = None
    user_id: str
    amount: float = Field(..., gt=0)
    merchant_category: str
    hour_of_day: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    location_mismatch: int = Field(..., ge=0, le=1)
    velocity_last_hour: int = Field(..., ge=0)
    distance_from_home_km: float = Field(..., ge=0)
    prev_txn_amount: float = Field(..., gt=0)
    account_age_days: int = Field(..., gt=0)
    failed_attempts_today: int = Field(..., ge=0)
    is_international: int = Field(..., ge=0, le=1)

class ResolveAlertRequest(BaseModel):
    resolved_by: str
    notes: str

@app.get("/")
def root():
    return {"message": "Fraud Detection API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": rf_model is not None, "timestamp": datetime.utcnow().isoformat()}

@app.post("/analyze-transaction")
def analyze_transaction(txn: TransactionRequest):
    if rf_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded. Run model.py first.")
    import uuid
    txn_id = txn.transaction_id or f"TXN{uuid.uuid4().hex[:8].upper()}"
    cat_encoded = label_encoder_map.get(txn.merchant_category, 0)
    features = np.array([[
        txn.amount, txn.hour_of_day, txn.day_of_week,
        txn.location_mismatch, txn.velocity_last_hour,
        txn.distance_from_home_km, txn.prev_txn_amount,
        txn.account_age_days, txn.failed_attempts_today,
        txn.is_international, cat_encoded
    ]])
    features_scaled = scaler.transform(features)
    rf_prob  = rf_model.predict_proba(features_scaled)[0][1]
    gb_prob  = gb_model.predict_proba(features_scaled)[0][1]
    fraud_prob = float(rf_prob * 0.6 + gb_prob * 0.4)
    txn_dict = txn.dict()
    txn_dict['transaction_id'] = txn_id
    risk = generate_risk_score(txn_id, fraud_prob, txn_dict)
    alert = None
    if risk.requires_alert:
        alert = create_alert(risk, txn_dict)
    return {
        "transaction_id": txn_id,
        "user_id": txn.user_id,
        "amount": txn.amount,
        "fraud_probability": risk.fraud_probability,
        "risk_score": risk.risk_score,
        "risk_level": risk.risk_level,
        "risk_factors": risk.risk_factors,
        "recommended_action": risk.recommended_action,
        "alert_created": alert is not None,
        "alert_id": alert['alert_id'] if alert else None,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/alerts")
def list_alerts(limit: int = 50):
    return {"alerts": get_all_alerts(limit), "stats": get_alert_stats()}

@app.get("/alerts/stats")
def alert_statistics():
    return get_alert_stats()

@app.post("/alerts/{alert_id}/resolve")
def resolve(alert_id: str, body: ResolveAlertRequest):
    alert = resolve_alert(alert_id, body.resolved_by, body.notes)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert resolved", "alert": alert}

@app.get("/dashboard/stats")
def dashboard_stats():
    from alert_system import alert_store
    total = len(alert_store)
    if total == 0:
        return {"total_transactions_analyzed": 0, "fraud_detected": 0, "fraud_rate": 0, "total_fraud_amount": 0, "alerts_by_level": {}, "recent_trend": []}
    fraud_txns = [a for a in alert_store if a['risk_level'] in ['HIGH', 'CRITICAL']]
    by_level = {}
    for a in alert_store:
        by_level[a['risk_level']] = by_level.get(a['risk_level'], 0) + 1
    return {
        "total_transactions_analyzed": total,
        "fraud_detected": len(fraud_txns),
        "fraud_rate": round(len(fraud_txns) / total * 100, 2),
        "total_fraud_amount": round(sum(a['amount'] for a in fraud_txns), 2),
        "alerts_by_level": by_level,
        "open_alerts": sum(1 for a in alert_store if a['status'] == 'OPEN'),
    }

@app.get("/simulate-batch")
def simulate_batch(count: int = 20):
    if rf_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded.")
    import uuid
    results = []
    categories = ['grocery', 'online', 'restaurant', 'crypto', 'atm', 'retail', 'wire_transfer']
    for _ in range(count):
        is_suspicious = random.random() < 0.25
        txn = TransactionRequest(
            transaction_id=f"TXN{uuid.uuid4().hex[:8].upper()}",
            user_id=f"USR{random.randint(1, 999):03d}",
            amount=round(random.uniform(9000, 15000) if is_suspicious else random.uniform(10, 2000), 2),
            merchant_category=random.choice(['crypto', 'wire_transfer'] if is_suspicious else categories),
            hour_of_day=random.choice([1, 2, 3] if is_suspicious else list(range(8, 22))),
            day_of_week=random.randint(0, 6),
            location_mismatch=1 if is_suspicious else 0,
            velocity_last_hour=random.randint(6, 15) if is_suspicious else random.randint(1, 3),
            distance_from_home_km=round(random.uniform(1000, 4000) if is_suspicious else random.uniform(0, 100), 2),
            prev_txn_amount=round(random.uniform(10, 1000), 2),
            account_age_days=random.randint(30, 3650),
            failed_attempts_today=random.randint(1, 3) if is_suspicious else 0,
            is_international=1 if is_suspicious else 0
        )
        result = analyze_transaction(txn)
        results.append(result)
    return {"simulated": count, "results": results}
