#!/usr/bin/env python3
import argparse
import json
import os
import select
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
try:
    from http.server import ThreadingHTTPServer
except ImportError:
    from socketserver import ThreadingMixIn

    class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
        daemon_threads = True


HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


class LokiProxyHandler(SimpleHTTPRequestHandler):
    loki_base = ""
    tenant_id = ""
    config_path = ""
    state_path = ""

    @classmethod
    def read_runtime_config(cls):
        config = {
            "lokiUrl": cls.loki_base,
            "tenantId": cls.tenant_id,
        }
        if cls.config_path and os.path.exists(cls.config_path):
            try:
                with open(cls.config_path, "r", encoding="utf-8") as file:
                    saved = json.load(file)
                config["lokiUrl"] = saved.get("lokiUrl") or config["lokiUrl"]
                config["tenantId"] = saved.get("tenantId") or ""
            except Exception:
                pass
        config["lokiUrl"] = config["lokiUrl"].rstrip("/")
        return config

    @classmethod
    def write_runtime_config(cls, config):
        if not cls.config_path:
            raise RuntimeError("config path is not set")

        loki_url = str(config.get("lokiUrl", "")).strip().rstrip("/")
        tenant_id = str(config.get("tenantId", "")).strip()
        parsed = urllib.parse.urlsplit(loki_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("lokiUrl must be an http(s) URL")

        payload = {
            "lokiUrl": loki_url,
            "tenantId": tenant_id,
        }
        tmp_path = f"{cls.config_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(tmp_path, cls.config_path)
        return payload

    @classmethod
    def read_app_state(cls):
        if not cls.state_path or not os.path.exists(cls.state_path):
            return {}
        with open(cls.state_path, "r", encoding="utf-8") as file:
            payload = json.load(file)
        return payload if isinstance(payload, dict) else {}

    @classmethod
    def write_app_state(cls, payload):
        if not cls.state_path:
            raise RuntimeError("state path is not set")
        if not isinstance(payload, dict):
            raise ValueError("state must be a JSON object")

        state_dir = os.path.dirname(cls.state_path)
        if state_dir:
            os.makedirs(state_dir, exist_ok=True)
        tmp_path = f"{cls.state_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(tmp_path, cls.state_path)
        return payload

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Scope-OrgID")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/config":
            self.handle_config_get()
            return
        if self.path == "/api/state":
            self.handle_state_get()
            return
        if self.path.startswith("/api/loki"):
            if self.headers.get("Upgrade", "").lower() == "websocket":
                self.proxy_websocket()
            else:
                self.proxy_http()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/config":
            self.handle_config_post()
            return
        if self.path == "/api/state":
            self.handle_state_post()
            return
        if self.path.startswith("/api/loki"):
            self.proxy_http()
            return
        self.send_error(404)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_config_get(self):
        self.send_json(200, self.read_runtime_config())

    def handle_config_post(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else b"{}"
            payload = json.loads(body.decode("utf-8"))
            saved = self.write_runtime_config(payload)
            self.send_json(200, saved)
        except Exception as error:
            self.send_json(400, {"error": str(error)})

    def handle_state_get(self):
        try:
            self.send_json(200, self.read_app_state())
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def handle_state_post(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 2 * 1024 * 1024:
                raise ValueError("state payload is too large")
            body = self.rfile.read(length) if length else b"{}"
            payload = json.loads(body.decode("utf-8"))
            saved = self.write_app_state(payload)
            self.send_json(200, saved)
        except Exception as error:
            self.send_json(400, {"error": str(error)})

    def translate_path(self, path):
        root = os.path.dirname(os.path.abspath(__file__))
        parsed = urllib.parse.urlparse(path)
        rel = parsed.path.lstrip("/") or "index.html"
        return os.path.join(root, rel)

    def upstream_path(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path
        if path.startswith("/api/loki"):
            path = path[len("/api/loki"):]
        path = path or "/"
        if not path.startswith("/"):
            path = f"/{path}"
        return urllib.parse.urlunsplit(("", "", path, parsed.query, ""))

    def upstream_url(self):
        base = self.read_runtime_config()["lokiUrl"].rstrip("/")
        return f"{base}{self.upstream_path()}"

    def proxy_http(self):
        config = self.read_runtime_config()
        body = None
        if self.command in {"POST", "PUT", "PATCH"}:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else None

        headers = {}
        for key, value in self.headers.items():
            if key.lower() not in HOP_HEADERS and key.lower() != "host":
                headers[key] = value
        if config["tenantId"]:
            headers["X-Scope-OrgID"] = config["tenantId"]

        request = urllib.request.Request(
            self.upstream_url(),
            data=body,
            headers=headers,
            method=self.command,
        )

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = response.read()
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() not in HOP_HEADERS:
                        self.send_header(key, value)
                self.end_headers()
                self.wfile.write(payload)
        except urllib.error.HTTPError as error:
            payload = error.read()
            self.send_response(error.code)
            for key, value in error.headers.items():
                if key.lower() not in HOP_HEADERS:
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(payload)
        except Exception as error:
            message = f"Loki proxy error: {error}".encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(message)))
            self.end_headers()
            self.wfile.write(message)

    def proxy_websocket(self):
        config = self.read_runtime_config()
        parsed = urllib.parse.urlsplit(config["lokiUrl"])
        host = parsed.hostname
        if not host:
            self.send_error(500, "Invalid Loki base URL")
            return

        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        target_host = f"{host}:{port}"

        try:
            upstream = socket.create_connection((host, port), timeout=15)
            if parsed.scheme == "https":
                upstream = ssl.create_default_context().wrap_socket(upstream, server_hostname=host)

            request_lines = [
                f"GET {self.upstream_path()} HTTP/1.1",
                f"Host: {target_host}",
                "Upgrade: websocket",
                "Connection: Upgrade",
                f"Sec-WebSocket-Key: {self.headers.get('Sec-WebSocket-Key', '')}",
                f"Sec-WebSocket-Version: {self.headers.get('Sec-WebSocket-Version', '13')}",
            ]

            protocol = self.headers.get("Sec-WebSocket-Protocol")
            if protocol:
                request_lines.append(f"Sec-WebSocket-Protocol: {protocol}")
            origin = self.headers.get("Origin")
            if origin:
                request_lines.append(f"Origin: {origin}")
            if config["tenantId"]:
                request_lines.append(f"X-Scope-OrgID: {config['tenantId']}")

            upstream.sendall(("\r\n".join(request_lines) + "\r\n\r\n").encode("utf-8"))

            response = b""
            while b"\r\n\r\n" not in response:
                chunk = upstream.recv(4096)
                if not chunk:
                    raise RuntimeError("upstream closed during websocket handshake")
                response += chunk

            status_line = response.split(b"\r\n", 1)[0].decode("utf-8", errors="replace")
            print(f"WebSocket upstream {self.upstream_path()} -> {status_line}", flush=True)
            self.connection.sendall(response)
            if " 101 " not in status_line:
                return
            self.relay(upstream)
        except Exception as error:
            try:
                message = f"Loki websocket proxy error: {error}".encode("utf-8")
                self.send_response(502)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(message)))
                self.end_headers()
                self.wfile.write(message)
            except Exception:
                pass

    def relay(self, upstream):
        sockets = [self.connection, upstream]
        for item in sockets:
            item.setblocking(False)

        while True:
            readable, _, exceptional = select.select(sockets, [], sockets, 60)
            if exceptional:
                break
            if not readable:
                continue
            for source in readable:
                target = upstream if source is self.connection else self.connection
                try:
                    data = source.recv(65536)
                    if not data:
                        return
                    target.sendall(data)
                except Exception:
                    return


def main():
    parser = argparse.ArgumentParser(description="Serve Loki log viewer and proxy Loki API.")
    parser.add_argument("--loki", default=os.environ.get("LOKI_URL", "http://127.0.0.1:3100"))
    parser.add_argument("--tenant", default=os.environ.get("LOKI_TENANT_ID", ""))
    parser.add_argument("--config", default=os.environ.get("LOKI_PROXY_CONFIG", "loki-proxy.config.json"))
    parser.add_argument("--state", default=os.environ.get("LOKI_VIEWER_STATE", ""))
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5177)
    args = parser.parse_args()

    LokiProxyHandler.loki_base = args.loki.rstrip("/")
    LokiProxyHandler.tenant_id = args.tenant
    LokiProxyHandler.config_path = os.path.abspath(args.config)
    LokiProxyHandler.state_path = os.path.abspath(args.state) if args.state else os.path.join(
        os.path.dirname(LokiProxyHandler.config_path),
        "loki-viewer.state.json",
    )

    server = ThreadingHTTPServer((args.host, args.port), LokiProxyHandler)
    print(f"Serving http://{args.host}:{args.port}")
    print(f"Proxy config: {LokiProxyHandler.config_path}")
    print(f"App state: {LokiProxyHandler.state_path}")
    print(f"Proxying /api/loki -> {LokiProxyHandler.read_runtime_config()['lokiUrl']}")
    if LokiProxyHandler.read_runtime_config()["tenantId"]:
        print(f"Using X-Scope-OrgID: {LokiProxyHandler.read_runtime_config()['tenantId']}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
