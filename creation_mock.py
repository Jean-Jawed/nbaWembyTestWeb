import json
import urllib.request

# URL du game log
PLAYER_ID = '1641705'
CURRENT_SEASON = '2025-26'

game_log_url = f"http://localhost:8000/api/nba/playergamelog?PlayerID={PLAYER_ID}&Season={CURRENT_SEASON}&SeasonType=Regular+Season"
shot_chart_url = f"http://localhost:8000/api/nba/shotchartdetail?PlayerID={PLAYER_ID}&Season={CURRENT_SEASON}&SeasonType=Regular+Season&TeamID=1610612759&GameID=&Outcome=&Location=&Month=0&SeasonSegment=&DateFrom=&DateTo=&OpponentTeamID=0&VsConference=&VsDivision=&Position=&RookieYear=&GameSegment=&Period=0&LastNGames=0&ContextMeasure=FGA"

def fetch_json(url):
    with urllib.request.urlopen(url) as resp:
        return json.load(resp)

data = {
    "game_log": fetch_json(game_log_url),
    "shot_chart": fetch_json(shot_chart_url)
}

# Sauvegarde dans le projet
with open("assets/mock_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ mock_data.json généré !")
