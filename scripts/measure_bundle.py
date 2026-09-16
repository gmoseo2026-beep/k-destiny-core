import os

def dir_size_and_count(path):
    total = 0
    count = 0
    for root, dirs, files in os.walk(path):
        for f in files:
            count += 1
            total += os.path.getsize(os.path.join(root, f))
    return total, count

static_size, static_count = dir_size_and_count(".next/static")
mascot_size, mascot_count = dir_size_and_count("public/mascot/transparent")

print(f".next/static: {static_count} files, {static_size / (1024*1024):.2f} MB")
print(f"public/mascot/transparent: {mascot_count} files, {mascot_size / 1024:.2f} KB")

# List chunks sizes
chunks_dir = os.path.join(".next", "static", "chunks")
if os.path.exists(chunks_dir):
    chunks_size, chunks_count = dir_size_and_count(chunks_dir)
    print(f"chunks directory: {chunks_count} files, {chunks_size / (1024*1024):.2f} MB")

# Check mascot webp vs png sizes
for f in sorted(os.listdir("public/mascot/transparent")):
    p = os.path.join("public/mascot/transparent", f)
    if os.path.isfile(p):
        print(f"  - {f}: {os.path.getsize(p) / 1024:.1f} KB")
