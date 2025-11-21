#!/usr/bin/env python3
"""
Proxy server pour l'API NBA Stats
Contourne les restrictions CORS pour permettre les appels depuis le navigateur
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import gzip
from urllib.error import HTTPError, URLError
from io import BytesIO

class NBAProxyHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Ajouter les headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Si c'est une requête vers l'API NBA
        if self.path.startswith('/api/nba/'):
            self.proxy_nba_request()
        else:
            # Sinon, servir les fichiers statiques normalement
            SimpleHTTPRequestHandler.do_GET(self)

    def proxy_nba_request(self):
        try:
            # Extraire l'endpoint et les paramètres
            path = self.path.replace('/api/nba/', '')
            nba_url = f'https://stats.nba.com/stats/{path}'
            
            print(f"Proxying request to: {nba_url}")
            
            # Headers pour l'API NBA
            headers = {
                'Host': 'stats.nba.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Origin': 'https://www.nba.com',
                'Referer': 'https://www.nba.com/',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site'
            }
            
            # Faire la requête vers l'API NBA
            req = urllib.request.Request(nba_url, headers=headers)
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read()
                
                # Décompresser si gzip
                if response.headers.get('Content-Encoding') == 'gzip':
                    print(f"🗜️  Décompression gzip...")
                    data = gzip.decompress(data)
                
                # Envoyer la réponse au client
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(data)
                
                print(f"✓ Success: {len(data)} bytes")
                
        except HTTPError as e:
            print(f"✗ HTTP Error {e.code}: {e.reason}")
            self.send_error(e.code, f"NBA API Error: {e.reason}")
            
        except URLError as e:
            print(f"✗ URL Error: {e.reason}")
            self.send_error(502, f"Connection Error: {e.reason}")
            
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            self.send_error(500, f"Server Error: {str(e)}")

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, NBAProxyHandler)
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║  🏀 NBA Stats Proxy Server                               ║
╠══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:{port}               ║
║  API proxy endpoint: /api/nba/*                          ║
║                                                          ║
║  Example:                                                ║
║  /api/nba/playergamelog?PlayerID=1641705&Season=2024-25 ║
║                                                          ║
║  Press Ctrl+C to stop the server                         ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        httpd.shutdown()

if __name__ == '__main__':
    run_server(8000)