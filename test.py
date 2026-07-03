import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection(name="repo")

results = collection.get(
    where={"file": {"$eq": "../MAPS/frontend/src/sections/file/view/file-view.tsx"}},
    limit=100
)

print(f"Total chunks: {len(results['documents'])}")
for meta in results['metadatas']:
    print(meta['start_line'], '-', meta['end_line'])