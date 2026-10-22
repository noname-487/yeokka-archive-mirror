#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
dist_root="$project_root/dist"

rm -rf "$dist_root"
mkdir -p "$dist_root/server" "$dist_root/.openai"
node --input-type=module - "$project_root" <<'JS'
import {readFile,writeFile} from 'node:fs/promises';
const root=process.argv[2];
const source=await readFile(root+'/worker/index.js','utf8');
const seed=await readFile(root+'/worker/cache-seed.js','utf8');
await writeFile(root+'/dist/server/index.js',source.replace("import seed from './cache-seed.js';",seed.replace('export default ','const seed=')));
JS
cp "$project_root/.openai/hosting.json" "$dist_root/.openai/hosting.json"

echo "Built $dist_root"
