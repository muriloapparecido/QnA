import chromadb
import os


# Create client
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Create repo collection
collection = chroma_client.get_or_create_collection(name="repo")


SUPPORTED_EXTENSIONS = {".ts", ".tsx", ".java", ".py", ".js", ".md"}
SKIP_DIRS = {"node_modules", ".git", "build", "dist", "frontend_license", "venv", "target", "docker-compose", "docs", ".vscode", ".venv"}

# Chunking function
def chunk_file(source: str, chunk_size: int = 40, overlap: int = 20) -> list[dict]:
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
def walk_repo(repo_path: str, supported_extensions: list[str] = [], skip_dirs: list[str] = []) -> list[dict]:
    # Walk through directory
    repo_path = os.path.abspath(repo_path)
    data = []
    for root, dirs, files in os.walk(repo_path):
        # root = current folder path (string)
        # dirs = list of subfolder names in root
        # files = list of file names in root
        dirs[:] = [d for d in dirs if d not in set(skip_dirs)]

        for file in files:
            

            # skip if file extension is not supported
            if not file.endswith(tuple(supported_extensions)):
                continue
            
            # read file
            full_path = os.path.join(root, file)
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    source = f.read()

            except (UnicodeDecodeError, PermissionError) as e:
                continue
            
            # chunk file
            chunks = chunk_file(source)


            for chunk in chunks:
                chunk["file"] = full_path  # add file path to each chunk
                chunk["repo"] = repo_path  # add repository path to each chunk
                data.append(chunk)
    return data 

def ingest_repo_stream(repo_path: str, supported_extensions: list[str] = [], skip_dirs: list[str] = []):
    repo_path = os.path.abspath(repo_path)  
    all_chunks = walk_repo(repo_path, supported_extensions, skip_dirs)
    total = len(all_chunks)
    
    if total == 0:
        return {"chunks_ingested": 0}

    collection.delete(where={"repo": {"$eq": repo_path}})

    docs = [chunk["text"] for chunk in all_chunks]
    ids = [f"{chunk['file']}:{chunk['start_line']}-{chunk['end_line']}" for chunk in all_chunks]
    metadata = [{"file": chunk["file"], "repo": chunk["repo"], "start_line": chunk["start_line"], "end_line": chunk["end_line"]} for chunk in all_chunks]

    BATCH_SIZE = 500
    for i in range(0, total, BATCH_SIZE):
        collection.upsert(
            ids=ids[i:i+BATCH_SIZE],
            metadatas=metadata[i:i+BATCH_SIZE],
            documents=docs[i:i+BATCH_SIZE]
        )
        ingested = min(i + BATCH_SIZE, total)
        yield {"status": "progress", "ingested": ingested, "total": total, "percent": round((ingested / total) * 100)}

    yield {"status": "done", "total": total}
