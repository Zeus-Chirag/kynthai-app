#!/bin/bash
set -e
cd "$(dirname "$0")"
echo 'Starting kyntha-restored-7000 on http://localhost:8000'
npm run dev
