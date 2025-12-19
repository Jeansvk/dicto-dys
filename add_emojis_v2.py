import json
import emoji

# Fichiers
FICHIER_ENTREE = 'data/lemmes_emojis.json'
FICHIER_SORTIE = 'data/lemmes_emojis_v2.json'

def construire_dictionnaire_inverse():
    """
    Parcourt TOUS les emojis connus et crée une carte : mot -> emoji
    Ex: transforme ":tête_de_chat:" en --> "chat": 🐱, "tête": 🐱
    """
    print("📚 Construction du dictionnaire inversé (ça prend 2 sec)...")
    dico_inverse = {}
    
    # On parcourt tous les emojis de la base de données
    for code_emoji in emoji.EMOJI_DATA.keys():
        try:
            # On récupère le nom français
            nom_complet = emoji.demojize(code_emoji, language='fr')
            
            # 1. On nettoie : on enlève les ':' et on remplace '_' par espace
            # ":tête_de_chat:" -> "tête de chat"
            phrase = nom_complet.replace(':', '').replace('_', ' ')
            
            # 2. On découpe en mots
            mots = phrase.split(' ')
            
            # 3. On associe chaque mot à l'emoji
            for mot in mots:
                mot = mot.lower()
                # On évite les mots de liaison trop courts (de, le, à...)
                if len(mot) > 2:
                    # Si le mot n'est pas encore dans le dico, on l'ajoute
                    if mot not in dico_inverse:
                        dico_inverse[mot] = code_emoji
        except:
            continue
    
    print(f"✅ Dictionnaire prêt : {len(dico_inverse)} mots-clés trouvés.")
    return dico_inverse

def mapping_avance():
    # 1. Charger ton JSON
    with open(FICHIER_ENTREE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 2. Construire le moteur de recherche
    dico_ref = construire_dictionnaire_inverse()
    
    # Ajout manuel de "Stop Words" (mots qu'on ne veut PAS mapper même si l'algo le veut)
    stop_words = [
        # Articles et déterminants
        "un", "une", "le", "la", "les", "des", "du", "de", "au", "aux",
        # Pronoms
        "ce", "se", "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
        "me", "te", "lui", "leur", "en", "y", "qui", "que", "quoi", "dont", "où",
        "celui", "celle", "ceux", "celles", "ceci", "cela", "ça",
        # Conjonctions et prépositions
        "et", "ou", "mais", "donc", "car", "ni", "or",
        "avec", "pour", "sur", "sous", "dans", "par", "sans", "chez", "vers", "entre",
        # Adverbes courants
        "plus", "moins", "très", "trop", "peu", "bien", "mal", "tout", "rien",
        "aussi", "encore", "déjà", "jamais", "toujours", "souvent", "parfois",
        # Verbes auxiliaires / courants
        "être", "avoir", "faire", "aller", "voir", "dire", "pouvoir", "vouloir", "devoir",
        # Autres mots grammaticaux
        "son", "sa", "ses", "mon", "ma", "mes", "ton", "ta", "tes", "notre", "votre",
        "même", "autre", "tel", "quel", "tout", "chaque", "quelque", "aucun",
        "comme", "quand", "comment", "pourquoi", "combien"
    ]

    compteur = 0
    total = len(data)
    
    print("🚀 Lancement du mapping intelligent...")

    for item in data:
        # Si on a déjà trouvé un emoji (via le patch manuel précédent), on ne touche pas
        if item.get('emoji'):
            compteur += 1
            continue

        mot = item['lemme'].lower()
        
        # Vérification Stop Words
        if mot in stop_words:
            item['emoji'] = None
            continue

        # Recherche dans le dictionnaire inversé
        if mot in dico_ref:
            item['emoji'] = dico_ref[mot]
            compteur += 1
        else:
            item['emoji'] = None

    # Sauvegarde
    with open(FICHIER_SORTIE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("-" * 30)
    print(f"✅ Terminé !")
    print(f"Mots mappés : {compteur} / {total} ({round(compteur/total*100)}%)")
    print(f"📁 Résultat : {FICHIER_SORTIE}")

if __name__ == "__main__":
    mapping_avance()

