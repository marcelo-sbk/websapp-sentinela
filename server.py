#!/usr/bin/env python3
# -*- coding: utf-8 -*-

'''
Servidor local para WebAppSentinela
Execute: python server.py
Depois abra: http://localhost:8000
'''

import http.server
import socketserver
import os
from pathlib import Path

PORT = 8000
FRONTEND_DIR = 'frontend'


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Adiciona headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Se é requisição raiz, serve index.html
        if self.path == '/':
            self.path = '/index.html'

        return super().do_GET()


if __name__ == '__main__':
    # Muda para diretório frontend
    if os.path.exists(FRONTEND_DIR):
        os.chdir(FRONTEND_DIR)
        print(f'📁 Diretório: {os.getcwd()}')

    with socketserver.TCPServer(('', PORT), MyHTTPRequestHandler) as httpd:
        print(f'''
╔════════════════════════════════════════════════════╗
║     🚀 WebAppSentinela - Servidor Local            ║
╠════════════════════════════════════════════════════╣
║  Porta: {PORT}                                          ║
║  URL:   http://localhost:{PORT}                   ║
║  Ctrl+C para parar                                 ║
╚════════════════════════════════════════════════════╝

Abrindo http://localhost:{PORT} ...
''')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\n✅ Servidor parado')
