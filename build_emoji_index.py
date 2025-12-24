#!/usr/bin/env python3
"""
Script pour construire un index emoji à partir des lemmes du dictionnaire DYS.
Utilise l'API OpenAI pour suggérer des emojis pertinents.
"""

import json
import os
import re
import time
from openai import OpenAI
from dotenv import load_dotenv

# Charger la clé API depuis .env
load_dotenv()
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Fichiers
FICHIER_DICTIONNAIRE = 'data/dictionnaire_dys.json'
FICHIER_INDEX = 'data/index_emojis.json'
BATCH_SIZE = 30  # Nombre de mots par requête API

# Emojis manuels (prioritaires, ne seront pas écrasés)
EMOJIS_MANUELS = {
    "maison": "🏠",
    "école": "🏫",
    "livre": "📖",
    "lire": "📖",
    "écrire": "✍️",
    "ami": "🤝",
    "copain": "🤝",
    "jouer": "🎮",
    "jeu": "🎲",
    "manger": "🍽️",
    "repas": "🍽️",
    "eau": "💧",
    "feu": "🔥",
    "soleil": "☀️",
    "lune": "🌙",
    "ciel": "☁️",
    "arbre": "🌳",
    "fleur": "🌸",
    "chien": "🐶",
    "chat": "🐱",
    "oiseau": "🐦",
    "poisson": "🐟",
    "voiture": "🚗",
    "vélo": "🚲",
    "bus": "🚌",
    "train": "🚂",
    "avion": "✈️",
    "bateau": "⛵",
    "vêtement": "👕",
    "pantalon": "👖",
    "robe": "👗",
    "chaussure": "👟",
    "heure": "🕐",
    "temps": "⏳",
    "jour": "📅",
    "nuit": "🌃",
    "pomme": "🍎",
    "banane": "🍌",
    "pain": "🥖",
    "papa": "👨",
    "maman": "👩",
    "famille": "👨‍👩‍👧‍👦",
    "garçon": "👦",
    "fille": "👧",
    "homme": "👨",
    "femme": "👩",
    "bébé": "👶",
    "enfant": "🧒",
    "coeur": "❤️",
    "cœur": "❤️",
    "amour": "💕",
    "musique": "🎵",
    "chanson": "🎶",
    "danse": "💃",
    "danser": "💃",
    "football": "⚽",
    "basket": "🏀",
    "natation": "🏊",
    "nager": "🏊",
    "courir": "🏃",
    "marcher": "🚶",
    "dormir": "😴",
    "sommeil": "💤",
    "rêve": "💭",
    "rêver": "💭",
    "pluie": "🌧️",
    "neige": "❄️",
    "vent": "💨",
    "montagne": "⛰️",
    "mer": "🌊",
    "plage": "🏖️",
    "forêt": "🌲",
    "jardin": "🌻",
    "orange": "🍊",
    "fraise": "🍓",
    "cerise": "🍒",
    "raisin": "🍇",
    "citron": "🍋",
    "carotte": "🥕",
    "tomate": "🍅",
    "salade": "🥗",
    "fromage": "🧀",
    "pizza": "🍕",
    "gâteau": "🎂",
    "bonbon": "🍬",
    "chocolat": "🍫",
    "glace": "🍦",
    "café": "☕",
    "thé": "🍵",
    "lait": "🥛",
    "oeuf": "🥚",
    "œuf": "🥚",
    "poulet": "🍗",
    "viande": "🥩",
    "roi": "👑",
    "reine": "👸",
    "prince": "🤴",
    "princesse": "👸",
    "château": "🏰",
    "dragon": "🐉",
    "cheval": "🐴",
    "vache": "🐄",
    "cochon": "🐷",
    "mouton": "🐑",
    "lapin": "🐰",
    "souris": "🐭",
    "lion": "🦁",
    "tigre": "🐯",
    "éléphant": "🐘",
    "girafe": "🦒",
    "singe": "🐵",
    "serpent": "🐍",
    "grenouille": "🐸",
    "papillon": "🦋",
    "abeille": "🐝",
    "fourmi": "🐜",
    "araignée": "🕷️",
    "escargot": "🐌",
    "tortue": "🐢",
    "crocodile": "🐊",
    "baleine": "🐋",
    "dauphin": "🐬",
    "requin": "🦈",
    "étoile": "⭐",
    "terre": "🌍",
    "monde": "🌎",
    "planète": "🪐",
    "fusée": "🚀",
    "robot": "🤖",
    "téléphone": "📱",
    "ordinateur": "💻",
    "télévision": "📺",
    "appareil": "📷",
    "photo": "📸",
    "cadeau": "🎁",
    "fête": "🎉",
    "anniversaire": "🎂",
    "noël": "🎄",
    "père": "👨",
    "mère": "👩",
    "frère": "👦",
    "soeur": "👧",
    "sœur": "👧",
    "grand-père": "👴",
    "grand-mère": "👵",
    "docteur": "👨‍⚕️",
    "médecin": "👨‍⚕️",
    "police": "👮",
    "pompier": "🧑‍🚒",
    "professeur": "👨‍🏫",
    "élève": "🧑‍🎓",
    "clé": "🔑",
    "porte": "🚪",
    "fenêtre": "🪟",
    "lit": "🛏️",
    "table": "🪑",
    "chaise": "🪑",
    "lampe": "💡",
    "miroir": "🪞",
    "savon": "🧼",
    "brosse": "🪥",
    "dent": "🦷",
    "œil": "👁️",
    "oeil": "👁️",
    "nez": "👃",
    "bouche": "👄",
    "oreille": "👂",
    "main": "✋",
    "pied": "🦶",
    "doigt": "👆",
    "bras": "💪",
    "jambe": "🦵",
    "tête": "🗣️",
    "cheveu": "💇",
    "triste": "😢",
    "content": "😊",
    "heureux": "😃",
    "colère": "😠",
    "peur": "😨",
    "surprise": "😮",
    "fatigue": "😫",
    "fatigué": "😫",
    "malade": "🤒",
    "bien": "👍",
    "mal": "👎",
    "oui": "✅",
    "non": "❌",
    "question": "❓",
    "idée": "💡",
    "argent": "💰",
    "euro": "💶",
    "dollar": "💵",
    "travail": "💼",
    "sport": "🏅",
    "victoire": "🏆",
    "médaille": "🥇",
    "ski": "⛷️",
    "vélo": "🚴",
    "tennis": "🎾",
    "golf": "⛳",
    "bowling": "🎳",
    "piscine": "🏊",
    "camping": "🏕️",
    "vacances": "🏖️",
    "voyage": "✈️",
    "carte": "🗺️",
    "boussole": "🧭",
    "parapluie": "☂️",
    "lunettes": "👓",
    "chapeau": "🎩",
    "couronne": "👑",
    "bague": "💍",
    "collier": "📿",
    "montre": "⌚",
    "sac": "👜",
    "valise": "🧳",
    "crayon": "✏️",
    "stylo": "🖊️",
    "gomme": "🧽",
    "règle": "📏",
    "ciseaux": "✂️",
    "colle": "🧴",
    "papier": "📄",
    "lettre": "✉️",
    "enveloppe": "✉️",
    "timbre": "📮",
    "calendrier": "📆",
    "horloge": "🕰️",
    "réveil": "⏰",
    "cloche": "🔔",
    "tambour": "🥁",
    "guitare": "🎸",
    "piano": "🎹",
    "violon": "🎻",
    "trompette": "🎺",
    "micro": "🎤",
    "film": "🎬",
    "cinéma": "🎬",
    "théâtre": "🎭",
    "cirque": "🎪",
    "parc": "🎡",
    "zoo": "🦁",
    "aquarium": "🐠",
    "restaurant": "🍴",
    "hôtel": "🏨",
    "hôpital": "🏥",
    "pharmacie": "💊",
    "banque": "🏦",
    "magasin": "🏪",
    "supermarché": "🛒",
    "boulangerie": "🥐",
    "pâtisserie": "🧁",
    "fleuriste": "💐",
    "coiffeur": "💇",
    "dentiste": "🦷",
    "vétérinaire": "🐾",
    "ferme": "🏡",
    "usine": "🏭",
    "bureau": "🏢",
    "église": "⛪",
    "mosquée": "🕌",
    "temple": "🛕",
    "stade": "🏟️",
    "aéroport": "🛫",
    "gare": "🚉",
    "port": "⚓",
    "pont": "🌉",
    "tour": "🗼",
    "statue": "🗽",
    "pyramide": "🔺",
    "île": "🏝️",
    "volcan": "🌋",
    "désert": "🏜️",
    "cascade": "💦",
    "rivière": "🏞️",
    "lac": "🏞️",
    "océan": "🌊",
    "nuage": "☁️",
    "tonnerre": "⚡",
    "éclair": "⚡",
    "arc-en-ciel": "🌈",
    "printemps": "🌸",
    "été": "☀️",
    "automne": "🍂",
    "hiver": "❄️"
}


def extraire_lemmes_uniques(noms_seulement=True):
    """Extrait tous les lemmes uniques du dictionnaire DYS"""
    print(f"📂 Lecture de {FICHIER_DICTIONNAIRE}...")
    
    with open(FICHIER_DICTIONNAIRE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    entries = data.get('entries', [])
    
    # Extraire lemmes uniques (en minuscule pour éviter les doublons)
    lemmes = set()
    for entry in entries:
        # Filtrer par catégorie grammaticale si demandé
        if noms_seulement and entry.get('cgram') != 'NOM':
            continue
        
        lemme = entry.get('lemme', '').lower().strip()
        if lemme and len(lemme) > 1:
            lemmes.add(lemme)
    
    filtre_info = "(noms uniquement)" if noms_seulement else "(tous)"
    print(f"📊 {len(lemmes)} lemmes uniques trouvés {filtre_info}")
    return sorted(list(lemmes))


def charger_index_existant():
    """Charge l'index emoji existant s'il existe"""
    if os.path.exists(FICHIER_INDEX):
        with open(FICHIER_INDEX, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def sauvegarder_index(index):
    """Sauvegarde l'index emoji"""
    with open(FICHIER_INDEX, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2, sort_keys=True)


def demander_emojis_openai(mots):
    """Demande à GPT de suggérer des emojis pour une liste de mots"""
    
    prompt = f"""Tu es un expert en emojis. Pour chaque mot français ci-dessous, suggère UN emoji unique et pertinent qui représente visuellement le concept.

RÈGLES STRICTES:
- Réponds UNIQUEMENT avec un objet JSON valide
- Format: {{"mot": "emoji"}} où emoji est un seul caractère emoji
- Si aucun emoji ne correspond vraiment, mets null
- Pas d'explications, pas de texte supplémentaire
- Choisis des emojis visuellement évidents pour des enfants

Mots à traiter: {json.dumps(mots, ensure_ascii=False)}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1000
        )
        
        texte = response.choices[0].message.content.strip()
        
        # Nettoyer la réponse (enlever ```json si présent)
        texte = re.sub(r'^```json\s*', '', texte)
        texte = re.sub(r'\s*```$', '', texte)
        
        # Parser le JSON
        return json.loads(texte)
        
    except json.JSONDecodeError as e:
        print(f"⚠️ Erreur parsing JSON: {e}")
        print(f"   Réponse brute: {texte[:200]}...")
        return {}
    except Exception as e:
        print(f"❌ Erreur API: {e}")
        return {}


def construire_index():
    """Construit l'index emoji complet"""
    
    # 1. Charger l'index existant
    index = charger_index_existant()
    print(f"📚 Index existant: {len(index)} emojis")
    
    # 2. Ajouter les emojis manuels (prioritaires)
    for mot, emoji in EMOJIS_MANUELS.items():
        index[mot] = emoji
    print(f"✅ Emojis manuels appliqués: {len(EMOJIS_MANUELS)}")
    
    # 3. Extraire tous les lemmes
    tous_lemmes = extraire_lemmes_uniques()
    
    # 4. Filtrer ceux qui n'ont pas encore d'emoji
    a_traiter = [m for m in tous_lemmes if m not in index]
    print(f"🔍 {len(a_traiter)} lemmes sans emoji à traiter via OpenAI")
    
    if len(a_traiter) == 0:
        print("✨ Tous les lemmes ont déjà un emoji!")
        sauvegarder_index(index)
        return
    
    # Limiter pour le test initial (tu peux augmenter après)
    MAX_MOTS = 200  # Traiter max 200 mots par exécution
    a_traiter = a_traiter[:MAX_MOTS]
    print(f"📝 Traitement de {len(a_traiter)} mots (limite: {MAX_MOTS})")
    
    # 5. Traiter par lots
    total_lots = (len(a_traiter) + BATCH_SIZE - 1) // BATCH_SIZE
    nouveaux = 0
    
    for i in range(0, len(a_traiter), BATCH_SIZE):
        batch = a_traiter[i:i+BATCH_SIZE]
        lot_num = i // BATCH_SIZE + 1
        
        print(f"\n📡 Lot {lot_num}/{total_lots}: {len(batch)} mots ({batch[0]}...{batch[-1]})")
        
        resultats = demander_emojis_openai(batch)
        
        for mot, emoji in resultats.items():
            if emoji and mot not in EMOJIS_MANUELS:  # Ne pas écraser les manuels
                index[mot.lower()] = emoji
                nouveaux += 1
        
        # Sauvegarder après chaque lot
        sauvegarder_index(index)
        print(f"   💾 Sauvegardé ({nouveaux} nouveaux emojis)")
        
        # Pause pour respecter les rate limits
        if lot_num < total_lots:
            time.sleep(0.5)
    
    print("\n" + "=" * 50)
    print(f"✅ Terminé!")
    print(f"📊 Total emojis dans l'index: {len(index)}")
    print(f"🆕 Nouveaux emojis ajoutés: {nouveaux}")
    print(f"📁 Index sauvegardé: {FICHIER_INDEX}")


def afficher_stats():
    """Affiche les statistiques de l'index"""
    if not os.path.exists(FICHIER_INDEX):
        print("❌ Index non trouvé")
        return
    
    with open(FICHIER_INDEX, 'r', encoding='utf-8') as f:
        index = json.load(f)
    
    print(f"📊 Statistiques de l'index emoji")
    print(f"   Total entrées: {len(index)}")
    
    # Compter les emojis uniques
    emojis_uniques = set(index.values())
    print(f"   Emojis uniques: {len(emojis_uniques)}")
    
    # Exemple d'entrées
    print(f"\n📝 Exemples:")
    for i, (mot, emoji) in enumerate(list(index.items())[:10]):
        print(f"   {mot}: {emoji}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--stats":
        afficher_stats()
    else:
        construire_index()

