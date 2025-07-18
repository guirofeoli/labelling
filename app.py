from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from models.predict import predict_session
from models.treinamento import treinar_modelo

import logging

logging.basicConfig(level=logging.INFO)

DATASET = os.path.join('data', 'exemplos.json')
MODEL_FILE = os.path.join('data', 'modelo.pkl')

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/inteligencia', methods=['POST'])
def inteligencia():
    data = request.json
    logging.info(f'[API] /api/inteligencia RECEBIDO: {json.dumps(data)[:2000]}')
    try:
        result = predict_session(data)
        logging.info(f'[API] /api/inteligencia RESPOSTA: {json.dumps(result)}')
    except Exception as e:
        logging.error(f'[API] /api/inteligencia ERRO: {str(e)}')
        result = {'sessao': None, 'confidence': 0, 'sugestoes': []}
    return jsonify(result)

@app.route('/api/rotulo', methods=['POST'])
def rotulo():
    exemplo = request.json
    logging.info(f'[API] /api/rotulo SALVANDO: {json.dumps(exemplo)}')
    data_dir = os.path.join('data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    dataset_path = os.path.join(data_dir, 'exemplos.json')
    if not os.path.exists(dataset_path):
        exemplos = []
    else:
        with open(dataset_path, 'r', encoding='utf-8') as f:
            try:
                exemplos = json.load(f)
            except Exception:
                exemplos = []
    exemplos.append(exemplo)
    with open(dataset_path, 'w', encoding='utf-8') as f:
        json.dump(exemplos, f, ensure_ascii=False, indent=2)
    logging.info(f'[API] /api/rotulo TOTAL: {len(exemplos)} exemplos')
    return jsonify({'ok': True, 'msg': 'Exemplo salvo para treino', 'total': len(exemplos)})

@app.route('/api/treinamento', methods=['POST'])
def treinamento():
    logging.info('[API] /api/treinamento chamado')
    result = treinar_modelo()
    logging.info(f'[API] /api/treinamento RESPOSTA: {json.dumps(result)}')
    return jsonify(result)

@app.route('/api/model_status')
def model_status():
    exists = os.path.exists(MODEL_FILE)
    logging.info(f'[API] /api/model_status -> {exists}')
    return jsonify({'model_trained': exists})

@app.route('/')
def health():
    return 'Labelling backend up!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
