import chromadb
import os
from itertools import islice


# Create client
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Create repo collection
collection = chroma_client.get_or_create_collection(name="repo")


SUPPORTED_EXTENSIONS = {".ts", ".java", ".py", ".js", ".md"}
SKIP_DIRS = {"node_modules", ".git", "build", "dist"}

# Chunking function
def chunk_file(source: str, chunk_size: int = 40, overlap: int = 10) -> list[dict]:
    # returns list of {"text": ..., "start_line": ..., "end_line": ...}
    lines = source.splitlines()
    result = []
    i = 0
    while i < len(lines):
        end_line = i + chunk_size
        chunk_lines = lines[i:end_line]
        chunk_text = "\n".join(chunk_lines)
        result.append({
            "text": chunk_text,
            "start_line": i + 1,
            "end_line": min(end_line, len(lines)),
        })
        i += chunk_size - overlap
    return result

# Walk through repo and chunk files
def walk_repo(repo_path: str) -> list[dict]:
    # returns list of {"text": ..., "start_line": ..., "end_line": ..., "file": ...}
    # calls chunk_file on each valid file
    # Walk through directory
    data = []
    for root, dirs, files in os.walk(repo_path):
        # root = current folder path (string)
        # dirs = list of subfolder names in root
        # files = list of file names in root
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "build", "dist"}]
        for file in files:
            # skip if file extension is not supported
            if not file.endswith(tuple(SUPPORTED_EXTENSIONS)):
                continue
            
            # read file
            full_path = os.path.join(root, file)
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    source = f.read()
            except (UnicodeDecodeError, PermissionError):
                continue
            
            # chunk file
            chunks = chunk_file(source)

            for chunk in chunks:
                chunk["file"] = full_path  # add file path to each chunk
                data.append(chunk)
    return data 

# Ingest data
all_chunks = walk_repo("../MAPS")
docs = [chunk["text"] for chunk in all_chunks]
ids = [f"{chunk['file']}:{chunk['start_line']}-{chunk['end_line']}" for chunk in all_chunks]
metadata = [{"file": chunk["file"], "start_line": chunk["start_line"], "end_line": chunk["end_line"]} for chunk in all_chunks]

# Upsert to ChromaDB
collection.upsert(
    ids=ids,
    metadatas=metadata,
    documents=docs
)
        
results = collection.query(
    query_texts=["How are columns created in the database?"],
    n_results=5
)

print(results)