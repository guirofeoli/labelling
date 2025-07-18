from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime

# ML imports (garanta que existam - modelos devem estar em /models)
from models.predict import predict_session
from models.treinamento import treinar_modelo

DATA_DIR = os.path.join('data')
DATASET = os.path.join(DATA_DIR, 'exemplos.json')
MODEL_FILE = os.path.join(DATA_DIR, 'modelo.pkl')
LOG_FILE = os.path.join(DATA_DIR, 'requests.log')

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Em produção, troque '*' por domínio

def log_event(label, data):
    log_entry = {
        "ts": datetime.utcnow().isoformat(),
        "label": label,
        "data": data
    }
    print(f"[LOG][{label}] {json.dumps(data, ensure_ascii=False)}")
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
    except Exception as err:
        print(f"[LOG-ERROR] {err}")

@app.route('/api/inteligencia', methods=['POST'])
def inteligencia():
    data = request.json
    log_event('input_inteligencia', data)
    try:
        result = predict_session(data)
        log_event('output_inteligencia', result)
        return jsonify(result)
    except Exception as err:
        log_event('output_inteligencia_erro', str(err))
        return jsonify({'sessao': None, 'confidence': 0, 'erro': str(err)}), 500

@app.route('/api/rotulo', methods=['POST'])
def rotulo():
    exemplo = request.json
    log_event('input_rotulo', exemplo)
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    if not os.path.exists(DATASET):
        exemplos = []
    else:
        with open(DATASET, 'r', encoding='utf-8') as f:
            try:
                exemplos = json.load(f)
            except Exception:
                exemplos = []
    exemplos.append(exemplo)
    with open(DATASET, 'w', encoding='utf-8') as f:
        json.dump(exemplos, f, ensure_ascii=False, indent=2)
    resp = {'ok': True, 'msg': 'Exemplo salvo para treino', 'total': len(exemplos)}
    log_event('output_rotulo', resp)
    return jsonify(resp)

@app.route('/api/treinamento', methods=['POST'])
def treinamento():
    log_event('input_treinamento', {"msg": "iniciar"})
    try:
        result = treinar_modelo()
        log_event('output_treinamento', result)
        return jsonify(result)
    except Exception as err:
        log_event('output_treinamento_erro', str(err))
        return jsonify({'ok': False, 'msg': str(err)}), 500

@app.route('/api/model_status')
def model_status():
    exists = os.path.exists(MODEL_FILE)
    resp = {'model_trained': exists}
    log_event('output_model_status', resp)
    return jsonify(resp)

@app.route('/')
def health():
    return 'Labelling backend up!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
