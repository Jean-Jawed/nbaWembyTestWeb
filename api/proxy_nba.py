# api/proxy_nba.py
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import gzip

class handler(BaseHTTPRequestHandler):

    def _send_response(self, status, content_bytes, content_type="application/json"):
        self.send_response(status)
        # CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', content_type)
        self.end_headers()
        if content_bytes:
            self.wfile.write(content_bytes)

    def do_OPTIONS(self):
        self._send_response(204, b"")

    def do_GET(self):
        # Vérifier que c'est une requête vers /api/nba/
        if not self.path.startswith("/api/nba/"):
            self._send_response(404, b"Not found")
            return

        try:
            path = self.path.replace("/api/nba/", "")
            nba_url = f"https://stats.nba.com/stats/{path}"

            print(f"Proxying request to: {nba_url}")

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

            req = Request(nba_url, headers=headers)
            with urlopen(req, timeout=5) as response:
                data = response.read()

                if response.headers.get('Content-Encoding') == 'gzip':
                    print("🗜️  Décompression gzip...")
                    data = gzip.decompress(data)

                self._send_response(200, data)

                print(f"✓ Success: {len(data)} bytes")

        except HTTPError as e:
            print(f"✗ HTTP Error {e.code}: {e.reason}")
            self._send_response(e.code, f"NBA API Error: {e.reason}".encode(), content_type="text/plain")

        except URLError as e:
            print(f"✗ URL Error: {e.reason}")
            self._send_response(502, f"Connection Error: {e.reason}".encode(), content_type="text/plain")

        except Exception as e:
            print(f"✗ Error: {str(e)}")
            self._send_response(500, f"Server Error: {str(e)}".encode(), content_type="text/plain")
