import json
import emoji
from deep_translator import GoogleTranslator

# Fichiers
FICHIER_ENTREE = 'data/lemmes.json'
FICHIER_SORTIE = 'data/lemmes_noms_emojis.json'
FICHIER_CACHE = 'data/cache_traductions.json'

def charger_cache():
    """Charge le cache des traductions pour éviter de retraduire"""
    try:
        with open(FICHIER_CACHE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def sauvegarder_cache(cache):
    """Sauvegarde le cache des traductions"""
    with open(FICHIER_CACHE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def traduire_fr_en(mot, cache, traducteur):
    """Traduit un mot français en anglais avec cache"""
    if mot in cache:
        return cache[mot]
    try:
        traduction = traducteur.translate(mot)
        cache[mot] = traduction.lower() if traduction else None
        return cache[mot]
    except:
        cache[mot] = None
        return None

def construire_dictionnaire_anglais():
    """
    Parcourt TOUS les emojis et crée une carte avec les noms anglais
    """
    print("📚 Construction du dictionnaire anglais...")
    dico = {}
    
    for code_emoji in emoji.EMOJI_DATA.keys():
        try:
            nom_complet = emoji.demojize(code_emoji, language='en')
            phrase = nom_complet.replace(':', '').replace('_', ' ')
            mots = phrase.split(' ')
            
            for mot in mots:
                mot = mot.lower()
                if len(mot) > 2 and mot not in dico:
                    dico[mot] = code_emoji
        except:
            continue
    
    print(f"✅ Dictionnaire anglais : {len(dico)} mots-clés")
    return dico

def construire_dictionnaire_francais():
    """
    Parcourt TOUS les emojis et crée une carte avec les noms français
    """
    print("📚 Construction du dictionnaire français...")
    dico = {}
    
    for code_emoji in emoji.EMOJI_DATA.keys():
        try:
            nom_complet = emoji.demojize(code_emoji, language='fr')
            phrase = nom_complet.replace(':', '').replace('_', ' ')
            mots = phrase.split(' ')
            
            for mot in mots:
                mot = mot.lower()
                if len(mot) > 2 and mot not in dico:
                    dico[mot] = code_emoji
        except:
            continue
    
    print(f"✅ Dictionnaire français : {len(dico)} mots-clés")
    return dico

def mapping_avec_traduction():
    # 1. Charger les données
    with open(FICHIER_ENTREE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 2. Construire les dictionnaires
    dico_fr = construire_dictionnaire_francais()
    dico_en = construire_dictionnaire_anglais()
    
    # 3. Charger le cache et créer le traducteur
    cache = charger_cache()
    traducteur = GoogleTranslator(source='fr', target='en')
    
    # Stop words
    stop_words = [
        "un", "une", "le", "la", "les", "des", "du", "de", "au", "aux",
        "ce", "se", "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
        "me", "te", "lui", "leur", "en", "y", "qui", "que", "quoi", "dont", "où",
        "et", "ou", "mais", "donc", "car", "ni", "or",
        "avec", "pour", "sur", "sous", "dans", "par", "sans", "chez", "vers", "entre",
        "plus", "moins", "très", "trop", "peu", "bien", "mal", "tout", "rien",
        "être", "avoir", "faire", "aller", "voir", "dire", "pouvoir", "vouloir", "devoir",
        "son", "sa", "ses", "mon", "ma", "mes", "ton", "ta", "tes",
        "comme", "quand", "comment", "pourquoi", "combien"
    ]

    compteur = 0
    compteur_traduit = 0
    total = len(data)
    
    print("🚀 Mapping avec traduction anglaise...")
    print("⏳ Cela peut prendre quelques minutes...")

    for i, item in enumerate(data):
        # Afficher la progression tous les 500 mots
        if i % 500 == 0:
            print(f"   Progression : {i}/{total} ({round(i/total*100)}%)")
            sauvegarder_cache(cache)  # Sauvegarder régulièrement
        
        # Ne traiter que les NOM (noms communs) pour aller plus vite
        if item.get('cgram') != 'NOM':
            continue
        
        # Si on a déjà un emoji, on compte et on passe
        if item.get('emoji'):
            compteur += 1
            continue

        mot = item['lemme'].lower()
        
        # Skip stop words
        if mot in stop_words:
            item['emoji'] = None
            continue

        # 1. Chercher en français d'abord
        if mot in dico_fr:
            item['emoji'] = dico_fr[mot]
            compteur += 1
            continue

        # 2. Traduire et chercher en anglais
        mot_en = traduire_fr_en(mot, cache, traducteur)
        if mot_en and mot_en in dico_en:
            item['emoji'] = dico_en[mot_en]
            compteur += 1
            compteur_traduit += 1
        else:
            item['emoji'] = None

    # Sauvegarder le cache final
    sauvegarder_cache(cache)
    
    # Sauvegarder le résultat
    with open(FICHIER_SORTIE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("-" * 30)
    print(f"✅ Terminé !")
    print(f"Mots mappés : {compteur} / {total} ({round(compteur/total*100)}%)")
    print(f"Dont via traduction : {compteur_traduit}")
    print(f"📁 Résultat : {FICHIER_SORTIE}")

if __name__ == "__main__":
    mapping_avec_traduction()

