#!/usr/bin/env python3
"""Generate a repeatable Pinocchio web-chat cleanup inventory.

The script is intentionally advisory. It writes a Markdown inventory plus raw
command outputs into this ticket's sources/ directory and returns success even
when knip reports unused files/exports.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


@dataclass
class CommandResult:
    command: list[str]
    cwd: Path
    returncode: int
    stdout: str
    stderr: str

    @property
    def combined(self) -> str:
        parts = []
        if self.stdout.strip():
            parts.append(self.stdout.rstrip())
        if self.stderr.strip():
            parts.append(self.stderr.rstrip())
        return "\n".join(parts)


def run(command: list[str], cwd: Path, timeout: int = 120) -> CommandResult:
    try:
        proc = subprocess.run(
            command,
            cwd=str(cwd),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
        )
        return CommandResult(command, cwd, proc.returncode, proc.stdout, proc.stderr)
    except subprocess.TimeoutExpired as exc:
        return CommandResult(command, cwd, 124, exc.stdout or "", exc.stderr or f"timed out after {timeout}s")


def find_overlay_root(start: Path) -> Path:
    for parent in [start, *start.parents]:
        if parent.name == "2026-05-29--chatbot-overlay-glm":
            return parent
    raise SystemExit("could not infer overlay root; pass --overlay-root")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(errors="replace")


def line_count(path: Path) -> int:
    try:
        with path.open("rb") as f:
            return sum(1 for _ in f)
    except OSError:
        return 0


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def iter_files(root: Path, suffixes: tuple[str, ...]) -> list[Path]:
    ignored_parts = {"node_modules", "dist", "storybook-static", ".git"}
    out: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if ignored_parts.intersection(path.parts):
            continue
        if path.suffix in suffixes:
            out.append(path)
    return sorted(out)


def top_dirs(paths: Iterable[Path], root: Path, depth: int = 2) -> Counter[str]:
    counts: Counter[str] = Counter()
    for path in paths:
        parent_parts = path.relative_to(root).parts[:-1]
        key = "/".join(parent_parts[:depth]) if parent_parts else "(root)"
        counts[key] += 1
    return counts


def largest(paths: Iterable[Path], root: Path, n: int = 20) -> list[tuple[str, int]]:
    rows = [(rel(path, root), line_count(path)) for path in paths]
    return sorted(rows, key=lambda item: item[1], reverse=True)[:n]


def grep_files(paths: Iterable[Path], root: Path, patterns: dict[str, str], limit: int = 30) -> dict[str, list[str]]:
    compiled = {name: re.compile(pattern) for name, pattern in patterns.items()}
    matches: dict[str, list[str]] = {name: [] for name in patterns}
    for path in paths:
        text = read_text(path)
        for lineno, line in enumerate(text.splitlines(), start=1):
            for name, pattern in compiled.items():
                if len(matches[name]) >= limit:
                    continue
                if pattern.search(line):
                    matches[name].append(f"{rel(path, root)}:{lineno}: {line.strip()[:180]}")
    return matches


def markdown_table(headers: list[str], rows: Iterable[Iterable[object]]) -> str:
    rows = list(rows)
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for row in rows:
        out.append("| " + " | ".join(str(cell).replace("\n", "<br>") for cell in row) + " |")
    return "\n".join(out)


def package_scripts(web_root: Path) -> dict[str, str]:
    package_json = web_root / "package.json"
    if not package_json.exists():
        return {}
    data = json.loads(package_json.read_text())
    return dict(data.get("scripts", {}))


def cli_flags(main_go: Path) -> list[str]:
    if not main_go.exists():
        return []
    text = read_text(main_go)
    return sorted(set(re.findall(r'fields\.New\("([^"]+)"', text)))


def handler_names(go_files: list[Path]) -> list[str]:
    names: list[str] = []
    pattern = re.compile(r"func \(s \*Server\) (Handle\w+)\(")
    for path in go_files:
        text = read_text(path)
        for match in pattern.finditer(text):
            names.append(match.group(1))
    return sorted(set(names))


def write_raw(path: Path, result: CommandResult) -> None:
    body = [
        f"$ {' '.join(result.command)}",
        f"cwd: {result.cwd}",
        f"exit: {result.returncode}",
        "",
        "## stdout",
        result.stdout.rstrip(),
        "",
        "## stderr",
        result.stderr.rstrip(),
        "",
    ]
    path.write_text("\n".join(body), encoding="utf-8")


def main() -> int:
    script_path = Path(__file__).resolve()
    default_ticket_root = script_path.parents[1]
    default_overlay_root = find_overlay_root(script_path)
    default_workspace_root = default_overlay_root.parent

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pinocchio-root", type=Path, default=default_workspace_root / "pinocchio")
    parser.add_argument("--ticket-root", type=Path, default=default_ticket_root)
    parser.add_argument("--output", type=Path, default=None, help="Markdown output path; defaults to ticket sources/01-web-chat-inventory.md")
    parser.add_argument("--skip-knip", action="store_true", help="Skip npm run audit:unused")
    args = parser.parse_args()

    pinocchio_root = args.pinocchio_root.resolve()
    ticket_root = args.ticket_root.resolve()
    web_root = pinocchio_root / "cmd" / "web-chat" / "web"
    go_root = pinocchio_root / "cmd" / "web-chat"
    sources_dir = ticket_root / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)
    output = args.output.resolve() if args.output else sources_dir / "01-web-chat-inventory.md"

    if not web_root.exists() or not go_root.exists():
        raise SystemExit(f"expected Pinocchio web-chat roots under {pinocchio_root}")

    ts_files = iter_files(web_root / "src", (".ts", ".tsx"))
    go_files = iter_files(go_root, (".go",))

    go_list = run(["go", "list", "./cmd/web-chat/..."], pinocchio_root, timeout=120)
    write_raw(sources_dir / "web-chat-go-list.txt", go_list)

    knip: CommandResult | None = None
    if not args.skip_knip:
        knip = run(["npm", "run", "audit:unused"], web_root, timeout=180)
        write_raw(sources_dir / "web-chat-knip.txt", knip)

    scripts = package_scripts(web_root)
    cleanup_patterns = {
        "debug app leftovers": r"debug-ui|DebugUi|debug=1|debug-api|/api/debug|DebugRecorder|StreamDebug|debugApiEnabled|debug-panel|stream-debug",
        "src/webchat namespace imports": r"from ['\"].*webchat|from ['\"]\.\./.*webchat|from ['\"]\.\./\.\./.*webchat|from ['\"]\.\./\.\./\.\./.*webchat",
        "explicit any casts": r"\bas any\b|:\s*any\b|<any>",
        "eslint/biome suppressions": r"biome-ignore|eslint-disable|ts-ignore|ts-expect-error",
    }
    ts_matches = grep_files(ts_files, web_root, cleanup_patterns)
    go_matches = grep_files(go_files, go_root, {"debug app leftovers": cleanup_patterns["debug app leftovers"]})

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    ts_by_ext = Counter(path.suffix for path in ts_files)
    ts_categories = Counter(
        "generated" if "/generated/" in f"/{rel(path, web_root)}/" else
        "stories" if path.name.endswith(".stories.tsx") else
        "tests" if ".test." in path.name else
        "source"
        for path in ts_files
    )
    go_by_pkg_dir = top_dirs(go_files, go_root, depth=1)

    sections: list[str] = []
    sections.extend([
        "---",
        'title: "Pinocchio web-chat inventory"',
        "ticket: CHATOVERLAY-011",
        "doc_type: reference",
        "status: active",
        "intent: short-term",
        "topics:",
        "  - pinocchio",
        "  - web-chat",
        "  - typescript",
        "  - go",
        "  - architecture",
        f"created: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        f"updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        "---",
        "",
    ])
    sections.append("# Pinocchio web-chat inventory")
    sections.append("")
    sections.append(f"Generated: {now}")
    sections.append("")
    sections.append("## Roots")
    sections.append(f"- Pinocchio: `{pinocchio_root}`")
    sections.append(f"- Frontend: `{web_root}`")
    sections.append(f"- Go command: `{go_root}`")
    sections.append(f"- Ticket sources: `{sources_dir}`")
    sections.append("")

    sections.append("## Summary")
    sections.append(markdown_table(["Area", "Count"], [
        ["TypeScript/TSX files under cmd/web-chat/web/src", len(ts_files)],
        ["Go files under cmd/web-chat", len(go_files)],
        ["Go packages from go list ./cmd/web-chat/...", len([line for line in go_list.stdout.splitlines() if line.strip()]) if go_list.returncode == 0 else f"go list failed ({go_list.returncode})"],
        ["npm audit:unused script present", "yes" if "audit:unused" in scripts else "no"],
        ["knip exit code", "skipped" if knip is None else knip.returncode],
    ]))
    sections.append("")

    sections.append("## Frontend file inventory")
    sections.append("### By extension")
    sections.append(markdown_table(["Extension", "Count"], sorted(ts_by_ext.items())))
    sections.append("")
    sections.append("### By category")
    sections.append(markdown_table(["Category", "Count"], sorted(ts_categories.items())))
    sections.append("")
    sections.append("### Top directories")
    sections.append(markdown_table(["Directory", "Files"], top_dirs(ts_files, web_root / "src", depth=2).most_common(30)))
    sections.append("")
    sections.append("### Largest TypeScript/TSX files")
    sections.append(markdown_table(["File", "Lines"], largest(ts_files, web_root, 25)))
    sections.append("")

    sections.append("## Frontend cleanup probes")
    for name, rows in ts_matches.items():
        sections.append(f"### {name}")
        if rows:
            sections.extend(f"- `{row}`" for row in rows)
        else:
            sections.append("- No matches.")
        sections.append("")

    sections.append("## Frontend npm scripts")
    sections.append(markdown_table(["Script", "Command"], sorted(scripts.items())))
    sections.append("")

    sections.append("## knip unused files/exports report")
    if knip is None:
        sections.append("Skipped with `--skip-knip`.")
    else:
        sections.append(f"Raw output: `{(sources_dir / 'web-chat-knip.txt').relative_to(ticket_root)}`")
        sections.append(f"Exit code: `{knip.returncode}`. Non-zero is expected while cleanup candidates remain.")
        preview = knip.combined.strip().splitlines()[:80]
        if preview:
            sections.append("")
            sections.append("```text")
            sections.extend(preview)
            sections.append("```")
    sections.append("")

    sections.append("## Go inventory")
    sections.append("### Packages")
    sections.append(f"Raw output: `{(sources_dir / 'web-chat-go-list.txt').relative_to(ticket_root)}`")
    if go_list.returncode == 0:
        sections.append(markdown_table(["Package"], [[line] for line in go_list.stdout.splitlines() if line.strip()]))
    else:
        sections.append(f"`go list` failed with exit code {go_list.returncode}.")
    sections.append("")
    sections.append("### Files by cmd/web-chat subdirectory")
    sections.append(markdown_table(["Directory", "Files"], go_by_pkg_dir.most_common()))
    sections.append("")
    sections.append("### Largest Go files")
    sections.append(markdown_table(["File", "Lines"], largest(go_files, go_root, 25)))
    sections.append("")
    sections.append("### CLI flags discovered in main.go")
    flags = cli_flags(go_root / "main.go")
    sections.append(", ".join(f"`--{flag}`" for flag in flags) if flags else "No Glazed `fields.New` flags found.")
    sections.append("")
    sections.append("### Server handler methods")
    handlers = handler_names(go_files)
    sections.append(", ".join(f"`{handler}`" for handler in handlers) if handlers else "No `func (s *Server) Handle...` methods found.")
    sections.append("")

    sections.append("## Go cleanup probes")
    for name, rows in go_matches.items():
        sections.append(f"### {name}")
        if rows:
            sections.extend(f"- `{row}`" for row in rows)
        else:
            sections.append("- No matches.")
        sections.append("")

    sections.append("## Suggested review loop")
    sections.append("1. Read this inventory and the raw `web-chat-knip.txt` output.")
    sections.append("2. Pick one deletion or move candidate.")
    sections.append("3. Validate with `npm run typecheck && npm test && npm run lint && npm run build && npm run check:storybook` from `cmd/web-chat/web`.")
    sections.append("4. Validate Go changes with `go test ./cmd/web-chat/... -count=1` from the Pinocchio root.")
    sections.append("5. Re-run this script and compare the counts/probes before committing.")
    sections.append("")

    output.write_text("\n".join(sections), encoding="utf-8")
    print(f"wrote {output}")
    print(f"wrote {sources_dir / 'web-chat-go-list.txt'}")
    if knip is not None:
        print(f"wrote {sources_dir / 'web-chat-knip.txt'} (exit {knip.returncode})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
