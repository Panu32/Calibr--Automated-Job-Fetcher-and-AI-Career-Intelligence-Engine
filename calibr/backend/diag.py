
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

def test_adzuna():
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    print(f"ADZUNA_APP_ID: {app_id}")
    if not app_id or app_id == "your_adzuna_app_id":
        print("❌ Adzuna ID is still placeholder")
        return

    url = "https://api.adzuna.com/v1/api/jobs/in/search/1"
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": "Software Engineer",
        # "where": "india",  <-- Try removing this to get all of India
        "results_per_page": 5,
        "content-type": "application/json",
    }
    
    try:
        r = httpx.get(url, params=params, timeout=10)
        print(f"Adzuna status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            results = data.get("results", [])
            print(f"Adzuna results found: {len(results)}")
        else:
            print(f"Adzuna Error: {r.text}")
    except Exception as e:
        print(f"Adzuna Exception: {e}")

def test_jsearch():
    api_key = os.getenv("JSEARCH_API_KEY")
    print(f"JSEARCH_API_KEY: {api_key}")
    if not api_key or api_key == "your_rapidapi_key_for_jsearch":
        print("❌ JSearch Key is still placeholder")
        return

    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {"query": "Software Engineer", "page": "1", "num_pages": "1"}
    
    try:
        r = httpx.get(url, headers=headers, params=params, timeout=10)
        print(f"JSearch status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            results = data.get("data", [])
            print(f"JSearch results found: {len(results)}")
        else:
            print(f"JSearch Error: {r.text}")
    except Exception as e:
        print(f"JSearch Exception: {e}")

if __name__ == "__main__":
    print("--- Calibr Job Diagnostic ---")
    test_adzuna()
    print("----------------------------")
    test_jsearch()
