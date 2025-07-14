import sys
import os
# Adiciona a raiz do projeto ao sys.path para importar 'models'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, request, jsonify
import json
from models.predict import predict_session
from models.treinamento import treinar_modelo

DATASET = os.path.join('..', 'data', 'exemplos.json')

app = Flask(__name__)

@app.route('/api/inteligencia', methods=['POST'])
def inteligencia():
    data = request.json
    result = predict_session(data)
    return jsonify(result)

@app.route('/api/rotulo', methods=['POST'])
def rotulo():
    exemplo = request.json
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
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
    return jsonify({'ok': True, 'msg': 'Exemplo salvo para treino', 'total': len(exemplos)})

@app.route('/api/treinamento', methods=['POST'])
def treinamento():
    result = treinar_modelo()
    return jsonify(result)

@app.route('/')
def health():
    return 'Labelling backend up!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
