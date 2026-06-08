import subprocess
import time
import urllib.request
import urllib.error
import json
import sys
import socket

def wait_for_port(port, timeout=10.0):
    start_time = time.time()
    while True:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1.0):
                return True
        except (socket.timeout, ConnectionRefusedError):
            if time.time() - start_time > timeout:
                return False
            time.sleep(0.5)

def make_request(url, method="GET", data=None):
    req = urllib.request.Request(url, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
        encoded_data = json.dumps(data).encode("utf-8")
    else:
        encoded_data = None
        
    try:
        with urllib.request.urlopen(req, data=encoded_data, timeout=5.0) as response:
            status = response.status
            body = json.loads(response.read().decode("utf-8"))
            return status, body
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = e.reason
        return e.code, err_body
    except Exception as e:
        return 500, str(e)

def run_tests():
    base_url = "http://127.0.0.1:8000"
    
    print("=" * 60)
    print("STARTING API TEST SUITE")
    print("=" * 60)
    
    # 1. Test GET /api/questions
    print("\n[Test 1] Fetching questions from GET /api/questions...")
    status, questions = make_request(f"{base_url}/api/questions")
    if status == 200 and isinstance(questions, list):
        print(f"  [OK] Success: Received {len(questions)} questions.")
        for idx, q in enumerate(questions[:2], 1):
            print(f"    - Question {idx}: ID={q.get('id')}, Text: '{q.get('text')}'")
        if len(questions) > 2:
            print(f"    - ... and {len(questions)-2} more.")
    else:
        print(f"  [FAIL] Failed: Status {status}, Error: {questions}")
        return False

    # 2. Test POST /api/submit
    print("\n[Test 2] Submitting answer responses to POST /api/submit...")
    # Build dynamic submission list using the actual question IDs fetched
    answers = []
    for q in questions:
        answers.append({
            "question_id": q["id"],
            "selected_option": "B", # Test guess
            "seconds_left": 8.5
        })
    
    submission_payload = {
        "name": "Test Runner",
        "batch": "QA-2026",
        "answers": answers
    }
    
    status, submission_res = make_request(
        f"{base_url}/api/submit", 
        method="POST", 
        data=submission_payload
    )
    if status == 200:
        print(f"  [OK] Success: Quiz submitted successfully!")
        print(f"    - ID: {submission_res.get('id')}")
        print(f"    - Name: {submission_res.get('name')}")
        print(f"    - Batch: {submission_res.get('batch')}")
        print(f"    - Score: {submission_res.get('score')}")
        print(f"    - Speed Bonus: {submission_res.get('speed_bonus')}")
    else:
        print(f"  [FAIL] Failed: Status {status}, Error: {submission_res}")
        return False

    # 3. Test GET /api/leaderboard
    print("\n[Test 3] Retrieving leaderboard from GET /api/leaderboard...")
    status, leaderboard = make_request(f"{base_url}/api/leaderboard")
    if status == 200 and isinstance(leaderboard, list):
        print(f"  [OK] Success: Received {len(leaderboard)} leaderboard entries.")
        # Find if our test run exists in the leaderboard
        found = False
        for entry in leaderboard:
            if entry.get("name") == "Test Runner" and entry.get("batch") == "QA-2026":
                found = True
                break
        if found:
            print("    - [OK] Success: Found 'Test Runner' entry in the leaderboard list.")
        else:
            print("    - [WARN] Warning: 'Test Runner' entry not found in the leaderboard list.")
    else:
        print(f"  [FAIL] Failed: Status {status}, Error: {leaderboard}")
        return False

    # 4. Test GET /api/podium
    print("\n[Test 4] Retrieving podium details from GET /api/podium...")
    status, podium = make_request(f"{base_url}/api/podium")
    if status == 200 and isinstance(podium, list):
        print(f"  [OK] Success: Received {len(podium)} podium entries (Top 3).")
        for rank, entry in enumerate(podium, 1):
            print(f"    - Rank {rank}: {entry.get('name')} (Score: {entry.get('score')}, Batch: {entry.get('batch')})")
    else:
        print(f"  [FAIL] Failed: Status {status}, Error: {podium}")
        return False

    print("\n" + "=" * 60)
    print("ALL API CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    # Start the server as a background process
    print("Starting uvicorn server for API verification...")
    # Note: Use root virtual environment python interpreter to run uvicorn
    python_path = "..\\.venv\\Scripts\\python.exe"
    
    server_proc = subprocess.Popen(
        [python_path, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"]
    )
    
    try:
        # Wait for the port to open
        if not wait_for_port(8000):
            print("Error: FastAPI server failed to start on port 8000 within timeout.")
            sys.exit(1)
            
        success = run_tests()
        if not success:
            sys.exit(1)
            
    finally:
        print("\nStopping the backend server...")
        server_proc.terminate()
        try:
            server_proc.wait(timeout=3.0)
        except subprocess.TimeoutExpired:
            server_proc.kill()
        print("Server stopped.")
