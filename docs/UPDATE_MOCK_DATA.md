# 🔄 Mise à jour des données mock

## Quand mettre à jour ?
- Tous les jours / semaines pour avoir les dernières stats de Wemby
- Avant un déploiement important
- Quand la saison avance

## 📋 Étapes

### 1️⃣ Lancer le proxy
```bash
python3 proxy_server.py
```
✅ Serveur doit tourner sur `http://localhost:8000`

### 2️⃣ Générer les mock data (nouveau terminal)
```bash
python creation_mock.py
```
✅ Crée/met à jour `assets/mock_data.json`

### 3️⃣ Arrêter le proxy
```bash
Ctrl+C
```

### 4️⃣ Vérifier les données
Ouvrir `assets/mock_data.json` et vérifier :
- `game_log.resultSets[0].rowSet` → matchs présents
- `shot_chart.resultSets[0].rowSet` → tirs présents
- Date du dernier match

### 5️⃣ Git commit & push
```bash
git add assets/mock_data.json
git commit -m "Update mock data - [DATE]"
git push
```

### 6️⃣ Publier (si hébergé)
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# Ou autre plateforme selon config
```

## ⚠️ Important
- **Toujours lancer `proxy_server.py`** (pas `api/proxy_nba.py`)
- Le proxy doit être actif pendant la génération
- Les mock data servent de **fallback** si l'API est down

## 📁 Fichiers concernés
- `proxy_server.py` → Serveur proxy
- `creation_mock.py` → Script de génération
- `assets/mock_data.json` → Données générées (fallback)

---

**Fréquence recommandée** : Tous les 2-3 jours pendant la saison NBA
