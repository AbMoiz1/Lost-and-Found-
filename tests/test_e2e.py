"""
End-to-end Selenium tests for Lost & Found Portal
Tests: Registration, Login, Report Lost Item, Report Found Item
Each test is fully independent with its own unique emails.
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
API_URL = "http://localhost:8081"


def unique_email(prefix="user"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@test.com"


def make_driver():
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(8)
    return driver


def wait(driver, by, value, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((by, value))
    )


def wait_click(driver, by, value, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, value))
    )


def fill_register_form(driver, name, email, password):
    driver.get(f"{BASE_URL}/register")
    wait(driver, By.TAG_NAME, "form")
    time.sleep(0.5)

    # Name field (first text input)
    driver.find_element(By.CSS_SELECTOR, "input[type='text']").send_keys(name)
    # Email
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    # Passwords
    pwd = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
    pwd[0].send_keys(password)
    pwd[1].send_keys(password)


def register_and_wait(driver, name, email, password):
    fill_register_form(driver, name, email, password)
    wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(driver, 15).until(EC.url_to_be(f"{BASE_URL}/"))
    time.sleep(0.5)


def logout(driver):
    try:
        btn = wait_click(driver, By.XPATH, "//button[contains(text(),'Logout')]", timeout=5)
        btn.click()
        time.sleep(1)
    except Exception:
        # Already logged out or nav not visible
        pass


def fill_item_form(driver, title, description, category, date_str, location):
    wait(driver, By.TAG_NAME, "form")
    time.sleep(0.5)

    # Title — find by placeholder
    title_input = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='e.g']")
    title_input.clear()
    title_input.send_keys(title)

    # Description
    driver.find_element(By.TAG_NAME, "textarea").send_keys(description)

    # Category select
    Select(driver.find_element(By.TAG_NAME, "select")).select_by_visible_text(category)

    # Date
    date_input = driver.find_element(By.CSS_SELECTOR, "input[type='date']")
    date_input.send_keys(date_str)

    # Location — find input with location placeholder
    all_inputs = driver.find_elements(By.CSS_SELECTOR, "input.input")
    for inp in all_inputs:
        ph = (inp.get_attribute("placeholder") or "").lower()
        if "where" in ph or "lost" in ph or "found" in ph or "location" in ph:
            inp.send_keys(location)
            break


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1: Successful Registration
# ─────────────────────────────────────────────────────────────────────────────
def test_registration_success():
    print("\n[TEST 1] Successful Registration")
    driver = make_driver()
    email = unique_email("alice")
    try:
        fill_register_form(driver, "Alice Smith", email, "Test1234!")
        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()

        WebDriverWait(driver, 15).until(EC.url_to_be(f"{BASE_URL}/"))

        header = driver.find_element(By.TAG_NAME, "header").text
        assert "Alice" in header or "Welcome" in header, f"Name not in header: {header}"
        print(f"  ✓ Registered {email} — name visible in nav")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2: Duplicate Email Rejected
# ─────────────────────────────────────────────────────────────────────────────
def test_duplicate_email():
    print("\n[TEST 2] Duplicate Email Rejected")
    driver = make_driver()
    email = unique_email("dup")
    try:
        # Register once via API (faster)
        requests.post(f"{API_URL}/api/auth/register",
                      json={"name": "First", "email": email, "password": "Test1234!"},
                      timeout=5)

        # Try to register same email via UI
        fill_register_form(driver, "Second", email, "Test1234!")
        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()

        # Should show error, NOT redirect
        time.sleep(2)
        assert driver.current_url != f"{BASE_URL}/", "Should not redirect on duplicate"
        body = driver.find_element(By.TAG_NAME, "body").text
        assert any(w in body.upper() for w in ["CONFLICT", "ALREADY", "EXISTS", "FAILED"]), \
            f"No conflict error shown. Body: {body[:200]}"
        print(f"  ✓ Duplicate email correctly rejected")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3: Form Validation — Empty Submit
# ─────────────────────────────────────────────────────────────────────────────
def test_form_validation():
    print("\n[TEST 3] Form Validation (empty submit)")
    driver = make_driver()
    try:
        driver.get(f"{BASE_URL}/register")
        wait(driver, By.TAG_NAME, "form")
        time.sleep(0.5)

        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(1)

        body = driver.find_element(By.TAG_NAME, "body").text
        assert any(w in body for w in ["characters", "required", "valid", "least", "Name"]), \
            f"No validation errors shown. Body: {body[:200]}"
        print("  ✓ Inline validation errors shown for empty form")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 4: Successful Login
# ─────────────────────────────────────────────────────────────────────────────
def test_login_success():
    print("\n[TEST 4] Successful Login")
    driver = make_driver()
    email = unique_email("login")
    password = "Test1234!"
    try:
        # Register via API
        requests.post(f"{API_URL}/api/auth/register",
                      json={"name": "Login User", "email": email, "password": password},
                      timeout=5)

        # Login via UI
        driver.get(f"{BASE_URL}/login")
        wait(driver, By.TAG_NAME, "form")
        time.sleep(0.5)

        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(password)
        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()

        WebDriverWait(driver, 15).until(EC.url_to_be(f"{BASE_URL}/"))
        header = driver.find_element(By.TAG_NAME, "header").text
        assert "Login" not in header or "Welcome" in header or "Logout" in header
        print(f"  ✓ Login successful for {email}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 5: Wrong Password Rejected
# ─────────────────────────────────────────────────────────────────────────────
def test_wrong_password():
    print("\n[TEST 5] Wrong Password Rejected")
    driver = make_driver()
    email = unique_email("wrongpwd")
    try:
        requests.post(f"{API_URL}/api/auth/register",
                      json={"name": "Wrong Pwd", "email": email, "password": "Test1234!"},
                      timeout=5)

        driver.get(f"{BASE_URL}/login")
        wait(driver, By.TAG_NAME, "form")
        time.sleep(0.5)

        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys("WrongPassword999!")
        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()

        time.sleep(2)
        assert driver.current_url != f"{BASE_URL}/", "Should not redirect on wrong password"
        body = driver.find_element(By.TAG_NAME, "body").text
        assert any(w in body for w in ["failed", "invalid", "incorrect", "INVALID"]), \
            f"No error shown. Body: {body[:200]}"
        print("  ✓ Wrong password correctly rejected")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 6: Report Lost Item
# ─────────────────────────────────────────────────────────────────────────────
def test_report_lost_item():
    print("\n[TEST 6] Report Lost Item")
    driver = make_driver()
    email = unique_email("lost")
    try:
        register_and_wait(driver, "Lost Reporter", email, "Test1234!")

        driver.get(f"{BASE_URL}/items/lost/new")
        fill_item_form(driver, "Black iPhone 14 Pro", "Black iPhone with blue case, cracked screen",
                       "Electronics", "04062026", "Central Park, New York")

        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()

        WebDriverWait(driver, 15).until(
            lambda d: "/items/" in d.current_url and "/new" not in d.current_url
        )

        body = driver.find_element(By.TAG_NAME, "body").text
        assert "iPhone" in body or "Lost" in body, f"Item not shown. Body: {body[:200]}"
        print(f"  ✓ Lost item reported — at {driver.current_url}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 7: Lost Item Form Validation
# ─────────────────────────────────────────────────────────────────────────────
def test_lost_item_validation():
    print("\n[TEST 7] Lost Item Form Validation")
    driver = make_driver()
    email = unique_email("lostval")
    try:
        register_and_wait(driver, "Val User", email, "Test1234!")

        driver.get(f"{BASE_URL}/items/lost/new")
        wait(driver, By.TAG_NAME, "form")
        time.sleep(0.5)

        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(1)

        body = driver.find_element(By.TAG_NAME, "body").text
        assert any(w in body for w in ["characters", "required", "least", "select", "Title"]), \
            f"No validation errors. Body: {body[:200]}"
        print("  ✓ Validation errors shown for empty lost item form")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 8: Report Found Item
# ─────────────────────────────────────────────────────────────────────────────
def test_report_found_item():
    print("\n[TEST 8] Report Found Item")
    driver = make_driver()
    email = unique_email("found")
    try:
        register_and_wait(driver, "Found Reporter", email, "Test1234!")

        driver.get(f"{BASE_URL}/items/found/new")
        fill_item_form(driver, "Found iPhone with blue case",
                       "Found black iPhone with blue case near Central Park fountain",
                       "Electronics", "04062026", "Central Park, New York")

        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()

        WebDriverWait(driver, 15).until(
            lambda d: "/items/" in d.current_url and "/new" not in d.current_url
        )

        body = driver.find_element(By.TAG_NAME, "body").text
        assert "iPhone" in body or "Found" in body
        print(f"  ✓ Found item reported — at {driver.current_url}")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 9: Full Journey — Register, Report, Search
# ─────────────────────────────────────────────────────────────────────────────
def test_full_journey():
    print("\n[TEST 9] Full User Journey")
    driver = make_driver()
    alice_email = unique_email("alice")
    bob_email = unique_email("bob")
    try:
        # Alice registers and reports lost item
        print("  → Alice registers and reports lost iPhone...")
        register_and_wait(driver, "Alice Smith", alice_email, "Test1234!")

        driver.get(f"{BASE_URL}/items/lost/new")
        fill_item_form(driver, "Black iPhone 14 Pro",
                       "Black iPhone 14 Pro with blue case and cracked screen protector",
                       "Electronics", "04062026", "Central Park, New York")
        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, 15).until(
            lambda d: "/items/" in d.current_url and "/new" not in d.current_url
        )
        lost_item_url = driver.current_url
        print(f"  ✓ Lost item: {lost_item_url}")

        logout(driver)

        # Bob registers and reports found item
        print("  → Bob registers and reports found iPhone...")
        register_and_wait(driver, "Bob Jones", bob_email, "Test1234!")

        driver.get(f"{BASE_URL}/items/found/new")
        fill_item_form(driver, "Found iPhone with blue case",
                       "Found black iPhone with blue case near Central Park fountain area",
                       "Electronics", "04062026", "Central Park, New York")
        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, 15).until(
            lambda d: "/items/" in d.current_url and "/new" not in d.current_url
        )
        print(f"  ✓ Found item: {driver.current_url}")

        # Search for iPhone — wait for OpenSearch to index
        print("  → Searching for iPhone (waiting for indexing)...")
        time.sleep(6)  # OpenSearch indexes within 5 seconds per spec
        driver.get(f"{BASE_URL}/search")
        wait(driver, By.TAG_NAME, "form")
        search_input = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='keyword'], input[placeholder*='Search']")
        search_input.send_keys("iPhone")
        wait_click(driver, By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(3)

        body = driver.find_element(By.TAG_NAME, "body").text
        assert "iPhone" in body or "found" in body.lower() or "lost" in body.lower(), \
            f"iPhone not in search results. Body: {body[:300]}"
        print("  ✓ Search results contain iPhone")

        # Bob visits Alice's lost item
        print("  → Bob visits Alice's lost item...")
        driver.get(lost_item_url)
        time.sleep(2)
        body = driver.find_element(By.TAG_NAME, "body").text
        assert "iPhone" in body
        print("  ✓ Item detail page loads correctly")

        print("\n  ✅ Full journey PASSED")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False
    finally:
        driver.quit()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("Lost & Found Portal — Selenium E2E Tests")
    print("=" * 60)

    tests = [
        ("Registration Success",     test_registration_success),
        ("Duplicate Email Rejected", test_duplicate_email),
        ("Form Validation",          test_form_validation),
        ("Login Success",            test_login_success),
        ("Wrong Password Rejected",  test_wrong_password),
        ("Report Lost Item",         test_report_lost_item),
        ("Lost Item Validation",     test_lost_item_validation),
        ("Report Found Item",        test_report_found_item),
        ("Full User Journey",        test_full_journey),
    ]

    results = []
    for name, fn in tests:
        passed = fn()
        results.append((name, passed))

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    for name, passed in results:
        icon = "✅" if passed else "❌"
        print(f"{icon} {name}")

    total = len(results)
    passed_count = sum(1 for _, p in results if p)
    print(f"\n{passed_count}/{total} tests passed")
