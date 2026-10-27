#!/usr/bin/env python3
"""Export the UI with an explicit browser engine and a reproducible source snapshot."""
from pathlib import Path
import shutil
import zipfile
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
if dist.exists():
    shutil.rmtree(dist)
shutil.copytree(root / 'src/main/resources/static', dist)
shutil.copy2(root / 'src/main/resources/cocktails.json', dist / 'cocktails.json')
(dist / 'runtime-config.js').write_text("// Public static demo. The Spring Boot artifact uses the Java API.\nwindow.COCKTAIL_BFS_MODE = 'demo';\n")
# Exclude build output, Site internals, credentials, and Git state.
excluded = {'.git', '.openai', 'target', 'dist', 'node_modules', '.idea', '.vscode', '__pycache__'}
with zipfile.ZipFile(dist / 'source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(root.rglob('*')):
        relative = file.relative_to(root)
        if not file.is_file() or any(part in excluded for part in relative.parts):
            continue
        if file.name in {'.env', '.DS_Store'}:
            continue
        archive.write(file, Path('cocktail-bfs') / relative)
print(f'Exported browser demo and source snapshot to {dist}')
