import requests

def setup_admin():
    import os
    base = os.environ.get("PUBLIC_API_URL", "http://65.1.93.48").rstrip("/")
    url = f"{base}/api/auth/setup-admin"
    data = {
        "username": "admin",
        "full_name": "System Administrator",
        "password": "admin-password", # Please change this after first login
        "role": "ADMIN"
    }
    
    print(f"Attempting to create first admin user at {url}...")
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print("SUCCESS: Admin user 'admin' created with password 'admin-password'")
        else:
            print(f"FAILED: {response.json().get('detail', 'Unknown error')}")
    except Exception as e:
        print(f"ERROR: Could not connect to the server. Make sure IIS is running. {e}")

if __name__ == "__main__":
    setup_admin()
