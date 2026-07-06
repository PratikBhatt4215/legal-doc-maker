#!/bin/bash
set -e

# 1. Flatten general folders
flatten_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    echo "Flattening $dir"
    # Move files up one level
    mv "$dir"/* "$dir/../" 2>/dev/null || true
    rmdir "$dir" || true
  fi
}

flatten_dir "src/app/templates/hi/District Court/General forms, computer patrak etc"
flatten_dir "src/app/templates/hi/District Court/formate"
flatten_dir "src/app/templates/hi/District Court/jamanat formates"
flatten_dir "src/app/templates/hi/District Court/GENERAL FORMATES"
flatten_dir "src/app/templates/en/District Court/GENERAL FORMATES"

# 2. Setup "File" court templates
mkdir -p "src/app/templates/en/File" "src/app/templates/hi/File"
for f in "src/app/templates/Court affidavit and single affidavit.docx" \
         "src/app/templates/Simple application.docx" \
         "src/app/templates/court application.docx"; do
  if [ -f "$f" ]; then
    cp "$f" "src/app/templates/en/File/"
    mv "$f" "src/app/templates/hi/File/"
  fi
done

echo "Done"
