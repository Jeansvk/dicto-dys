import json

# Fichiers
FICHIER_ENTREE = 'data/lemmes_noms_emojis.json'
FICHIER_SORTIE = 'data/lemmes_noms_emojis_final.json'

# DICTIONNAIRE MANUEL COMPLET
EMOJIS_MANUELS = {
    # ==========================================
    # 🍽️ NOURRITURE & BOISSONS
    # ==========================================
    'lait': '🥛', 'café': '☕', 'thé': '🍵', 'jus': '🧃', 'bière': '🍺', 'vin': '🍷',
    'repas': '🍽️', 'déjeuner': '🥣', 'dîner': '🥘', 'goûter': '🍪',
    'oeuf': '🥚', 'fromage': '🧀', 'beurre': '🧈', 'yaourt': '🥣',
    'viande': '🥩', 'poulet': '🍗', 'porc': '🐖', 'boeuf': '🐄', 'poisson': '🐟',
    'riz': '🍚', 'pâte': '🍝', 'frite': '🍟', 'pizza': '🍕', 'burger': '🍔', 'sandwich': '🥪',
    'sucre': '🍬', 'sel': '🧂', 'poivre': '🌶️', 'huile': '🛢️', 'sauce': '🥫',
    'chocolat': '🍫', 'gâteau': '🍰', 'glace': '🍦', 'bonbon': '🍬', 'miel': '🍯',
    'fruit': '🍎', 'orange': '🍊', 'citron': '🍋', 'fraise': '🍓', 'raisin': '🍇',
    'légume': '🥦', 'carotte': '🥕', 'tomate': '🍅', 'salade': '🥗',
    'oignon': '🧅', 'ail': '🧄', 'champignon': '🍄', 'noix': '🌰',

    # ==========================================
    # 👕 VÊTEMENTS & ACCESSOIRES
    # ==========================================
    'vêtement': '👕', 'pantalon': '👖', 'chemise': '👔', 'robe': '👗',
    'pull': '🧶', 'manteau': '🧥', 'veste': '🧥', 'pyjama': '🛌',
    'chaussure': '👞', 'basket': '👟', 'botte': '👢', 'chaussette': '🧦',
    'chapeau': '👒', 'casquette': '🧢', 'bonnet': '❄️', 'gant': '🧤', 'écharpe': '🧣',
    'lunettes': '👓', 'montre': '⌚', 'sac': '👜', 'valise': '🧳', 'parapluie': '☔',
    'bague': '💍', 'collier': '📿', 'argent': '💶', 'monnaie': '🪙', 'portefeuille': '👛',

    # ==========================================
    # 🛋️ MAISON & OBJETS
    # ==========================================
    'cuisine': '🍳', 'salon': '🛋️', 'toilettes': '🚽', 'bain': '🛁', 'douche': '🚿',
    'jardin': '🏡', 'mur': '🧱', 'toit': '🏠', 'fenêtre': '🪟', 'escalier': '🪜',
    'meuble': '🪑', 'canapé': '🛋️', 'armoire': '🚪', 'miroir': '🪞', 'tapis': '🧶',
    'lampe': '💡', 'bougie': '🕯️', 'boîte': '📦', 'clé': '🔑', 'cadenas': '🔒',
    'couteau': '🔪', 'fourchette': '🍴', 'cuillère': '🥄', 'assiette': '🍽️', 'verre': '🥃',
    'bouteille': '🍾', 'tasse': '☕', 'bol': '🥣', 'serviette': '🧻', 'savon': '🧼',
    'brosse': '🪥', 'dentifrice': '🦷', 'balai': '🧹', 'poubelle': '🗑️', 'feu': '🔥',

    # ==========================================
    # 🦁 ANIMAUX
    # ==========================================
    'animal': '🐾', 'lion': '🦁', 'tigre': '🐅', 'ours': '🐻', 'loup': '🐺', 'renard': '🦊',
    'éléphant': '🐘', 'girafe': '🦒', 'singe': '🐒', 'souris': '🐁', 'rat': '🐀',
    'vache': '🐄', 'cochon': '🐖', 'mouton': '🐑', 'chèvre': '🐐', 'poule': '🐔',
    'canard': '🦆', 'oie': '🦢', 'lapin': '🐇', 'grenouille': '🐸', 'tortue': '🐢',
    'serpent': '🐍', 'crocodile': '🐊', 'baleine': '🐋', 'dauphin': '🐬', 'requin': '🦈',
    'abeille': '🐝', 'fourmi': '🐜', 'papillon': '🦋', 'mouche': '🪰', 'araignée': '🕷️',

    # ==========================================
    # 🚑 CORPS, SANTÉ & SENSATIONS
    # ==========================================
    'santé': '⚕️', 'malade': '🤒', 'douleur': '🤕', 'sang': '🩸', 'médicament': '💊',
    'hôpital': '🏥', 'pharmacie': '⚕️', 'dent': '🦷', 'langue': '👅', 'nez': '👃',
    'oreille': '👂', 'cheveu': '💇', 'dos': '🔙', 'ventre': '🤰', 'jambe': '🦵',
    'genou': '🦵', 'doigt': '☝️', 'ongle': '💅', 'peau': '✋', 'os': '🦴',
    'faim': '🤤', 'soif': '🥤', 'sommeil': '😴', 'rêve': '💭', 'force': '💪',

    # ==========================================
    # 💻 TECHNOLOGIE & COMMUNICATION
    # ==========================================
    'ordinateur': '💻', 'écran': '🖥️', 'clavier': '⌨️', 'internet': '🌐', 'wifi': '📶',
    'mail': '📧', 'message': '💬', 'lettre': '✉️', 'photo': '📷', 'vidéo': '📹',
    'musique': '🎵', 'chanson': '🎤', 'film': '🎬', 'radio': '📻', 'jeu': '🎮',
    'robot': '🤖', 'batterie': '🔋', 'carte': '🗺️', 'papier': '📄', 'stylo': '🖊️',

    # ==========================================
    # 🌳 NATURE & ÉLÉMENTS
    # ==========================================
    'ciel': '🌌', 'nuage': '☁️', 'vent': '💨', 'orage': '⛈️', 'éclair': '⚡',
    'montagne': '⛰️', 'mer': '🌊', 'océan': '🌊', 'plage': '🏖️', 'rivière': '🏞️',
    'lac': '💧', 'forêt': '🌲', 'bois': '🪵', 'pierre': '🪨', 'sable': '🏖️',
    'herbe': '🌿', 'feuille': '🍃', 'étoile': '⭐', 'planète': '🪐', 'univers': '🌌',

    # ==========================================
    # 🚉 TRANSPORTS & LIEUX
    # ==========================================
    'voyage': '🧳', 'avion': '✈️', 'train': '🚆', 'métro': '🚇', 'bateau': '⛵',
    'camion': '🚛', 'moto': '🏍️', 'taxi': '🚕', 'route': '🛣️', 'pont': '🌉',
    'aéroport': '🛫', 'gare': '🚉', 'magasin': '🏪', 'marché': '🥬', 'parc': '🏞️',
    'église': '⛪', 'cinéma': '🍿', 'restaurant': '🍽️', 'hôtel': '🏨', 'bureau': '💼',
    'pays': '🇫🇷', 'france': '🇫🇷', 'village': '🏘️', 'île': '🏝️',

    # ==========================================
    # 🧠 ABSTRAIT, TEMPS & CHIFFRES
    # ==========================================
    'idée': '💡', 'problème': '🧩', 'solution': '🔑', 'secret': '🤫', 'mensonge': '🤥',
    'vérité': '✅', 'chance': '🍀', 'danger': '⚠️', 'aide': '🆘', 'paix': '☮️',
    'guerre': '⚔️', 'liberté': '🕊️', 'loi': '⚖️', 'prix': '🏷️', 'nombre': '🔢',
    'zéro': '0️⃣', 'dix': '🔟', 'cent': '💯',
    'semaine': '📅', 'mois': '📆', 'hier': '⏮️', 'demain': '⏭️', 'midi': '🕛',
    'minuit': '🌑', 'été': '☀️', 'hiver': '❄️', 'printemps': '🌱', 'automne': '🍂',
    'début': '▶️', 'fin': '🏁', 'milieu': '🎯',

    # ==========================================
    # 👤 ÊTRES & PERSONNES
    # ==========================================
    'chat': '🐱', 'chien': '🐶', 'oiseau': '🐦', 'poisson': '🐟', 'cheval': '🐴',
    'homme': '👨', 'femme': '👩', 'garçon': '👦', 'fille': '👧', 'bébé': '👶',
    'maman': '🤱', 'papa': '👨‍🍼', 'docteur': '👨‍⚕️', 'police': '👮', 'maître': '👨‍🏫',
    'mère': '👩', 'père': '👨', 'enfant': '👶', 'ami': '👋',

    # ==========================================
    # 🏠 OBJETS & LIEUX COURANTS
    # ==========================================
    'maison': '🏠', 'école': '🏫', 'voiture': '🚗', 'vélo': '🚲', 'bus': '🚌',
    'livre': '📖', 'crayon': '✏️', 'table': '🪑', 'lit': '🛏️', 'téléphone': '📱',
    'soleil': '☀️', 'lune': '🌙', 'pluie': '🌧️', 'neige': '❄️', 'fleur': '🌸',
    'arbre': '🌳', 'pomme': '🍎', 'banane': '🍌', 'pain': '🥖', 'eau': '💧',
    'porte': '🚪', 'rue': '🛣️', 'chambre': '🛏️', 'ville': '🏙️', 'place': '📍',
    'terre': '🌍', 'corps': '👤', 'bras': '💪', 'pied': '🦶', 'tête': '🧠',
    'oeil': '👁️', 'main': '✋', 'voix': '🔊', 'regard': '👀', 'visage': '😊',

    # ==========================================
    # ⏰ TEMPS & CONCEPTS
    # ==========================================
    'jour': '📅', 'temps': '⏰', 'heure': '🕐', 'moment': '⏱️', 'soir': '🌆',
    'nuit': '🌙', 'matin': '🌅', 'an': '📆', 'année': '📅', 'fois': '🔢',
    'vie': '❤️', 'mort': '💀', 'monde': '🌍', 'histoire': '📚', 'nom': '🏷️',
    'mot': '💬', 'côté': '↔️', 'fond': '⬇️', 'bout': '🔚', 'coup': '👊',
    'chose': '📦', 'peine': '😢', 'amour': '❤️', 'coeur': '❤️', 'doute': '🤔',

    # ==========================================
    # 🎬 VERBES (Actions)
    # ==========================================
    'être': '🟰', 'avoir': '🤲', 'aller': '➡️', 'faire': '🔨',
    'manger': '🍽️', 'boire': '🥤', 'dormir': '💤', 'courir': '🏃', 'marcher': '🚶',
    'voir': '👀', 'regarder': '📺', 'entendre': '👂', 'parler': '🗣️', 'crier': '📢',
    'aimer': '❤️', 'jouer': '🎮', 'travailler': '💼', 'lire': '📖', 'écrire': '✍️',
    'ouvrir': '🔓', 'fermer': '🔒', 'entrer': '🚪', 'sortir': '👋', 'tomber': '📉',
    'dire': '💬', 'pouvoir': '💪', 'savoir': '🧠', 'vouloir': '🙏', 'venir': '➡️',
    'prendre': '✋', 'mettre': '📍', 'donner': '🎁', 'recevoir': '📦', 'trouver': '🔍',
    'demander': '❓', 'répondre': '💬', 'comprendre': '🧠', 'penser': '💭', 'croire': '🙏',
    'suivre': '👣', 'connaître': '🧠', 'sembler': '👀', 'devenir': '🔄', 'revenir': '🔙',
    'partir': '👋', 'arriver': '🏁', 'rester': '📍', 'tenir': '✋', 'laisser': '👋',
    'passer': '⏩', 'sentir': '👃', 'attendre': '⏳', 'porter': '🎒', 'rendre': '↩️',
    'appeler': '📞', 'arrêter': '🛑', 'vivre': '💚', 'chercher': '🔍', 'paraître': '👁️',
    'lever': '⬆️', 'commencer': '🚀', 'finir': '✅', 'retrouver': '🔍', 'poser': '📍',
    'monter': '⬆️', 'asseoir': '🪑', 'mourir': '💀', 'tirer': '➡️', 'perdre': '❌',
    'tourner': '🔄', 'reprendre': '↩️', 'jeter': '🗑️', 'rire': '😂',

    # ==========================================
    # 🎨 ADJECTIFS & SENTIMENTS
    # ==========================================
    'grand': '🐘', 'petit': '🐜', 'rapide': '🚀', 'lent': '🐌',
    'heureux': '😄', 'triste': '😢', 'fâché': '😠', 'peur': '😱', 'fatigué': '🥱',
    'chaud': '🔥', 'froid': '❄️', 'beau': '✨', 'nouveau': '🆕', 'vieux': '👴',
    'rouge': '🔴', 'bleu': '🔵', 'vert': '🟢', 'jaune': '🟡', 'noir': '⚫', 'blanc': '⚪',
    'tout': '🔄', 'seul': '1️⃣', 'autre': '➡️', 'même': '🔄', 'bon': '👍',
    'premier': '1️⃣', 'jeune': '👶', 'long': '📏', 'vrai': '✅', 'sûr': '🔒',
    'dernier': '🔚', 'plein': '🈵', 'gros': '🐘', 'possible': '❓', 'propre': '✨',
    'mauvais': '👎', 'haut': '⬆️', 'pauvre': '😢', 'bas': '⬇️', 'certain': '✅',

    # ==========================================
    # 🔗 MOTS GRAMMATICAUX
    # ==========================================
    'et': '➕', 'ne': '❌', 'pas': '🚫', 'plus': '➕', 'mais': '⚠️',
    'comme': '🔄', 'ou': '🤷', 'bien': '👍', 'encore': '🔁',
    'très': '⭐', 'toujours': '♾️', 'aussi': '➕', 'alors': '👉', 'puis': '➡️',
    'si': '❓', 'quand': '🕐', 'non': '❌', 'jamais': '🚫', 'peu': '📉',
    'trop': '📈', 'moins': '📉', 'déjà': '✅', 'presque': '≈',
    'maintenant': '⏰', 'ici': '📍', 'là': '👉', 'oui': '✅', 'ni': '🚫',
    'ainsi': '➡️', 'car': '💡', 'gens': '👥'
}

def appliquer_emojis_manuels():
    print(f"📂 Lecture de {FICHIER_ENTREE}...")
    
    with open(FICHIER_ENTREE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    compteur_avant = sum(1 for item in data if item.get('emoji'))
    compteur_ajoutes = 0

    print("🔄 Application des emojis manuels...")

    for item in data:
        lemme = item['lemme'].lower()
        
        # Si pas encore d'emoji et dans notre dictionnaire manuel
        if not item.get('emoji') and lemme in EMOJIS_MANUELS:
            item['emoji'] = EMOJIS_MANUELS[lemme]
            compteur_ajoutes += 1

    compteur_apres = sum(1 for item in data if item.get('emoji'))

    # Sauvegarde
    with open(FICHIER_SORTIE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("-" * 30)
    print(f"✅ Terminé !")
    print(f"Emojis avant : {compteur_avant}")
    print(f"Emojis ajoutés : {compteur_ajoutes}")
    print(f"Emojis total : {compteur_apres} / {len(data)} ({round(compteur_apres/len(data)*100)}%)")
    print(f"📁 Résultat : {FICHIER_SORTIE}")

if __name__ == "__main__":
    appliquer_emojis_manuels()


