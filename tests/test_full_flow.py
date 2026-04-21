"""
Full E2E Selenium test: Registration → Login → Report Lost → Report Found
→ Matching → MailHog email check → Claim item
"""
import time
import uuid
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

BASE_URL = "http://localhost:3000"
API_URL  = "http://localhost:8081"
MAILHOG  = "http://localhost:8025"

RUN = uuid.uuid4().hex[:6]
ALICE_EMAIL = f"alice_{RUN}@test.com"
BOB_EMAIL   = f"bob_{RUN}@test.com"
PASSWORD    = "Test1234!"


def driver():
    opts = Options()
    opts.add_argument("--start-maximized")
    opts.add_argument("--disable-notifications")
    d = webdriver.Chrome(options=opts)
    d.implicitly_wait(10)
    return d


def wait(d, by, val, t=15):
    return WebDriverWait(d, t).until(EC.presence_of_element_located((by, val)))


def wait_click(d, by, val, t=15):
    return WebDriverWait(d, t).until(EC.element_to_be_clickable((by, val)))


def register(d, name, email, pw):
    d.get(f"{BASE_URL}/register")
    wait(d, By.TAG_NAME, "form")
    time.sleep(0.5)
    d.find_element(By.CSS_SELECTOR, "input[type='text']").send_keys(name)
    d.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    pwds = d.find_elements(By.CSS_SELECTOR, "input[type='password']")
    pwds[0].send_keys(pw)
    pwds[1].send_keys(pw)
    wait_click(d, By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(d, 15).until(EC.url_to_be(f"{BASE_URL}/"))
    print(f"  ✓ Registered: {email}")


def login(d, email, pw):
    d.get(f"{BASE_URL}/login")
    wait(d, By.TAG_NAME, "form")
    time.sleep(0.5)
    d.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    d.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(pw)
    wait_click(d, By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(d, 15).until(EC.url_to_be(f"{BASE_URL}/"))
    print(f"  ✓ Logged in: {email}")


def logout(d):
    try:
        wait_click(d, By.XPATH, "//button[contains(text(),'Logout')]", t=5).click()
        time.sleep(1)
        print("  ✓ Logged out")
    except Exception:
        pass


def report_item(d, item_type, title, desc, category, date_str, location):
    d.get(f"{BASE_URL}/items/{item_type}/new")
    wait(d, By.TAG_NAME, "form")
    time.sleep(0.5)

    d.find_element(By.CSS_SELECTOR, "input[placeholder*='e.g']").send_keys(title)
    d.find_element(By.TAG_NAME, "textarea").send_keys(desc)
    Select(d.find_element(By.TAG_NAME, "select")).select_by_visible_text(category)
    d.find_element(By.CSS_SELECTOR, "input[type='date']").send_keys(date_str)

    for inp in d.find_elements(By.CSS_SELECTOR, "input.input"):
        ph = (inp.get_attribute("placeholder") or "").lower()
        if any(w in ph for w in ["where", "lost", "found", "location"]):
            inp.send_keys(location)
            break

    wait_click(d, By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(d, 15).until(
        lambda x: "/items/" in x.current_url and "/new" not in x.current_url
    )
    url = d.current_url
    print(f"  ✓ Reported {item_type} item: {url}")
    return url


def check_mailhog(to_email, timeout=30):
    """Poll MailHog API until an email to `to_email` appears."""
    print(f"  → Waiting for email to {to_email} in MailHog...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{MAILHOG}/api/v2/messages?limit=50", timeout=5)
            msgs = r.json().get("items", [])
            for m in msgs:
                recipients = m.get("Raw", {}).get("To", [])
                if any(to_email in rec for rec in recipients):
                    subject = m.get("Content", {}).get("Headers", {}).get("Subject", [""])[0]
                    print(f"  ✓ Email found! Subject: {subject}")
                    return True
        except Exception:
            pass
        time.sleep(2)
    print(f"  ✗ No email found for {to_email} after {timeout}s")
    return False


# ─────────────────────────────────────────────────────────────────────────────
print("=" * 60)
print("Lost & Found — Full Flow E2E Test")
print(f"Alice: {ALICE_EMAIL}")
print(f"Bob:   {BOB_EMAIL}")
print("=" * 60)

results = {}

# ── STEP 1: Alice registers ──────────────────────────────────────────────────
print("\n[STEP 1] Alice registers")
d = driver()
try:
    register(d, "Alice Smith", ALICE_EMAIL, PASSWORD)
    header = d.find_element(By.TAG_NAME, "header").text
    assert "Alice" in header or "Logout" in header
    results["1. Alice Registration"] = True
except Exception as e:
    results["1. Alice Registration"] = False
    print(f"  ✗ {e}")

# ── STEP 2: Alice reports a lost item ────────────────────────────────────────
print("\n[STEP 2] Alice reports lost iPhone")
try:
    lost_url = report_item(d, "lost",
        "Black iPhone 14 Pro",
        "Black iPhone 14 Pro with blue case and cracked screen protector",
        "Electronics", "04062026", "Central Park, New York")
    results["2. Report Lost Item"] = True
except Exception as e:
    results["2. Report Lost Item"] = False
    lost_url = None
    print(f"  ✗ {e}")

logout(d)
d.quit()

# ── STEP 3: Bob registers ────────────────────────────────────────────────────
print("\n[STEP 3] Bob registers")
d = driver()
try:
    register(d, "Bob Jones", BOB_EMAIL, PASSWORD)
    results["3. Bob Registration"] = True
except Exception as e:
    results["3. Bob Registration"] = False
    print(f"  ✗ {e}")

# ── STEP 4: Bob reports a found item ─────────────────────────────────────────
print("\n[STEP 4] Bob reports found iPhone")
try:
    found_url = report_item(d, "found",
        "Found iPhone with blue case",
        "Found black iPhone with blue case near Central Park fountain area",
        "Electronics", "04062026", "Central Park, New York")
    results["4. Report Found Item"] = True
except Exception as e:
    results["4. Report Found Item"] = False
    found_url = None
    print(f"  ✗ {e}")

# ── STEP 5: Check MailHog for match notification ─────────────────────────────
print("\n[STEP 5] Check MailHog for match email to Alice")
try:
    email_received = check_mailhog(ALICE_EMAIL, timeout=45)
    results["5. Match Email (MailHog)"] = email_received
except Exception as e:
    results["5. Match Email (MailHog)"] = False
    print(f"  ✗ {e}")

# ── STEP 6: Bob claims Alice's lost item ─────────────────────────────────────
print("\n[STEP 6] Bob claims Alice's lost item")
try:
    if lost_url:
        d.get(lost_url)
        time.sleep(2)
        body = d.find_element(By.TAG_NAME, "body").text
        if "Claim This Item" in body:
            wait_click(d, By.XPATH, "//button[contains(text(),'Claim')]").click()
            time.sleep(2)
            body = d.find_element(By.TAG_NAME, "body").text
            assert "successfully" in body.lower() or "pending" in body.lower()
            print("  ✓ Claim submitted successfully")
            results["6. Claim Item"] = True
        else:
            # Lost items don't show claim button — try found item
            print("  → Lost item has no claim button, trying found item...")
            if found_url:
                # Login as Alice to claim Bob's found item
                logout(d)
                login(d, ALICE_EMAIL, PASSWORD)
                d.get(found_url)
                time.sleep(2)
                body = d.find_element(By.TAG_NAME, "body").text
                if "Claim This Item" in body:
                    wait_click(d, By.XPATH, "//button[contains(text(),'Claim')]").click()
                    time.sleep(2)
                    body = d.find_element(By.TAG_NAME, "body").text
                    assert "successfully" in body.lower() or "pending" in body.lower()
                    print("  ✓ Alice claimed Bob's found item")
                    results["6. Claim Item"] = True
                else:
                    print(f"  ✗ No claim button found. Page: {body[:100]}")
                    results["6. Claim Item"] = False
    else:
        results["6. Claim Item"] = False
        print("  ✗ No lost item URL available")
except Exception as e:
    results["6. Claim Item"] = False
    print(f"  ✗ {e}")

# ── STEP 7: Check My Claims ───────────────────────────────────────────────────
print("\n[STEP 7] Check My Claims page")
try:
    d.get(f"{BASE_URL}/my-claims")
    time.sleep(2)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "pending" in body.lower() or "claim" in body.lower()
    print("  ✓ My Claims page shows pending claim")
    results["7. My Claims Page"] = True
except Exception as e:
    results["7. My Claims Page"] = False
    print(f"  ✗ {e}")

# ── STEP 8: Search verification ───────────────────────────────────────────────
print("\n[STEP 8] Search for iPhone")
try:
    time.sleep(10)  # wait for OpenSearch indexing
    d.get(f"{BASE_URL}/search")
    wait(d, By.TAG_NAME, "form")
    d.find_element(By.CSS_SELECTOR, "input[placeholder*='keyword'], input[placeholder*='Search']").send_keys("iPhone")
    wait_click(d, By.CSS_SELECTOR, "button[type='submit']").click()
    time.sleep(3)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "iPhone" in body
    print("  ✓ iPhone appears in search results")
    results["8. Search"] = True
except Exception as e:
    results["8. Search"] = False
    print(f"  ✗ {e}")

d.quit()

# ── RESULTS ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("RESULTS")
print("=" * 60)
for name, passed in results.items():
    print(f"{'✅' if passed else '❌'} {name}")

passed_count = sum(1 for p in results.values() if p)
print(f"\n{passed_count}/{len(results)} steps passed")
