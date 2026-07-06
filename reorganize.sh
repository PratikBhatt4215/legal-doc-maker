#!/bin/bash
set -e

cd src/app

# Create base language directories
mkdir -p templates/en templates/hi

# 1. Existing templates mapping (from templates/District Court to hi/)
if [ -d "templates/District Court/FAMILY COURT" ]; then
  mv "templates/District Court/FAMILY COURT" "templates/hi/Family Court"
fi

if [ -d "templates/District Court/REVENUE, MPLRC" ]; then
  mv "templates/District Court/REVENUE, MPLRC" "templates/hi/Revenue Court"
fi

if [ -d "templates/District Court/Upbhokta Forum" ]; then
  mv "templates/District Court/Upbhokta Forum" "templates/hi/Forum Court"
fi

# The rest of District Court goes to templates/hi/District Court
if [ -d "templates/District Court" ]; then
  mkdir -p "templates/hi/District Court"
  for item in templates/District\ Court/*; do
    if [ -e "$item" ]; then
      mv "$item" "templates/hi/District Court/"
    fi
  done
  # Also handle hidden files like .DS_Store if any
  for item in templates/District\ Court/.*; do
    if [ -f "$item" ]; then
      mv "$item" "templates/hi/District Court/"
    fi
  done
  rmdir "templates/District Court" || true
fi

# 2. Moving ENGLiSH to templates/en/
if [ -d "ENGLiSH/DISTRICT COURT" ]; then mv "ENGLiSH/DISTRICT COURT" "templates/en/District Court"; fi
if [ -d "ENGLiSH/FAMILY COURT" ]; then mv "ENGLiSH/FAMILY COURT" "templates/en/Family Court"; fi
if [ -d "ENGLiSH/FORUM" ]; then mv "ENGLiSH/FORUM" "templates/en/Forum Court"; fi
if [ -d "ENGLiSH/HIGH COURT" ]; then mv "ENGLiSH/HIGH COURT" "templates/en/High Court"; fi
if [ -d "ENGLiSH/JUVENILE COURT" ]; then mv "ENGLiSH/JUVENILE COURT" "templates/en/Juvenile Court"; fi
if [ -d "ENGLiSH/REGISTRAR" ]; then mv "ENGLiSH/REGISTRAR" "templates/en/Registrar"; fi
if [ -d "ENGLiSH/REVENUE" ]; then mv "ENGLiSH/REVENUE" "templates/en/Revenue Court"; fi
if [ -d "ENGLiSH/we have to work on files" ]; then mv "ENGLiSH/we have to work on files" "templates/en/"; fi

# 3. Moving HINDI to templates/hi/
copy_merge_dir() {
  local src=$1
  local dest=$2
  if [ -d "$src" ]; then
    mkdir -p "$dest"
    # Copy all files and folders
    cp -R "$src/"* "$dest/" 2>/dev/null || true
    rm -rf "$src"
  fi
}

copy_merge_dir "HINDI/DISTRICT COURT" "templates/hi/District Court"
copy_merge_dir "HINDI/FAMILY COURT" "templates/hi/Family Court"
copy_merge_dir "HINDI/FORUM" "templates/hi/Forum Court"
copy_merge_dir "HINDI/HIGH COURT" "templates/hi/High Court"
copy_merge_dir "HINDI/JUVENILE COURT" "templates/hi/Juvenile Court"
copy_merge_dir "HINDI/REGISTRAR" "templates/hi/Registrar"
copy_merge_dir "HINDI/REVENUE" "templates/hi/Revenue Court"
if [ -d "HINDI/we have to work on files" ]; then mv "HINDI/we have to work on files" "templates/hi/"; fi

rm -rf ENGLiSH HINDI

echo "Directory reorganization complete."
