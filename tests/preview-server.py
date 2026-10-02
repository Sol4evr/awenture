"""Serve the tested artifact plus exact SHA-verified CDN rewrite fixtures outside dist.
No network requests or wildcard upstream mapping occur in the test server.
"""
import http.server,json,pathlib,hashlib,urllib.parse,sys
root=pathlib.Path(__file__).resolve().parents[1];manifest=json.loads((root/'baseline/year2-question-delivery-v1.json').read_text());assets={('/'+a['path']):a for a in manifest['assets']};cache=root/'node_modules/.cache/awenture-year2-question-delivery'/manifest['commit']
for a in assets.values():
 p=cache/a['path'];b=p.read_bytes()
 if len(b)!=a['size'] or hashlib.sha256(b).hexdigest()!=a['sha256']:raise RuntimeError('Unverified CDN fixture')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root/'dist'),**kwargs)
 def translate_path(self,path):
  name=urllib.parse.urlsplit(path).path
  if name in assets:return str(cache/assets[name]['path'])
  return super().translate_path(path)
 def log_message(self,*args):pass
http.server.ThreadingHTTPServer(('127.0.0.1',4173),Handler).serve_forever()
