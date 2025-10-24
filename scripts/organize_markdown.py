#!/usr/bin/env python3
import os
import re
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEST_DIR = REPO_ROOT / "markdown"

IGNORE_DIRS = {
    "node_modules",
    "__pycache__",
    ".git",
    ".cursor",
    ".venv",
    "venv",
    "dist",
    "build",
}

MD_LINK_PATTERN = re.compile(r"(\!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def find_markdown_files(root: Path) -> list[Path]:
    md_files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # prune ignored directories in-place to avoid walking them
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for f in filenames:
            if f.lower().endswith(".md"):
                md_files.append(Path(dirpath) / f)
    return md_files


def compute_destination_names(files: list[Path]) -> dict[Path, str]:
    # Map original file -> dest filename (no path)
    basename_to_sources: dict[str, list[Path]] = {}
    for p in files:
        basename_to_sources.setdefault(p.name, []).append(p)

    mapping: dict[Path, str] = {}
    for p in files:
        candidates = basename_to_sources[p.name]
        if len(candidates) == 1:
            mapping[p] = p.name
            continue
        # Disambiguate by prefixing parent directory name
        parent = p.parent.name
        prefixed = f"{parent}_{p.name}"
        # Ensure uniqueness if even parent prefixes collide
        idx = 2
        unique_name = prefixed
        while any(v == unique_name for v in mapping.values()):
            unique_name = f"{parent}{idx}_{p.name}"
            idx += 1
        mapping[p] = unique_name
    return mapping


def rewrite_links(content: str, file_dir: Path, mapping: dict[Path, str]) -> str:
    def replace(match: re.Match) -> str:
        bang, text, target = match.groups()
        # Skip absolute URLs or anchors
        if re.match(r"^[a-zA-Z]+://", target) or target.startswith("#"):
            return match.group(0)
        # Resolve relative path from original file directory
        target_path = (file_dir / target).resolve()
        # Normalize if it points to a directory index like README.md within that dir
        # Try to map only if endswith .md
        if not target_path.name.lower().endswith(".md"):
            return match.group(0)
        # If the target exists in mapping keys (by real path), rewrite to new filename only
        for src in mapping.keys():
            try:
                if src.resolve() == target_path:
                    new_target = mapping[src]
                    return f"{bang}[{text}]({new_target})"
            except FileNotFoundError:
                continue
        return match.group(0)

    return MD_LINK_PATTERN.sub(replace, content)


def main() -> None:
    md_files = find_markdown_files(REPO_ROOT)
    # Ensure destination
    DEST_DIR.mkdir(parents=True, exist_ok=True)

    mapping = compute_destination_names(md_files)

    # Move files and rewrite links
    for src in md_files:
        rel_dir = src.parent
        dest_name = mapping[src]
        dest_path = DEST_DIR / dest_name

        # Read content before moving for link rewrite
        with open(src, "r", encoding="utf-8") as f:
            content = f.read()
        # Rewrite links to point to filenames in /markdown
        rewritten = rewrite_links(content, rel_dir, mapping)

        # Write to destination
        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(rewritten)

    # After writing all, remove original files
    for src in md_files:
        try:
            os.remove(src)
        except Exception:
            # If cannot remove, skip to avoid data loss
            pass

    print(f"Moved {len(md_files)} markdown files to {DEST_DIR}")


if __name__ == "__main__":
    main()


