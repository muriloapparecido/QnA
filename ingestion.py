import chromadb
import os
from itertools import islice


# Create client
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Create repo collection
collection = chroma_client.get_or_create_collection(name="repo")




collection.upsert(
    documents:[],
    ids:
)

results = collection.query(
    query_texts=[],
    num_results=5
)

print(results)