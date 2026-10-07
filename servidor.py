#!/usr/bin/env python3
"""Servidor local do jogo.
Uso:  python3 servidor.py [porta]      (padrão 8080)
Ao iniciar, procura arquivos .glb em assets/models/ e atualiza assets/models/modelos.json,
assim o jogo sabe quais personagens têm modelo 3D da Tripo.
"""
import http.server, json, os, socketserver, sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
os.chdir(RAIZ)
pasta = os.path.join('assets', 'models')
os.makedirs(pasta, exist_ok=True)
ids = sorted(f[:-4] for f in os.listdir(pasta) if f.lower().endswith('.glb'))
with open(os.path.join(pasta, 'modelos.json'), 'w', encoding='utf-8') as f:
    json.dump(ids, f, ensure_ascii=False, indent=1)
pa = os.path.join(pasta, 'arena'); os.makedirs(pa, exist_ok=True)
with open(os.path.join(pa, 'arena.json'), 'w', encoding='utf-8') as f:
    json.dump(sorted(f2[:-4] for f2 in os.listdir(pa) if f2.lower().endswith('.glb')), f, ensure_ascii=False, indent=1)
print('Modelos 3D encontrados:', ', '.join(ids) if ids else 'nenhum (usando bonecos provisórios)')

porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('0.0.0.0', porta), Handler) as httpd:
    print(f'Abra no navegador: http://localhost:{porta}')
    httpd.serve_forever()
