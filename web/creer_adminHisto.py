"""
Lance ce script UNE SEULE FOIS dans le même dossier que server.py
pour créer le fichier adminHisto.json avec le mot de passe par défaut.

    python creer_adminHisto.py

Ensuite connecte-toi avec : admin123
Et change le mot de passe depuis l'interface.
"""
import json, os

fichier = os.path.join(os.path.dirname(os.path.abspath(__file__)), "adminHisto.json")

if os.path.exists(fichier):
    with open(fichier, "r", encoding="utf-8") as f:
        contenu = json.load(f)
    print(f"✅ adminHisto.json existe déjà : mdp = '{contenu.get('mdp')}'")
else:
    with open(fichier, "w", encoding="utf-8") as f:
        json.dump({"mdp": "admin123"}, f, indent=4, ensure_ascii=False)
    print(f"✅ adminHisto.json créé dans : {fichier}")
    print("🔑 Mot de passe par défaut : admin123")
