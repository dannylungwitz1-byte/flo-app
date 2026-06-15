#!/usr/bin/env python3
# Minimaler statischer Server fuer Flo. Servt direkt aus dem App-Ordner.
import functools
import http.server
import socketserver

DIR = "/Users/dannylungwitz/App Flo"
PORT = 4173

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIR)

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Flo laeuft auf http://127.0.0.1:{PORT}")
    httpd.serve_forever()
