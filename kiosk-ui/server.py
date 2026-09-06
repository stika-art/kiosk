import http.server
import socketserver
import os

PORT = 3000
DIRECTORY = r"D:\Trendum2\kiosk-ui"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def translate_path(self, path):
        clean = path.split('?')[0]
        if clean in ('/admin', '/admin/'):
            path = '/admin.html'
        return super().translate_path(path)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

os.chdir(DIRECTORY)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"===================================================")
    print(f"  TRENDUM KIOSK SERVER IS RUNNING ON PORT {PORT}")
    print(f"  Access from Kiosk: http://192.168.0.100:{PORT}")
    print(f"===================================================")
    httpd.serve_forever()
