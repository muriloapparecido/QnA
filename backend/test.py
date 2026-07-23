import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection(name="repo")
print(collection.count())

# peek at files containing node_modules
results = collection.get(limit=100)
node_mod_files = [m['file'] for m in results['metadatas'] if 'node_modules' in m['file']]
print(f"node_modules chunks in first 100: {len(node_mod_files)}")
if node_mod_files:
    print(node_mod_files[0])