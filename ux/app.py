from flask import Flask, request, jsonify
import os, json
from models.predict import predict_session
from models.treinamento import treinar_modelo

DATASET = 'data/exemplos.json'

app = Flask(__name__)

@app.route('/api/inteligencia', methods=['POST'])
def inteligencia():
    data = request.json
    result = predict_session(data)
    return jsonify(result)

@app.route('/api/rotulo', methods=['POST'])
def rotulo():
    # Salva o exemplo rotulado para re-treino
    exemplo = request.json
    if not os.path.exists(DATASET):
        exemplos = []
    else:
        with open(DATASET, 'r') as f:
            exemplos = json.load(f)
    exemplos.append(exemplo)
    with open(DATASET, 'w') as f:
        json.dump(exemplos, f)
    return jsonify({'ok': True, 'msg': 'Exemplo salvo para treino', 'total': len(exemplos)})

@app.route('/api/treinamento', methods=['POST'])
def treinamento():
    # Pode opcionalmente receber dataset, mas por padrão usa exemplos salvos
    result = treinar_modelo()
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
