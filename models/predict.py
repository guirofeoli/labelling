import joblib
import os

MODEL_DIR = 'models'
VECTORIZER_PATH = os.path.join(MODEL_DIR, 'vectorizer.joblib')
MODEL_PATH = os.path.join(MODEL_DIR, 'rf_model.joblib')
COMMON_SESSIONS = [
    'header', 'menu', 'main', 'hero', 'conteúdo', 'footer', 'rodapé', 'aside', 'article', 'banner'
]

def load_model():
    vectorizer = joblib.load(VECTORIZER_PATH)
    model = joblib.load(MODEL_PATH)
    return vectorizer, model

def extract_text_features(data):
    parts = []
    if 'text' in data and data['text']:
        parts.append(data['text'])
    if 'contextHeadingsParagraphs' in data:
        for ctx in data['contextHeadingsParagraphs']:
            parts += ctx.get('headings', [])
            parts += ctx.get('paragraphs', [])
    return ' | '.join(parts)

def predict_session(data):
    try:
        vectorizer, model = load_model()
        text = extract_text_features(data)
        X = vectorizer.transform([text])
        pred = model.predict(X)[0]
        proba = max(model.predict_proba(X)[0])
        sessao = pred if proba > 0.65 else None
        options = [sessao] + [s for s in COMMON_SESSIONS if s != sessao] if sessao else COMMON_SESSIONS
        return {
            'sessao': sessao,
            'confidence': float(proba),
            'options': options
        }
    except Exception as e:
        print("Erro em predict_session:", e)
        return {
            'sessao': None,
            'confidence': 0.0,
            'options': COMMON_SESSIONS
        }
