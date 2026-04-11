import os
import sys
from dotenv import load_dotenv

# Ensure we read the .env from the backend root
load_dotenv()

def run_diagnostics():
    results = []
    
    # 1. Test Groq
    groq_status = "❌ FAILED"
    groq_detail = "Unknown error"
    try:
        from langchain_groq import ChatGroq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or "your_" in api_key:
            groq_detail = "API Key is missing or placeholder in .env"
        else:
            llm = ChatGroq(model="llama-3.1-8b-instant", api_key=api_key)
            response = llm.invoke("Hi")
            groq_status = "✅ WORKING"
            groq_detail = f"Responded: {response.content}"
    except Exception as e:
        if "401" in str(e):
            groq_detail = "Invalid API Key (Unauthorized)"
        elif "429" in str(e):
            groq_detail = "Rate Limit Reached"
        else:
            groq_detail = str(e)
    results.append(("Groq LLM", groq_status, groq_detail))

    # 2. Test Ollama
    ollama_status = "❌ FAILED"
    ollama_detail = "Unknown error"
    try:
        from langchain_ollama import OllamaEmbeddings
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        embed = OllamaEmbeddings(model="nomic-embed-text", base_url=base_url)
        vector = embed.embed_query("test")
        ollama_status = "✅ WORKING"
        ollama_detail = f"Embeddings size: {len(vector)}"
    except Exception as e:
        if "10061" in str(e) or "refused" in str(e).lower():
            ollama_detail = "Ollama server not running or unreachable"
        else:
            ollama_detail = str(e)
    results.append(("Ollama Embeddings", ollama_status, ollama_detail))

    # 3. Test MongoDB
    mongo_status = "❌ FAILED"
    mongo_detail = "Unknown error"
    try:
        from pymongo import MongoClient
        url = os.getenv("MONGODB_URL")
        if not url:
            mongo_detail = "MONGODB_URL missing in .env"
        else:
            client = MongoClient(url, serverSelectionTimeoutMS=2000)
            client.server_info()
            mongo_status = "✅ WORKING"
            mongo_detail = "Connected successfully"
    except Exception as e:
        mongo_detail = str(e)
    results.append(("MongoDB", mongo_status, mongo_detail))

    # Final Output
    print("\n" + "="*60)
    print("CALIBRAI PROJECT DIAGNOSTIC REPORT")
    print("="*60)
    for name, status, detail in results:
        print(f"{name:<20} | {status:<10} | {detail}")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_diagnostics()
