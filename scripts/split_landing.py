"""Extract landing-page components into section files. Run: python scripts/split_landing.py"""
import re, os

BASE = '/Users/c.k/Downloads/kynthai-restored-7000-us'
DIR = os.path.join(BASE, 'src/components/kynthaii')
SEC = os.path.join(DIR, 'sections')
os.makedirs(SEC, exist_ok=True)

lines = open(os.path.join(DIR, 'landing-page.tsx')).readlines()

# Find all top-level function/export function + their bodies
funcs = []
for i, line in enumerate(lines):
    m = re.match(r'^(export )?function (\w+)', line)
    if m:
        funcs.append((m.group(2), i))

# For each function, find its end (brace-depth = 0 after first {)
def find_end(start):
    depth = 0
    started = False
    for j in range(start, len(lines)):
        for ch in lines[j]:
            if ch == '{':
                depth += 1
                started = True
            elif ch == '}':
                depth -= 1
        if started and depth == 0:
            return j
    return start

ends = {name: find_end(s) for name, s in funcs}

# Print all with line ranges
for name, s in funcs:
    e = ends[name]
    print(f"{name:25s} L{s+1:4d}-L{e+1:4d}  ({e-s+1} lines)")

print(f"\nTop file: {len(lines)} lines total")

