import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import os

# Arquivos persistidos (ajuste caminhos conforme seu repositório)
UX_EXAMPLES_FILE = "ux_examples.json"
UX_LABELS_FILE = "labels.json"

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# ========== Mock/modelo de sugestão ==========
def suggest_labels(features):
    """
    Lógica simples de sugestão, pode ser plugado com seu modelo real.
    Retorna sugestões de sessões baseadas nas features recebidas.
    """
    # Exemplo mockado: sempre sugere sessões "comuns"
    common_labels = [
        "header", "menu", "hero", "banner", "footer",
        "h1", "h2", "parágrafo", "conteúdo", "modal"
    ]
    # (Aqui você pode chamar seu modelo de Machine Learning real)
    # Você pode usar features["headings"] ou features["fullSelector"], etc.
    return common_labels

def load_json_safe(filename, default=None):
    if not os.path.exists(filename):
        return default if default is not None else []
    try:
        with open(filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default if default is not None else []

def save_json_safe(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ========== Rotas ==========

@app.route("/")
def health():
    return "Backend API online", 200

@app.route("/predict", methods=["POST"])
def predict():
    """
    Recebe features de um elemento, retorna sugestões de sessões/labels.
    """
    data = request.get_json()
    if not data:
        return jsonify({"ok": False, "msg": "No features sent"}), 400
    suggestions = suggest_labels(data)
    return jsonify({"ok": True, "suggestions": suggestions})

@app.route("/rotular", methods=["POST"])
def rotular():
    """
    Salva um exemplo rotulado (features + label).
    """
    data = request.get_json()
    features = data.get("features")
    label = data.get("label")
    if not features or not label:
        return jsonify({"ok": False, "msg": "Features e label são obrigatórios"}), 400

    exemplos = load_json_safe(UX_EXAMPLES_FILE, default=[])
    exemplos.append({"features": features, "sessao": label})
    save_json_safe(UX_EXAMPLES_FILE, exemplos)

    # Atualiza lista de labels únicos
    labels = set(load_json_safe(UX_LABELS_FILE, default=[]))
    labels.add(label)
    save_json_safe(UX_LABELS_FILE, list(labels))

    return jsonify({"ok": True, "msg": "Exemplo salvo"})

@app.route("/labels", methods=["GET"])
def list_labels():
    """
    Retorna todos os labels/sessões já cadastrados (para autocomplete).
    """
    labels = load_json_safe(UX_LABELS_FILE, default=[])
    return jsonify({"ok": True, "labels": labels})

# CORS headers para métodos OPTIONS
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    response = make_response('', 200)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.errorhandler(Exception)
def handle_error(e):
    import traceback
    tb = traceback.format_exc()
    print("[API ERROR]", e, tb)
    resp = make_response(str(e) + "\n" + tb, 500)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp

if __name__ == "__main__":
    print("[Auto-UX] Iniciando backend API")
    app.run(host="0.0.0.0", port=8080)
