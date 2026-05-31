#!/usr/bin/env python3
"""devctl plugin for chat-overlay: manages Go backend + Vite frontend."""

import json
import os
import shlex
import shutil
import socket
import subprocess
import sys


def emit(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def log(msg):
    sys.stderr.write(msg + "\n")
    sys.stderr.flush()


def env_bool(name, default=False):
    raw = os.environ.get(name, "").strip()
    if raw == "":
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def env_int(name, default):
    raw = os.environ.get(name, "").strip()
    if raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def env_str(name, default=""):
    return os.environ.get(name, default).strip()


def is_port_free(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.2)
    try:
        sock.bind(("127.0.0.1", int(port)))
        return True
    except OSError:
        return False
    finally:
        sock.close()


def pick_free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def find_free_port(preferred):
    if is_port_free(preferred):
        return preferred
    return pick_free_port()


def relpath(path, root):
    return os.path.relpath(path, root)


def shell_join(parts):
    return " ".join(shlex.quote(str(p)) for p in parts if str(p) != "")


def run_step(rid, name, argv, cwd, timeout=120):
    log(f"running {name}: {' '.join(argv)}")
    result = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        emit(
            {
                "type": "response",
                "request_id": rid,
                "ok": False,
                "error": {
                    "code": "E_STEP_FAILED",
                    "message": f"{name} failed with exit code {result.returncode}: {(result.stderr or result.stdout)[:1000]}",
                },
            }
        )
        return False
    return True


emit(
    {
        "type": "handshake",
        "protocol_version": "v2",
        "plugin_name": "chat-overlay",
        "capabilities": {
            "ops": ["config.mutate", "validate.run", "prepare.run", "build.run", "launch.plan", "command.run"],
            "commands": [
                {"name": "widget-smoke", "help": "Run the Playwright widget browser smoke against the configured frontend", "args_spec": []},
            ],
        },
    }
)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = json.loads(line)
    rid = req.get("request_id", "")
    op = req.get("op", "")
    ctx = req.get("ctx", {}) or {}
    inp = req.get("input", {}) or {}
    repo_root = os.path.abspath(ctx.get("repo_root") or os.getcwd())

    try:
        if op == "config.mutate":
            if env_bool("CHAT_OVERLAY_DYNAMIC_PORTS", False):
                backend_port = find_free_port(env_int("CHAT_OVERLAY_BACKEND_PORT", 18080))
                vite_port = find_free_port(env_int("CHAT_OVERLAY_VITE_PORT", 15173))
            else:
                backend_port = env_int("CHAT_OVERLAY_BACKEND_PORT", 18080)
                vite_port = env_int("CHAT_OVERLAY_VITE_PORT", 15173)
            backend_origin = f"http://127.0.0.1:{backend_port}"
            vite_origin = f"http://127.0.0.1:{vite_port}"
            real_runtime = env_bool("CHAT_OVERLAY_REAL_RUNTIME", False)
            profile = env_str("CHAT_OVERLAY_PROFILE", "gpt-5-mini-low" if real_runtime else "")
            profile_registries = env_str("CHAT_OVERLAY_PROFILE_REGISTRIES")
            chunk_delay = env_str("CHAT_OVERLAY_CHUNK_DELAY", "20ms")

            log(
                "config: "
                + f"backend_port={backend_port} vite_port={vite_port} "
                + f"real_runtime={real_runtime} profile={profile or '(mock)'}"
            )

            emit(
                {
                    "type": "response",
                    "request_id": rid,
                    "ok": True,
                    "output": {
                        "config_patch": {
                            "set": {
                                "services.backend.port": backend_port,
                                "services.backend.url": backend_origin,
                                "services.vite.port": vite_port,
                                "services.vite.url": vite_origin,
                                "chat_overlay.real_runtime": real_runtime,
                                "chat_overlay.profile": profile,
                                "chat_overlay.profile_registries": profile_registries,
                                "chat_overlay.chunk_delay": chunk_delay,
                                "env.VITE_BACKEND_ORIGIN": backend_origin,
                                "env.CHAT_OVERLAY_URL": vite_origin,
                            },
                            "unset": [],
                        }
                    },
                }
            )

        elif op == "validate.run":
            errors = []
            warnings = []
            web_dir = os.path.join(repo_root, "web")
            node_modules = os.path.join(web_dir, "node_modules")

            for tool in ["go", "node", "npx"]:
                if shutil.which(tool) is None:
                    errors.append({"key": f"tool.{tool}", "message": f"required tool not found on PATH: {tool}"})
            if not os.path.isfile(os.path.join(repo_root, "go.mod")):
                errors.append({"key": "go.mod", "message": "go.mod not found at repo root"})
            if not os.path.isdir(web_dir):
                errors.append({"key": "web.dir", "message": "web directory not found"})
            if not os.path.isdir(node_modules):
                warnings.append({"key": "frontend.node_modules", "message": "web/node_modules missing; devctl prepare will run npm install"})
            if not os.path.isfile(os.path.join(repo_root, "ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/01-widget-browser-smoke.js")):
                warnings.append({"key": "smoke.widget", "message": "widget browser smoke script not found"})

            emit(
                {
                    "type": "response",
                    "request_id": rid,
                    "ok": True,
                    "output": {"valid": len(errors) == 0, "errors": errors, "warnings": warnings},
                }
            )

        elif op == "prepare.run":
            dry_run = bool(ctx.get("dry_run", False))
            web_dir = os.path.join(repo_root, "web")
            node_modules = os.path.join(web_dir, "node_modules")
            steps = []
            if os.path.isdir(node_modules):
                steps.append({"name": "npm-install", "ok": True, "output": {"reason": "node_modules exists"}})
            elif dry_run:
                steps.append({"name": "npm-install", "ok": True, "output": {"reason": "dry-run; npm install would run"}})
            else:
                if not run_step(rid, "npm install", ["npm", "install"], web_dir, timeout=180):
                    continue
                steps.append({"name": "npm-install", "ok": True})
            emit({"type": "response", "request_id": rid, "ok": True, "output": {"steps": steps}})

        elif op == "build.run":
            dry_run = bool(ctx.get("dry_run", False))
            steps = []
            if not dry_run:
                if not run_step(rid, "go test", ["go", "test", "./..."], repo_root, timeout=180):
                    continue
                if not run_step(rid, "frontend build", ["npm", "run", "build"], os.path.join(repo_root, "web"), timeout=180):
                    continue
            steps.append({"name": "go-test", "ok": True, "output": {"dry_run": dry_run}})
            steps.append({"name": "frontend-build", "ok": True, "output": {"dry_run": dry_run}})
            emit({"type": "response", "request_id": rid, "ok": True, "output": {"steps": steps}})

        elif op == "launch.plan":
            config = inp.get("config", {}) or {}
            services = config.get("services", {}) or {}
            backend_port = ((services.get("backend") or {}).get("port")) or 18080
            vite_port = ((services.get("vite") or {}).get("port")) or 15173
            env_config = config.get("env", {}) or {}
            chat_cfg = config.get("chat_overlay", {}) or {}
            backend_origin = env_config.get("VITE_BACKEND_ORIGIN", f"http://127.0.0.1:{backend_port}")

            data_dir = os.path.join(repo_root, "var", "devctl")
            os.makedirs(data_dir, exist_ok=True)
            backend_args = [
                "go",
                "run",
                "./cmd/chat-overlay",
                "serve",
                "--serve-port",
                str(backend_port),
                "--timeline-db",
                os.path.join(data_dir, "timeline.sqlite"),
                "--turns-db",
                os.path.join(data_dir, "turns.sqlite"),
                "--chunk-delay",
                str(chat_cfg.get("chunk_delay") or "20ms"),
            ]
            if bool(chat_cfg.get("real_runtime", False)):
                backend_args.append("--real-runtime")
                profile = str(chat_cfg.get("profile") or "").strip()
                if profile:
                    backend_args.extend(["--profile", profile])
                profile_registries = str(chat_cfg.get("profile_registries") or "").strip()
                if profile_registries:
                    backend_args.extend(["--profile-registries", profile_registries])

            backend_cmd = f"mkdir -p {shlex.quote(data_dir)} && exec {shell_join(backend_args)}"
            vite_cmd = f"exec npx vite --host 127.0.0.1 --port {int(vite_port)} --clearScreen false"

            emit(
                {
                    "type": "response",
                    "request_id": rid,
                    "ok": True,
                    "output": {
                        "services": [
                            {
                                "name": "backend",
                                "cwd": ".",
                                "command": ["bash", "--noprofile", "--norc", "-lc", backend_cmd],
                                "health": {"type": "http", "url": f"http://127.0.0.1:{backend_port}/api/chat/health", "timeout_ms": 30000},
                            },
                            {
                                "name": "vite",
                                "cwd": "web",
                                "command": ["bash", "--noprofile", "--norc", "-lc", vite_cmd],
                                "env": {"VITE_BACKEND_ORIGIN": backend_origin},
                                "health": {"type": "http", "url": f"http://127.0.0.1:{vite_port}/", "timeout_ms": 30000},
                            },
                        ]
                    },
                }
            )

        elif op == "command.run":
            cmd_name = inp.get("name") or inp.get("command") or ""
            if cmd_name != "widget-smoke":
                emit({"type": "response", "request_id": rid, "ok": False, "error": {"code": "E_UNSUPPORTED", "message": f"unknown command: {cmd_name}"}})
                continue
            config = inp.get("config", {}) or {}
            url = ((config.get("env") or {}).get("CHAT_OVERLAY_URL")) or env_str("CHAT_OVERLAY_URL", "http://127.0.0.1:15173")
            script = os.path.join(repo_root, "ttmp/2026/05/30/CHATOVERLAY-005--move-typed-widget-plugin-support-into-pinocchio-chatapp/scripts/01-widget-browser-smoke.js")
            env = os.environ.copy()
            env["CHAT_OVERLAY_URL"] = url
            result = subprocess.run(["node", script], cwd=repo_root, env=env, capture_output=True, text=True, timeout=60)
            if result.stdout.strip():
                log(result.stdout.strip())
            if result.stderr.strip():
                log(result.stderr.strip())
            emit({"type": "response", "request_id": rid, "ok": True, "output": {"exit_code": result.returncode}})

        else:
            emit({"type": "response", "request_id": rid, "ok": False, "error": {"code": "E_UNSUPPORTED", "message": f"unsupported op: {op}"}})

    except Exception as e:
        log(f"error handling {op}: {e}")
        emit({"type": "response", "request_id": rid, "ok": False, "error": {"code": "E_PLUGIN", "message": str(e)}})
