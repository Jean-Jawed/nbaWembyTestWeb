# 🏀 Documentation Technique - NBA Wembanyama Stats

## Vue d'ensemble du projet

Site web one-page interactif présentant les statistiques en temps réel de Victor Wembanyama, avec design aux couleurs des San Antonio Spurs (noir/argent) et intégration vidéo spectaculaire.

---

## 🏗️ Architecture & Choix techniques

### 1️⃣ Problématique initiale : API NBA Stats

**Challenge** : L'API officielle `stats.nba.com` présente deux obstacles majeurs :
- **CORS** : Bloque les requêtes directes depuis le navigateur
- **Compression Gzip** : Renvoie des données compressées non décompressables côté client

**On a tranché pour** : Une architecture proxy à double niveau (local + production)

---

### 2️⃣ Solution développement local : `proxy_server.py`

**On a conçu** un serveur proxy Python hybride qui :

#### Fonction 1 : Serveur HTTP statique
- Sert les fichiers HTML, CSS, JS, images, vidéos
- Supporte nativement les **Range requests HTTP** (crucial pour le streaming vidéo mobile)
- Port : `localhost:8000`

#### Fonction 2 : Proxy API NBA
- Intercepte les requêtes `/api/nba/*`
- Transfère vers `stats.nba.com` avec headers appropriés
- **Décompresse le gzip** automatiquement
- Renvoie du JSON propre au navigateur

```python
# Headers critiques pour contourner les restrictions NBA
headers = {
    'User-Agent': 'Mozilla/5.0...',
    'Origin': 'https://www.nba.com',
    'Referer': 'https://www.nba.com/',
    ...
}
```

**Avantage** : Un seul serveur, une seule commande (`python3 proxy_server.py`)

---

### 3️⃣ Solution production : Vercel Serverless Function

**On a fait le choix** de déployer sur Vercel avec une architecture serverless.

#### Structure
```
/api/proxy_nba.py  →  Serverless Function Python
/vercel.json       →  Configuration routing
```

#### Configuration Vercel (`vercel.json`)
```json
{
  "functions": {
    "api/*.py": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/nba/(.*)",
      "destination": "/api/proxy_nba"
    }
  ]
}
```

**On a conçu** le rewrite pour router `/api/nba/playergamelog?...` vers la fonction Python.


---

### 4️⃣ Stratégie de fallback : Mock Data

**On a fait le choix** d'un système de données de secours robuste.

#### Génération des mock data
Script Python dédié : `creation_mock.py`

**Process** :
1. Lance `proxy_server.py` en local
2. Exécute `creation_mock.py` qui appelle le proxy local
3. Génère `assets/mock_data.json` avec données réelles du moment

```python
data = {
    "game_log": fetch_json(game_log_url),      # Tous les matchs de la saison
    "shot_chart": fetch_json(shot_chart_url)   # Tous les tirs
}
```

#### Stratégie de fallback dans le code JS
```javascript
try {
    // Tentative d'appel API réelle
    const response = await fetch('/api/nba/playergamelog?...');
    cachedGameLog = transformGameLog(data);
} catch (err) {
    // Fallback automatique vers mock data
    const fallback = await fetch("/assets/mock_data.json");
    cachedGameLog = transformGameLog(fallback.game_log);
}
```

**Résultat** : 
- ✅ En local : API réelle via proxy
- ✅ En prod : Mock data (mise à jour tous les 2-3 jours)
- ✅ Résilience totale

---

### 5️⃣ Endpoints NBA Stats utilisés

**On a choisi** de n'utiliser que les endpoints stables, après recherche et tests approfondis.

#### Endpoint principal : `playergamelog`
```
/stats/playergamelog?PlayerID=1641705&Season=2025-26&SeasonType=Regular Season
```

**Pourquoi ce choix** :
- ✅ Seul endpoint **vraiment fiable** de l'API NBA
- ✅ Contient **toutes** les données nécessaires
- ❌ Les autres endpoints retournent des erreurs 500 fréquentes

**On a fait le choix** de tout calculer en local à partir du game log :
- Totaux saison (points, rebonds, passes, blocks)
- Moyennes par match (PPG, RPG, APG, BPG)
- Pourcentages de tir (FG%, 3P%, FT%)
- Statistiques défensives

#### Endpoint secondaire : `shotchartdetail`
```
/stats/shotchartdetail?PlayerID=1641705&Season=2025-26&...
```

**Particularité** : Nécessite **TOUS** les paramètres obligatoires (20+ params) pour ne pas retourner d'erreur 500.

---

### 6️⃣ Exploitation des données : Architecture de calcul

**On a conçu** une architecture de calcul côté client pour minimiser les appels API.

#### Principe : "1 requête, toutes les stats"
```javascript
// 1 seule requête API
await loadGameLog();

// ∞ calculs dérivés
displayHeroStats();      // PPG, BPG, RPG
displayLastGame();       // Dernier match détaillé
displayBlocksStats();    // Total, moyenne, record blocks
displayPointsEvolution(); // Graphique match par match
displayShootingStats();  // FG%, 3P%, FT%
displayDefenseStats();   // Interceptions, rebonds défensifs
displayImpactStats();    // Totaux saison
```

#### Cache intelligent
```javascript
let cachedGameLog = null;      // Une seule fois par session
let cachedShotChart = null;
```

**Avantage** : Performances optimales, pas de sur-sollicitation de l'API.

---

### 7️⃣ Visualisation : Shot Chart avec coordonnées NBA

**On a fait le choix** de créer une visualisation native en Canvas HTML5.

#### Défi technique : Système de coordonnées NBA
L'API renvoie des coordonnées en **dixièmes de pieds** :
- `LOC_X` : -250 à +250 (largeur terrain)
- `LOC_Y` : 0 à 940 (longueur demi-terrain)
- Origine : Centre du panier

**On a conçu** la conversion suivante :
```javascript
// Conversion coordonnées NBA → Canvas
const x = shot.LOC_X + canvas.width / 2;     // Centrer horizontalement
const y = canvas.height - shot.LOC_Y - 50;   // Inverser Y (panier en bas)

// Échelle 1:1 (1 unité NBA = 1 pixel canvas)
```

#### Rendu terrain de basket
- Périmètre, ligne des 3 points (arc de cercle)
- Zone restrictive, ligne de lancer franc
- Cercle du lancer franc, panier

#### Visualisation des tirs
- 🟢 Vert : Tir réussi (`SHOT_MADE_FLAG === 1`)
- 🔴 Rouge : Tir raté

**Résultat** : Carte interactive précise de tous les tirs de la saison.

---

## 📊 Stack technique

### Frontend
- **HTML5** : Structure sémantique
- **CSS3** : Design Spurs (gradients argent, effets 3D, animations)
- **Vanilla JavaScript** : Fetch API, Canvas API, calculs statistiques

### Backend Local
- **Python 3.12** : `http.server`, `urllib`, `gzip`
- Serveur HTTP hybride (statique + proxy)

### Backend Production
- **Vercel Serverless Functions** : Python runtime
- **Routing** : Rewrites configuration

### API
- **NBA Stats API** : `stats.nba.com`
- Format : JSON (gzip compressé)

---

## 🎯 Flux de données

### En développement local
```
Navigateur → localhost:8000/api/nba/... 
          → proxy_server.py 
          → stats.nba.com [décompression gzip]
          → JSON propre → Navigateur
```

### En production (Mock Only)
```
Navigateur → Vercel CDN 
          → assets/mock_data.json 
          → Calculs JS 
          → Affichage
```

### Mise à jour des mock data
```
Local: python3 proxy_server.py 
    → python creation_mock.py 
    → assets/mock_data.json
    → git push
    → Vercel auto-deploy
```

---

## 🎨 Fonctionnalités interactives

### CTA Scroll animé
**On a conçu** un bouton 3D argent avec effet de profondeur et animation.

```javascript
// Scroll automatique au clic
scrollBtn.addEventListener('click', () => {
    document.getElementById('last-game').scrollIntoView({
        behavior: 'smooth'
    });
});
```

### Contrôles vidéo
**On a fait le choix** d'ajouter des contrôles de volume sur toutes les vidéos (hero + 3 sections background).

- Icône adaptative : 🔇 (muted) ↔️ 🔊 (unmuted)
- Support des vidéos en autoplay
- Gestion des Range requests HTTP pour streaming mobile

### Logo cliquable
Lien externe vers `nba.com/spurs` avec effet hover scale.

---

## 📁 Structure du projet

```
/
├── index.html                 # Page principale
├── styles.css                 # Design Spurs
├── script.js                  # Logique + calculs stats
├── proxy_server.py            # Serveur local (dev)
├── creation_mock.py           # Générateur mock data
├── vercel.json                # Config Vercel
├── requirements.txt           # Dépendances Python (vide - stdlib)
├── /api/
│   └── proxy_nba.py          # Serverless function Vercel
├── /assets/
│   ├── /images/              # Logos, photos joueur, blocks, etc.
│   ├── /videos/              # Vidéos background (29-34 Mo)
│   └── mock_data.json        # Données fallback
└── /*.md                      # Documentation
```

---

## ⚙️ Configuration & Déploiement

### Vercel Settings
- **Framework Preset** : Other
- **Build Command** : *(vide)*
- **Output Directory** : `.`
- **Install Command** : *(vide)*

### Variables d'environnement
Aucune - tout est côté client ou mock data.

---

## 🔐 Sécurité & Performances

### CORS
- Headers CORS configurés sur le proxy
- `Access-Control-Allow-Origin: *`

### Range Requests
- Support natif via `SimpleHTTPRequestHandler`
- Crucial pour streaming vidéo mobile (évite erreur 416)

### Caching
- Cache des données API en mémoire (`cachedGameLog`, `cachedShotChart`)
- Une seule requête par session utilisateur

### Compression
- Décompression gzip automatique côté proxy
- Vidéos non compressées (MP4 natif)

---

## 📈 Évolutions possibles

### Court terme
- ✅ Automatisation mise à jour mock data (cron job)
- ✅ Progressive Web App (PWA)
- ✅ Partage social avec Open Graph

### Long terme
- 🔄 Proxy tiers payant pour API réelle en prod (ScraperAPI, Bright Data)
- 🔄 Comparaison multi-joueurs
- 🔄 Historique saisons passées

---

## 🎓 Enseignements techniques

### Ce qu'on a appris
1. **CORS n'est pas une sécurité** - c'est une protection navigateur contournable côté serveur
2. **Les APIs sportives sont instables** - toujours prévoir un fallback
3. **Vercel bloque certaines IPs** - les APIs publiques peuvent détecter les serverless
4. **Range requests sont critiques** - pour le streaming vidéo mobile
5. **Un seul endpoint stable vaut mieux que 10 instables** - calculs locaux > multiplication d'appels

### Ce qu'on recommande
- Toujours tester l'API en conditions réelles (local + prod)
- Prévoir un fallback dès le début
- Privilégier les calculs côté client quand possible
- Documenter les choix techniques au fur et à mesure

---

**Projet réalisé avec** : Détermination face aux APIs capricieuses 🏀

*Victor Wembanyama Stats - By Jawed 2025*
