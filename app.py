from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from models.predict import predict_session
from models.treinamento import treinar_modelo

DATASET = os.path.join('data', 'exemplos.json')
MODEL_FILE = os.path.join('data', 'modelo.pkl')

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Troque '*' para o domínio real em produção!

# --- INTELIGENCIA: SUGESTÃO DA SESSÃO (com logs) ---
@app.route('/api/inteligencia', methods=['POST'])
def inteligencia():
    data = request.json
    print("\n[LOG] Payload recebido em /api/inteligencia:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    # Chama modelo Python inteligente (Random Forest, TensorFlow, etc)
    try:
        resultado = predict_session(data)
        print("[LOG] Sugestão/modelo retornou:", resultado)
    except Exception as e:
        print("[ERRO] Falha na predição/modelo:", str(e))
        resultado = {"sessao": None, "sugestoes": []}
    return jsonify(resultado)

# --- ROTULAR E SALVAR EXEMPLOS (com logs) ---
@app.route('/api/rotulo', methods=['POST'])
def rotulo():
    exemplo = request.json
    print("\n[LOG] Rótulo salvo em /api/rotulo:")
    print(json.dumps(exemplo, indent=2, ensure_ascii=False))
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
    print(f"[LOG] Total de exemplos salvos: {len(exemplos)}")
    return jsonify({'ok': True, 'msg': 'Exemplo salvo para treino', 'total': len(exemplos)})

# --- TREINAR O MODELO ---
@app.route('/api/treinamento', methods=['POST'])
def treinamento():
    print("\n[LOG] Iniciando treinamento do modelo...")
    result = treinar_modelo()
    print("[LOG] Resultado do treinamento:", result)
    return jsonify(result)

# --- STATUS DO MODELO ---
@app.route('/api/model_status')
def model_status():
    exists = os.path.exists(MODEL_FILE)
    print(f"[LOG] Consulta de status do modelo: {'Treinado' if exists else 'Não treinado'}")
    return jsonify({'model_trained': exists})

@app.route('/')
def health():
    return 'Labelling backend up!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
