#!/usr/bin/env python3
"""Compile lab instruction pages into a single Markdown file ready to paste into Skillable.

Reads every *.md file in the source folder (sorted by name, one file per page),
applies the Skillable syntax conversions and writes the result to the output file.

Conversions (fenced code blocks are never modified):
  - Pages are joined with === page breaks.
  - Local images ![alt](../../img/x.png "title") become
    !IMAGE[alt](<image-folder>/x.png "title"). Remote image URLs are left as-is.
  - Inline code containing a @lab. token, e.g. `@lab.LabInstance.Id`,
    becomes Skillable type-text: +++@lab.LabInstance.Id+++.

Diagnostics go to stderr as "path:line: warning: message".
A JSON summary goes to stdout.

Exit codes: 0 success, 1 warnings found with --strict, 2 input or usage error.
Requires Python 3.8+ and no third-party packages. Run from the repository root.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

DEFAULT_SRC = "docs/instructions"
DEFAULT_OUT = "docs/skillable.md"
DEFAULT_IMAGE_FOLDER = "instructions360463"
PAGE_BREAK = "\n\n===\n\n"

FENCE_RE = re.compile(r"^\s*(?P<fence>`{3,}|~{3,})")
CODE_SPAN_RE = re.compile(r"(?<!`)(?P<ticks>`+)(?!`)(?P<code>.+?)(?<!`)(?P=ticks)(?!`)")
IMAGE_RE = re.compile(
    r"!\[(?P<alt>[^\]]*)\]\(\s*<?(?P<url>[^)\s>]+)>?(?P<title>\s+\"[^\"]*\")?\s*\)"
)
LINK_RE = re.compile(r"(?<![!\w])\[(?P<text>[^\]]*)\]\(\s*<?(?P<url>[^)\s>]+)>?[^)]*\)")
HTML_IMG_RE = re.compile(r"<img\s[^>]*src=", re.IGNORECASE)
ABSOLUTE_URL_RE = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//|#|@lab\.)", re.IGNORECASE)
TAB_INDENT_RE = re.compile(r"^ *\t")


class Compiler:
    def __init__(self, image_folder: str) -> None:
        self.image_folder = image_folder.strip().rstrip("/")
        self.warnings: list[str] = []
        self.images: dict[str, Path] = {}

    def warn(self, path: Path, line_no: int, message: str) -> None:
        entry = f"{display_path(path)}:{line_no}: warning: {message}"
        self.warnings.append(entry)
        print(entry, file=sys.stderr)

    def compile_page(self, path: Path) -> str:
        lines = path.read_text(encoding="utf-8").splitlines()
        out: list[str] = []
        fence: str | None = None

        for index, line in enumerate(lines, start=1):
            match = FENCE_RE.match(line)
            if fence is not None:
                closing = match.group("fence") if match else ""
                if closing and closing[0] == fence[0] and len(closing) >= len(fence):
                    fence = None
                out.append(line)
                continue
            if match:
                fence = match.group("fence")
                out.append(line)
                continue

            if TAB_INDENT_RE.match(line):
                self.warn(path, index, "indentation uses a tab; use 4 spaces so Skillable keeps the list structure")
            out.append(self.transform_line(line, path, index))

        if fence is not None:
            self.warn(path, len(lines), "unclosed fenced code block")
        return "\n".join(out).strip("\n").rstrip()

    def transform_line(self, line: str, path: Path, line_no: int) -> str:
        parts: list[str] = []
        pos = 0
        for span in CODE_SPAN_RE.finditer(line):
            parts.append(self.transform_text(line[pos : span.start()], path, line_no))
            parts.append(self.transform_code(line, span))
            pos = span.end()
        parts.append(self.transform_text(line[pos:], path, line_no))
        return "".join(parts)

    def transform_code(self, line: str, span: re.Match[str]) -> str:
        code = span.group("code")
        if "@lab." not in code or len(span.group("ticks")) != 1:
            return span.group(0)
        # Leave Skillable command links like @[Run](`command`) untouched.
        if line[: span.start()].endswith("](") and line[span.end() :].startswith(")"):
            return span.group(0)
        return f"+++{code.strip()}+++"

    def transform_text(self, text: str, path: Path, line_no: int) -> str:
        if not text:
            return text

        if HTML_IMG_RE.search(text):
            self.warn(path, line_no, "HTML <img> is not converted; use ![alt](../../img/name.png) instead")

        for link in LINK_RE.finditer(text):
            url = link.group("url")
            if not ABSOLUTE_URL_RE.match(url):
                self.warn(
                    path,
                    line_no,
                    f"relative link '{url}' will not resolve in Skillable; use an absolute URL or plain text",
                )

        def replace_image(match: re.Match[str]) -> str:
            url = match.group("url")
            if ABSOLUTE_URL_RE.match(url):
                return match.group(0)
            resolved = (path.parent / url).resolve()
            name = resolved.name
            if not resolved.is_file():
                self.warn(path, line_no, f"image not found: {url}")
            previous = self.images.get(name)
            if previous is not None and previous != resolved:
                self.warn(
                    path,
                    line_no,
                    f"image name '{name}' is also used by {display_path(previous)}; "
                    "Skillable image folders are flat, so rename one",
                )
            self.images.setdefault(name, resolved)
            alt = match.group("alt").strip()
            if not alt:
                self.warn(path, line_no, f"image '{name}' has no alt text")
            title = match.group("title") or ""
            return f"!IMAGE[{alt}]({self.image_folder}/{name}{title})"

        return IMAGE_RE.sub(replace_image, text)


def display_path(path: Path) -> str:
    try:
        return os.path.relpath(path, Path.cwd())
    except ValueError:
        return str(path)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compile lab instruction pages into a single Skillable-ready Markdown file.",
    )
    parser.add_argument("--src", default=DEFAULT_SRC, help=f"folder with the NN-slug.md pages (default: {DEFAULT_SRC})")
    parser.add_argument("--out", default=DEFAULT_OUT, help=f"output file (default: {DEFAULT_OUT})")
    parser.add_argument(
        "--image-folder",
        default=DEFAULT_IMAGE_FOLDER,
        help=f"Skillable folder where the lab images are uploaded (default: {DEFAULT_IMAGE_FOLDER})",
    )
    parser.add_argument("--strict", action="store_true", help="exit with code 1 when any warning is reported")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    src = Path(args.src)
    out = Path(args.out)

    if not src.is_dir():
        print(f"error: source folder not found: {src}", file=sys.stderr)
        return 2
    pages = sorted(p for p in src.glob("*.md") if p.is_file())
    if not pages:
        print(f"error: no .md files found in {src}", file=sys.stderr)
        return 2
    if not args.image_folder.strip().rstrip("/"):
        print("error: --image-folder must not be empty", file=sys.stderr)
        return 2

    compiler = Compiler(args.image_folder)
    compiled = [compiler.compile_page(page) for page in pages]

    if "@lab.Title" not in compiled[0]:
        compiler.warn(pages[0], 1, "first page should start with @lab.Title")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(PAGE_BREAK.join(compiled) + "\n", encoding="utf-8")

    summary = {
        "output": display_path(out.resolve()),
        "pages": len(pages),
        "files": [display_path(p.resolve()) for p in pages],
        "image_folder": compiler.image_folder,
        "images": [{"name": name, "source": display_path(path)} for name, path in sorted(compiler.images.items())],
        "warnings": len(compiler.warnings),
    }
    print(json.dumps(summary, indent=2))

    return 1 if args.strict and compiler.warnings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
