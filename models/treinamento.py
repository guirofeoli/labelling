import os
import joblib
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

DATASET = os.path.join('data', 'exemplos.json')
MODEL_DIR = 'models'
VECTORIZER_PATH = os.path.join(MODEL_DIR, 'vectorizer.joblib')
MODEL_PATH = os.path.join(MODEL_DIR, 'rf_model.joblib')

def treinar_modelo():
    if not os.path.exists(DATASET):
        return {'ok': False, 'msg': 'Nenhum dado para treinar.'}
    with open(DATASET, 'r', encoding='utf-8') as f:
        exemplos = json.load(f)
    texts = [ex['text'] for ex in exemplos if 'text' in ex and ex.get('sessao')]
    labels = [ex['sessao'] for ex in exemplos if 'text' in ex and ex.get('sessao')]
    if not texts or not labels:
        return {'ok': False, 'msg': 'Sem exemplos válidos.'}
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(texts)
    model = RandomForestClassifier()
    model.fit(X, labels)
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    joblib.dump(model, MODEL_PATH)
    return {'ok': True, 'msg': f'Modelo treinado com {len(labels)} exemplos.', 'labels': list(set(labels))}
