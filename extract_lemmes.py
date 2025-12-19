import json

# --- CONFIGURATION ---
FICHIER_ENTREE = 'data/lexique_filtre.json'
FICHIER_SORTIE = 'data/lemmes.json'

# Seuil de fréquence : 
# Plus le chiffre est haut, plus on filtre sévèrement.
# 0.1 est prudent, 1.0 garde les mots courants.
SEUIL_FREQUENCE = 1

def extraire_lemmes_utiles():
    print("⏳ Chargement du fichier...")
    try:
        with open(FICHIER_ENTREE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Erreur : Impossible de trouver {FICHIER_ENTREE}")
        return

    # Dictionnaire pour dédoublonner : on utilise une clé (lemme + cgram)
    # Ex: on ne veut traiter "chapitre" (NOM) qu'une seule fois, même s'il est là au pluriel
    lemmes_uniques = {}
    
    compteur_total = 0
    compteur_rare = 0

    print("⚙️ Traitement en cours...")

    for entree in data:
        compteur_total += 1
        
        # 1. Vérification de la fréquence (Filtre anti-mots rares)
        # On utilise .get() pour éviter les erreurs si la clé manque
        frequence = entree.get('freq', {}).get('cp_cm2', 0)
        
        if frequence < SEUIL_FREQUENCE:
            compteur_rare += 1
            continue # On passe au mot suivant, celui-ci est trop rare
            
        # 2. Récupération des données
        lemme = entree.get('lemme')
        cgram = entree.get('cgram')
        
        # Sécurité si des données manquent
        if not lemme or not cgram:
            continue

        # 3. Création de la clé unique
        cle_unique = (lemme, cgram)

        # 4. Stockage (si pas déjà présent)
        if cle_unique not in lemmes_uniques:
            lemmes_uniques[cle_unique] = {
                "lemme": lemme,
                "cgram": cgram,
                # On garde la freq pour info, ça peut servir pour trier par importance plus tard
                "score_freq": frequence 
            }

    # Conversion en liste pour l'export JSON
    liste_finale = list(lemmes_uniques.values())
    
    # Tri optionnel : mettre les mots les plus fréquents en premier
    liste_finale.sort(key=lambda x: x['score_freq'], reverse=True)

    # Sauvegarde
    with open(FICHIER_SORTIE, 'w', encoding='utf-8') as f:
        json.dump(liste_finale, f, ensure_ascii=False, indent=2)

    print("-" * 30)
    print(f"✅ Terminé !")
    print(f"Total entrées lues : {compteur_total}")
    print(f"Mots rares supprimés : {compteur_rare}")
    print(f"Lemmes uniques conservés : {len(liste_finale)}")
    print(f"Fichier généré : {FICHIER_SORTIE}")

if __name__ == "__main__":
    extraire_lemmes_utiles()

