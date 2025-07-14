from flask import Flask, request, jsonify
import os
import json
from models.predict import predict_session
from models.treinamento import treinar_modelo

DATASET = os.path.join('data', 'exemplos.json')

app = Flask(__name__)

@app.route('/api/inteligencia', methods=['POST'])
def inteligencia():
    data = request.json
    result = predict_session(data)
    return jsonify(result)

@app.route('/api/rotulo', methods=['POST'])
def rotulo():
    exemplo = request.json
    if not os.path.exists('data'):
        os.makedirs('data')
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
