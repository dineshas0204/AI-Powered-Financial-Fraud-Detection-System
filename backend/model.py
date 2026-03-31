
import pandas as pd
import numpy as np
import joblib
import json
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from imblearn.over_sampling import SMOTE
import warnings
warnings.filterwarnings('ignore')

FEATURE_COLS = [
    'amount', 'hour_of_day', 'day_of_week', 'location_mismatch',
    'velocity_last_hour', 'distance_from_home_km', 'prev_txn_amount',
    'account_age_days', 'failed_attempts_today', 'is_international',
    'merchant_category_encoded'
]

def load_and_preprocess(csv_path='transactions.csv'):
    df = pd.read_csv(csv_path)
    le = LabelEncoder()
    df['merchant_category_encoded'] = le.fit_transform(df['merchant_category'])
    
    # Save label encoder mapping
    mapping = {k: int(v) for k, v in zip(le.classes_, le.transform(le.classes_))}
    with open('label_encoder.json', 'w') as f:
        json.dump(mapping, f)
    
    return df, le

def train_model(csv_path='transactions.csv'):
    print("📥 Loading data...")
    df, le = load_and_preprocess(csv_path)
    
    X = df[FEATURE_COLS]
    y = df['is_fraud']
    
    print(f"   Total samples: {len(df):,}")
    print(f"   Fraud: {y.sum():,} ({y.mean()*100:.2f}%)")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Handle class imbalance with SMOTE
    print("\n⚖️  Applying SMOTE to balance classes...")
    smote = SMOTE(random_state=42)
    X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
    print(f"   Balanced training set: {len(X_train_balanced):,} samples")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_balanced)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest
    print("\n🌲 Training Random Forest...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train_scaled, y_train_balanced)
    
    # Train Gradient Boosting
    print("🚀 Training Gradient Boosting...")
    gb_model = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    gb_model.fit(X_train_scaled, y_train_balanced)
    
    # Ensemble predictions
    rf_proba = rf_model.predict_proba(X_test_scaled)[:, 1]
    gb_proba = gb_model.predict_proba(X_test_scaled)[:, 1]
    ensemble_proba = (rf_proba * 0.6 + gb_proba * 0.4)
    ensemble_pred = (ensemble_proba >= 0.5).astype(int)
    
    # Evaluate
    print("\n📊 Model Performance:")
    print("=" * 50)
    auc = roc_auc_score(y_test, ensemble_proba)
    print(f"ROC-AUC Score: {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, ensemble_pred, target_names=['Legitimate', 'Fraud']))
    
    cm = confusion_matrix(y_test, ensemble_pred)
    print(f"Confusion Matrix:\n{cm}")
    
    # Feature importance
    importance = dict(zip(FEATURE_COLS, rf_model.feature_importances_))
    importance_sorted = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    print(f"\n🔍 Top Feature Importances:")
    for feat, imp in list(importance_sorted.items())[:5]:
        print(f"   {feat}: {imp:.4f}")
    
    # Save models
    print("\n💾 Saving models...")
    joblib.dump(rf_model, 'rf_model.pkl')
    joblib.dump(gb_model, 'gb_model.pkl')
    joblib.dump(scaler, 'scaler.pkl')
    
    metrics = {
        'roc_auc': round(auc, 4),
        'feature_importance': importance_sorted,
        'threshold': 0.5
    }
    with open('model_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print("✅ Models saved: rf_model.pkl, gb_model.pkl, scaler.pkl")
    return rf_model, gb_model, scaler

if __name__ == '__main__':
    train_model()