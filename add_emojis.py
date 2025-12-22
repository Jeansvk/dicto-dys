import json
import emoji  # pip install emoji

# --- CONFIGURATION ---
FICHIER_ENTREE = 'data/lemmes.json'
FICHIER_SORTIE = 'data/lemmes_emojis.json'

# --- DICTIONNAIRE MANUEL (Le filet de sécurité) ---
# La librairie automatique peut rater des mots simples.
# On force les plus courants pour l'école ici.
PATCH_MANUEL = {
    "maison": "🏠", "école": "🏫", "livre": "📖", "lire": "📖",
    "écrire": "✍️", "ami": "🤝", "copain": "🤝", "jouer": "🎮",
    "jeu": "🎲", "manger": "🍽️", "repas": "🍽️", "eau": "💧",
    "feu": "🔥", "soleil": "☀️", "lune": "🌙", "ciel": "☁️",
    "arbre": "🌳", "fleur": "🌸", "chien": "🐶", "chat": "🐱",
    "oiseau": "🐦", "poisson": "🐟", "voiture": "🚗", "vélo": "🚲",
    "bus": "🚌", "train": "🚂", "avion": "✈️", "bateau": "⛵",
    "vêtement": "👕", "pantalon": "👖", "robe": "👗", "chaussure": "👟",
    "heure": "🕐", "temps": "⏳", "jour": "📅", "nuit": "🌃",
    "pomme": "🍎", "banane": "🍌", "pain": "🥖",
    "papa": "👨", "maman": "👩", "famille": "👨‍👩‍👧‍👦",
    "garçon": "👦", "fille": "👧", "homme": "👨", "femme": "👩",
    "grand": "🐘", "petit": "🐭", "rapide": "🚀", "lent": "🐢"
}

def ajouter_emojis():
    print(f"📂 Lecture de {FICHIER_ENTREE}...")
    
    try:
        with open(FICHIER_ENTREE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ Erreur : Fichier non trouvé.")
        return

    compteur = 0
    total = len(data)
    
    print("🔄 Mapping en cours...")

    for item in data:
        mot = item['lemme'].lower() # On met en minuscule pour chercher
        
        # 1. On regarde d'abord dans notre PATCH MANUEL (prioritaire)
        if mot in PATCH_MANUEL:
            item['emoji'] = PATCH_MANUEL[mot]
            compteur += 1
            continue # On passe au suivant

        # 2. Sinon, on demande à la LIBRAIRIE
        # La librairie cherche des alias comme :chat: ou :cœur_rouge:
        candidat = emoji.emojize(f":{mot}:", language='fr')

        # Si emoji.emojize ne trouve rien, il renvoie le texte original ":mot:"
        if candidat != f":{mot}:":
            item['emoji'] = candidat
            compteur += 1
        else:
            # 3. Dernier recours : tenter le mot sans accents ? (parfois utile)
            # Ici on met null pour que tu puisses filtrer facilement après
            item['emoji'] = None

    # Sauvegarde
    with open(FICHIER_SORTIE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("-" * 30)
    print(f"✅ Terminé !")
    print(f"Mots mappés : {compteur} / {total} ({round(compteur/total*100)}%)")
    print(f"📁 Fichier créé : {FICHIER_SORTIE}")

if __name__ == "__main__":
    ajouter_emojis()


