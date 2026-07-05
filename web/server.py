from flask import Flask, send_from_directory, request, jsonify
from flask_socketio import SocketIO
import hashlib
import json
import os
import re
import secrets
import socket
import multiprocessing
import threading
import time
import webbrowser
from datetime import datetime
from threading import Lock

import customtkinter as ctk

file_lock = Lock()

BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
HISTORIQUE_FILE = "historique.json"
ADMIN_FILE      = os.path.join(BASE_DIR, "adminHisto.json")
PORT            = 5000

app      = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


def load_json(file):
    if not os.path.exists(file):
        return []
    try:
        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Erreur JSON ({file}) : {e}")
        return []


def save_json(file, data):
    try:
        with open(file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"❌ Erreur écriture ({file}) : {e}")
        return False


def normaliser(val):
    return str(val or "").strip().lower()


def clean_centre_name(centre):
    texte = str(centre or "").strip()
    # Autoriser seulement les lettres, chiffres, underscore, tiret et espaces.
    texte = re.sub(r"[^\w\s\-]", "", texte)
    texte = texte.replace("/", "-")
    texte = re.sub(r"\s+", "_", texte)
    return texte


def is_valid_email(email):
    email = str(email or "").strip()
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) is not None


def clean_account_name(account):
    texte = str(account or "").strip().lower()
    texte = re.sub(r"[^\w\-]", "_", texte)
    texte = re.sub(r"_+", "_", texte)
    return texte


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    )
    return f"{salt}${digest.hex()}"


def verify_password(password, stored):
    if not stored:
        return False
    if "$" in stored:
        try:
            salt, expected = stored.split("$", 1)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                100_000
            )
            return secrets.compare_digest(digest.hex(), expected)
        except Exception:
            return False
    return secrets.compare_digest(str(password), str(stored))


def lire_admin():
    if not os.path.exists(ADMIN_FILE):
        ecrire_admin({"mdp": "admin123"})
    try:
        with open(ADMIN_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Erreur lecture adminHisto.json : {e}")
        return {}


def ecrire_admin(data):
    try:
        with open(ADMIN_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"❌ Erreur écriture adminHisto.json : {e}")
        return False


# ==================================================
# ISOLATION PAR CENTRE
# Chaque centre a son dossier : data/<centre>/
# ==================================================

def dossier_centre(centre, account=None):
    nom = clean_centre_name(centre)
    if not nom:
        nom = "inconnu"
    if account:
        compte = clean_account_name(account)
        if compte:
            nom = os.path.join(nom, compte)
    dossier = os.path.join(BASE_DIR, "data", nom)
    os.makedirs(dossier, exist_ok=True)
    return dossier


def fichier_centre(centre, nom_fichier, account=None):
    return os.path.join(dossier_centre(centre, account), nom_fichier)


def get_account_request_data():
    args = request.args
    data = request.get_json(silent=True) or {}
    centre = str(args.get("centre") or data.get("centre") or "").strip()
    email  = str(args.get("email") or data.get("email") or "").strip()
    return centre, email


def broadcast_personnel(centre, account):
    fichier = fichier_centre(centre, "personnel.json", account)
    with file_lock:
        data = load_json(fichier)
    socketio.emit(f"update_personnel_{normaliser(centre)}_{clean_account_name(account)}", data)


def broadcast_patients(centre, account):
    fichier = fichier_centre(centre, "patients.json")
    with file_lock:
        data = load_json(fichier)
    socketio.emit(f"update_patients_{normaliser(centre)}", data)


def reset_presence_if_new_day():
    fichier_date = os.path.join(BASE_DIR, "last_reset.txt")
    aujourd_hui  = datetime.now().strftime("%Y-%m-%d")

    derniere_date = ""
    if os.path.exists(fichier_date):
        with open(fichier_date, "r") as f:
            derniere_date = f.read().strip()

    if derniere_date != aujourd_hui:
        data_dir = os.path.join(BASE_DIR, "data")
        if os.path.exists(data_dir):
            for root_dir, _, files in os.walk(data_dir):
                if "personnel.json" in files:
                    fichier = os.path.join(root_dir, "personnel.json")
                    with file_lock:
                        personnel = load_json(fichier)
                        for p in personnel:
                            p["statut"] = "absent"
                        save_json(fichier, personnel)
        with open(fichier_date, "w") as f:
            f.write(aujourd_hui)
        print("🔄 Présences réinitialisées.")


def surveillance_presence():
    while True:
        reset_presence_if_new_day()
        time.sleep(60)


# ==================================================
# INSCRIPTION
# ==================================================

@app.route("/inscription", methods=["POST"])
def inscription():
    data    = request.get_json() or {}
    admin   = str(data.get("admin", "")).strip()
    centre  = str(data.get("centre", "")).strip()
    email   = str(data.get("email", "")).strip()
    mdp     = str(data.get("mdp", "")).strip()
    service = str(data.get("service", "")).strip()
    serveur = str(data.get("serveur", "")).strip()

    if not admin or not centre or not email or not mdp or not service or not serveur:
        return jsonify({"success": False, "message": "Tous les champs sont requis."}), 400

    if service == "Quel est votre service":
        return jsonify({"success": False, "message": "Service invalide."}), 400

    if not is_valid_email(email):
        return jsonify({"success": False, "message": "Adresse e-mail invalide."}), 400

    fichier = os.path.join(BASE_DIR, "utilisateurs.json")
    try:
        with file_lock:
            utilisateurs = load_json(fichier)
            for u in utilisateurs:
                if normaliser(u.get("email")) == normaliser(email):
                    return jsonify({"success": False, "message": "Cet email est déjà utilisé."}), 400

            utilisateur = {
                "admin": admin,
                "centre": centre,
                "email": email,
                "service": service,
                "serveur": serveur,
                "password_hash": hash_password(mdp)
            }
            utilisateurs.append(utilisateur)
            save_json(fichier, utilisateurs)

        dossier_centre(centre)
        print(f"✅ Nouveau compte : {email} — Centre : {centre}")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==================================================
# CONNEXION
# ==================================================

@app.route("/connexion", methods=["POST"])
def connexion():
    data    = request.get_json() or {}
    email   = str(data.get("email", "")).strip()
    mdp     = str(data.get("mdp", "")).strip()
    admin   = str(data.get("admin", "")).strip()
    centre  = str(data.get("centre", "")).strip()
    service = str(data.get("service", "")).strip()
    serveur = str(data.get("serveur", "")).strip()

    if not email or not mdp or not admin or not centre or not service or not serveur:
        return jsonify({"success": False, "message": "Tous les champs sont requis."}), 400

    fichier = os.path.join(BASE_DIR, "utilisateurs.json")
    if not os.path.exists(fichier):
        return jsonify({"success": False, "message": "Aucun compte trouvé. Inscrivez-vous."}), 404

    with file_lock:
        utilisateurs = load_json(fichier)
        for u in utilisateurs:
            if (
                normaliser(u.get("email"))  == normaliser(email) and
                normaliser(u.get("admin"))  == normaliser(admin) and
                normaliser(u.get("centre")) == normaliser(centre) and
                normaliser(u.get("service")) == normaliser(service) and
                normaliser(u.get("serveur")) == normaliser(serveur)
            ):
                password_ok = False
                if u.get("password_hash"):
                    password_ok = verify_password(mdp, u.get("password_hash"))
                elif u.get("mdp"):
                    password_ok = secrets.compare_digest(u.get("mdp", ""), mdp)
                    if password_ok:
                        u["password_hash"] = hash_password(mdp)
                        u.pop("mdp", None)
                        save_json(fichier, utilisateurs)

                if password_ok:
                    print(f"✅ Connexion : {u.get('email')} — Centre : {u.get('centre')}")
                    return jsonify({"success": True, "centre": u.get("centre"), "email": u.get("email")})

    print(f"❌ Échec connexion : {email}")
    return jsonify({"success": False, "message": "Informations incorrectes. Vérifiez tous les champs."}), 401


# ==================================================
# PERSONNEL (isolé par centre)
# ==================================================

@app.route("/personnel", methods=["GET"])
def get_personnel():
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    with file_lock:
        return jsonify(load_json(fichier_centre(centre, "personnel.json", email)))


@app.route("/personnel", methods=["POST"])
def add_personnel():
    data   = request.get_json() or {}
    centre, email = get_account_request_data()
    print("===== DONNEES RECUES =====")
    print(data)
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "personnel.json", email)
    with file_lock:
        personnel = load_json(fichier)
        personnel.append(data)
        save_json(fichier, personnel)
    broadcast_personnel(centre, email)
    return jsonify({"success": True})


@app.route("/personnel/<int:index>", methods=["DELETE"])
def supprimer_personnel(index):
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "personnel.json", email)
    with file_lock:
        personnel = load_json(fichier)
        if index < 0 or index >= len(personnel):
            return jsonify({"success": False, "message": "Index invalide"}), 400
        personnel.pop(index)
        save_json(fichier, personnel)
    broadcast_personnel(centre, email)
    return jsonify({"success": True})


@app.route("/personnel/toggle/<int:index>", methods=["PUT"])
def presence_personnel(index):
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "personnel.json", email)
    with file_lock:
        personnel = load_json(fichier)
        if index < 0 or index >= len(personnel):
            return jsonify({"success": False, "message": "Index invalide"}), 400
        statut = personnel[index].get("statut", "absent")
        personnel[index]["statut"] = "absent" if statut == "present" else "present"
        save_json(fichier, personnel)
    broadcast_personnel(centre, email)
    return jsonify({"success": True})


@app.route("/personnel/justifier/<int:index>", methods=["PUT"])
def justifier_absence(index):
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "personnel.json", email)
    with file_lock:
        personnel = load_json(fichier)
        if index < 0 or index >= len(personnel):
            return jsonify({"success": False, "message": "Index invalide"}), 400
        personnel[index]["statut"] = "justifie"
        save_json(fichier, personnel)
    broadcast_personnel(centre, email)
    return jsonify({"success": True})


# ==================================================
# PATIENTS (isolé par centre)
# ==================================================

@app.route("/patients", methods=["GET"])
def get_patients():
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    with file_lock:
        return jsonify(load_json(fichier_centre(centre, "patients.json", email)))


@app.route("/patients", methods=["POST"])
def add_patients():
    data   = request.get_json() or {}
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "patients.json", email)
    with file_lock:
        patients = load_json(fichier)
        numero   = len(patients) + 1
        data["dossier"] = f"PAT-{numero:04d}"
        patients.append(data)
        save_json(fichier, patients)
    broadcast_patients(centre, email)
    return jsonify({"success": True, "dossier": data["dossier"]})


@app.route("/patients/<string:dossier>", methods=["DELETE"])
def supprimer_patient(dossier):
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "patients.json", email)
    with file_lock:
        patients = load_json(fichier)
        nouveaux = [p for p in patients if p.get("dossier") != dossier]
        if len(nouveaux) == len(patients):
            return jsonify({"success": False, "message": "Dossier introuvable"}), 404
        save_json(fichier, nouveaux)
    broadcast_patients(centre, email)
    return jsonify({"success": True})


@app.route("/patients/<string:dossier>/constantes", methods=["PUT"])
def update_constantes(dossier):
    data   = request.get_json() or {}
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "patients.json", email)
    with file_lock:
        patients = load_json(fichier)
        patient = next((p for p in patients if p.get("dossier") == dossier), None)
        if not patient:
            return jsonify({"success": False, "message": "Dossier introuvable"}), 404
        patient["constantes"] = data.get("constantes", {})
        save_json(fichier, patients)
    broadcast_patients(centre, email)
    return jsonify({"success": True})


@app.route("/patients/<string:dossier>/consultations", methods=["POST"])
def add_consultation(dossier):
    data   = request.get_json() or {}
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    consultation = data.get("consultation", {})
    fichier = fichier_centre(centre, "patients.json", email)
    with file_lock:
        patients = load_json(fichier)
        patient = next((p for p in patients if p.get("dossier") == dossier), None)
        if not patient:
            return jsonify({"success": False, "message": "Dossier introuvable"}), 404
        patient.setdefault("consultations", []).insert(0, consultation)
        save_json(fichier, patients)
    broadcast_patients(centre, email)
    return jsonify({"success": True})


# ==================================================
# HISTORIQUE (isolé par centre)
# ==================================================

@app.route("/historique", methods=["GET"])
def get_historique():
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    with file_lock:
        return jsonify(load_json(fichier_centre(centre, "historique.json", email)))


@app.route("/historique", methods=["POST"])
def save_historique():
    data   = request.get_json() or {}
    centre, email = get_account_request_data()
    if not centre:
        return jsonify({"success": False, "message": "Centre manquant"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email de compte manquant"}), 400
    fichier = fichier_centre(centre, "historique.json", email)
    with file_lock:
        historique = load_json(fichier)
        historique = [h for h in historique if h.get("date") != data.get("date")]
        historique.insert(0, data)
        save_json(fichier, historique)
    return jsonify({"success": True})


# ==================================================
# ADMIN
# ==================================================

@app.route("/verifier-admin", methods=["POST"])
def verifier_admin():
    data      = request.get_json()
    mdp_saisi = data.get("mdp", "").strip()
    admin     = lire_admin()
    if not isinstance(admin, dict):
        return jsonify({"success": False, "message": "Fichier admin corrompu."})
    if mdp_saisi == admin.get("mdp", "").strip():
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Mot de passe incorrect."})


@app.route("/modifier-admin", methods=["POST"])
def modifier_admin():
    data    = request.get_json()
    ancien  = data.get("ancien", "").strip()
    nouveau = data.get("nouveau", "").strip()
    if not ancien or not nouveau:
        return jsonify({"success": False, "message": "Champs manquants."})
    admin = lire_admin()
    if ancien != admin.get("mdp", "").strip():
        return jsonify({"success": False, "message": "Ancien mot de passe incorrect."})
    if len(nouveau) < 4:
        return jsonify({"success": False, "message": "Mot de passe trop court (min 4 caractères)."})
    admin["mdp"] = nouveau
    if ecrire_admin(admin):
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Erreur lors de l'enregistrement."})


# ==================================================
# FICHIERS STATIQUES
# ==================================================

@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def files(filename):
    return send_from_directory(".", filename)


# ==================================================
# CYCLE DE VIE DU SERVEUR
#
# Le serveur Flask/SocketIO tourne dans un PROCESSUS séparé
# (multiprocessing), pas dans un simple thread. Cela permet de
# vraiment l'arrêter (terminate) et donc de le "déconnecter" du
# réseau, sans fermer l'application du gestionnaire. On peut ensuite
# le redémarrer autant de fois qu'on veut depuis la fenêtre.
# ==================================================

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def run_flask():
    """Point d'entrée exécuté DANS le processus serveur."""
    threading.Thread(target=surveillance_presence, daemon=True).start()
    socketio.run(app, host="0.0.0.0", port=PORT, debug=False, allow_unsafe_werkzeug=True)


# ==================================================
# INTERFACE GRAPHIQUE — CustomTkinter
# ==================================================

if __name__ == "__main__":
    multiprocessing.freeze_support()

    # ---------- palette ----------
    BG       = "#0B1220"
    CARD     = "#111A2B"
    CARD2    = "#182238"
    BORDER   = "#22304A"
    ACCENT   = "#2563EB"
    ACCENT_H = "#1D4ED8"
    SUCCESS  = "#22C55E"
    DANGER   = "#EF4444"
    DANGER_H = "#DC2626"
    TEXT     = "#F8FAFC"
    TEXT2    = "#8FA0BC"

    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")

    server_process = None
    server_running = False
    ip_address     = get_ip()

    root = ctk.CTk()
    root.title("SanaLite — Gestionnaire de serveur")
    root.configure(fg_color=BG)

    win_w, win_h = 620, 740
    root.geometry(f"{win_w}x{win_h}")
    root.resizable(False, False)
    root.update_idletasks()
    screen_x = (root.winfo_screenwidth() // 2) - (win_w // 2)
    screen_y = (root.winfo_screenheight() // 2) - (win_h // 2)
    root.geometry(f"{win_w}x{win_h}+{screen_x}+{screen_y}")

    # ---------- en-tête ----------
    header = ctk.CTkFrame(root, fg_color="transparent")
    header.pack(fill="x", padx=30, pady=(28, 10))

    ctk.CTkLabel(header, text="🏥", font=ctk.CTkFont(size=38)).pack(side="left", padx=(0, 14))

    title_box = ctk.CTkFrame(header, fg_color="transparent")
    title_box.pack(side="left", fill="both", expand=True)
    ctk.CTkLabel(title_box, text="SanaLite", font=ctk.CTkFont(size=25, weight="bold"),
                 text_color=TEXT).pack(anchor="w")
    ctk.CTkLabel(title_box, text="Gestionnaire du serveur hospitalier", font=ctk.CTkFont(size=12),
                 text_color=TEXT2).pack(anchor="w")

    status_pill = ctk.CTkFrame(header, fg_color=CARD2, corner_radius=18)
    status_pill.pack(side="right")
    status_dot = ctk.CTkLabel(status_pill, text="●", font=ctk.CTkFont(size=13), text_color=DANGER)
    status_dot.pack(side="left", padx=(14, 5), pady=7)
    status_text = ctk.CTkLabel(status_pill, text="Hors ligne", font=ctk.CTkFont(size=12, weight="bold"),
                                text_color=TEXT)
    status_text.pack(side="left", padx=(0, 14), pady=7)

    # ---------- carte informations réseau ----------
    info_card = ctk.CTkFrame(root, fg_color=CARD, corner_radius=16, border_width=1, border_color=BORDER)
    info_card.pack(fill="x", padx=30, pady=8)

    ctk.CTkLabel(info_card, text="Informations du serveur", font=ctk.CTkFont(size=14, weight="bold"),
                 text_color=TEXT).pack(anchor="w", padx=20, pady=(16, 6))
    ctk.CTkFrame(info_card, height=1, fg_color=BORDER).pack(fill="x", padx=20)

    def info_row(parent, label_text, value_text, copyable=False):
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=20, pady=(10, 0))
        ctk.CTkLabel(row, text=label_text, font=ctk.CTkFont(size=12), text_color=TEXT2,
                     width=100, anchor="w").pack(side="left")
        value_label = ctk.CTkLabel(row, text=value_text, font=ctk.CTkFont(size=13, weight="bold"),
                                    text_color=TEXT, anchor="w")
        value_label.pack(side="left", fill="x", expand=True)
        if copyable:
            def copy_value():
                root.clipboard_clear()
                root.clipboard_append(value_label.cget("text"))
                log(f"📋 Copié dans le presse-papiers : {value_label.cget('text')}")
            ctk.CTkButton(row, text="Copier", width=64, height=26, corner_radius=8,
                          fg_color=CARD2, hover_color=BORDER, text_color=TEXT,
                          font=ctk.CTkFont(size=11), command=copy_value).pack(side="right")
        return value_label

    info_row(info_card, "Adresse IP", ip_address)
    info_row(info_card, "Port", str(PORT))
    info_row(info_card, "URL réseau", f"http://{ip_address}:{PORT}", copyable=True)

    ctk.CTkLabel(
        info_card,
        text="Partagez cette URL avec les autres postes du centre pour qu'ils\naccèdent à SanaLite pendant que le serveur est en ligne.",
        font=ctk.CTkFont(size=11), text_color=TEXT2, justify="left"
    ).pack(anchor="w", padx=20, pady=(8, 16))

    # ---------- bouton principal ----------
    start_btn = ctk.CTkButton(
        root, text="▶   DÉMARRER LE SERVEUR", height=54, corner_radius=14,
        font=ctk.CTkFont(size=15, weight="bold"),
        fg_color=ACCENT, hover_color=ACCENT_H, text_color="white",
        command=lambda: toggle_server()
    )
    start_btn.pack(fill="x", padx=30, pady=(6, 10))

    secondary_row = ctk.CTkFrame(root, fg_color="transparent")
    secondary_row.pack(fill="x", padx=30, pady=(0, 14))

    browser_btn = ctk.CTkButton(
        secondary_row, text="🌐  Ouvrir dans le navigateur", height=38, corner_radius=10,
        font=ctk.CTkFont(size=12), fg_color=CARD2, hover_color=BORDER, text_color=TEXT,
        state="disabled",
        command=lambda: webbrowser.open(f"http://127.0.0.1:{PORT}")
    )
    browser_btn.pack(side="left", fill="x", expand=True, padx=(0, 6))

    quit_btn = ctk.CTkButton(
        secondary_row, text="✕  Quitter", height=38, corner_radius=10,
        font=ctk.CTkFont(size=12), fg_color=CARD2, hover_color=DANGER_H, text_color=TEXT,
        command=lambda: on_closing()
    )
    quit_btn.pack(side="left", fill="x", expand=True, padx=(6, 0))

    # ---------- journal ----------
    log_card = ctk.CTkFrame(root, fg_color=CARD, corner_radius=16, border_width=1, border_color=BORDER)
    log_card.pack(fill="both", expand=True, padx=30, pady=(0, 10))

    ctk.CTkLabel(log_card, text="Journal des événements", font=ctk.CTkFont(size=14, weight="bold"),
                 text_color=TEXT).pack(anchor="w", padx=20, pady=(16, 6))
    ctk.CTkFrame(log_card, height=1, fg_color=BORDER).pack(fill="x", padx=20)

    logs = ctk.CTkTextbox(log_card, fg_color="#060B14", text_color="#CBD5E1",
                           font=ctk.CTkFont(family="Consolas", size=12), corner_radius=10, wrap="word")
    logs.pack(fill="both", expand=True, padx=20, pady=(10, 16))
    logs.configure(state="disabled")

    ctk.CTkLabel(root, text="SanaLite RDC • Server Manager v2.1", font=ctk.CTkFont(size=10),
                 text_color=TEXT2).pack(pady=(0, 14))

    # ---------- logique ----------
    def log(message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        logs.configure(state="normal")
        logs.insert("end", f"[{timestamp}] {message}\n")
        logs.see("end")
        logs.configure(state="disabled")

    def set_status(running):
        global server_running
        server_running = running
        if running:
            status_dot.configure(text_color=SUCCESS)
            status_text.configure(text="En ligne")
            start_btn.configure(text="■   ARRÊTER LE SERVEUR", fg_color=DANGER, hover_color=DANGER_H)
            browser_btn.configure(state="normal")
        else:
            status_dot.configure(text_color=DANGER)
            status_text.configure(text="Hors ligne")
            start_btn.configure(text="▶   DÉMARRER LE SERVEUR", fg_color=ACCENT, hover_color=ACCENT_H)
            browser_btn.configure(state="disabled")

    def check_started():
        start_btn.configure(state="normal")
        if server_process is not None and server_process.is_alive():
            log(f"✅ Serveur démarré sur http://{ip_address}:{PORT}")
            set_status(True)
            webbrowser.open(f"http://127.0.0.1:{PORT}")
        else:
            log("❌ Échec du démarrage — le port 5000 est peut-être déjà utilisé.")
            set_status(False)

    def start_server_process():
        global server_process
        start_btn.configure(state="disabled")
        server_process = multiprocessing.Process(target=run_flask, daemon=True)
        server_process.start()
        log("⏳ Démarrage du serveur…")
        root.after(1200, check_started)

    def _finish_stop():
        set_status(False)
        log("⏹ Serveur arrêté — plus accessible sur le réseau.")
        start_btn.configure(state="normal")

    def stop_server_process():
        global server_process
        log("🛑 Arrêt du serveur…")
        start_btn.configure(state="disabled")

        def _stop_worker():
            global server_process
            if server_process is not None and server_process.is_alive():
                server_process.terminate()
                server_process.join(timeout=5)
            server_process = None
            root.after(0, _finish_stop)

        threading.Thread(target=_stop_worker, daemon=True).start()

    def toggle_server():
        if not server_running:
            start_server_process()
        else:
            stop_server_process()

    def watchdog():
        if server_running and (server_process is None or not server_process.is_alive()):
            log("⚠️ Le serveur s'est arrêté de façon inattendue.")
            set_status(False)
        root.after(3000, watchdog)

    def on_closing():
        global server_process
        if server_process is not None and server_process.is_alive():
            log("🛑 Fermeture — arrêt du serveur…")
            server_process.terminate()
            server_process.join(timeout=5)
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_closing)

    log("SanaLite Server Manager prêt — v2.1 (données isolées par centre)")
    log(f"📂 BASE_DIR   : {BASE_DIR}")
    log(f"🔑 Admin file : {ADMIN_FILE}")

    root.after(3000, watchdog)
    root.mainloop()