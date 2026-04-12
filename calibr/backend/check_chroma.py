
import chromadb
from chromadb.config import Settings
import os

def check_chroma():
    path = "./chroma_db"
    if not os.path.exists(path):
        print(f"❌ Chroma path '{path}' does not exist.")
        return

    client = chromadb.PersistentClient(path=path)
    print("--- ChromaDB Diagnostic ---")
    
    collections = client.list_collections()
    print(f"Collections found: {[c.name for c in collections]}")
    
    for c_info in collections:
        c = client.get_collection(name=c_info.name)
        count = c.count()
        print(f"Collection '{c_info.name}': {count} documents")
        if count > 0:
            sample = c.get(limit=1, include=["metadatas"])
            print(f"  Sample metadata: {sample['metadatas'][0]}")

if __name__ == "__main__":
    check_chroma()
