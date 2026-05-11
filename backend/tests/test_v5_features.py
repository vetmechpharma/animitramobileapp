"""
V5 Feature Tests: 3-day trial, top performers, export owner data, registration flow
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"mobile": "9999999999", "password": "Admin@1234"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"mobile": "1234567890", "password": "Demo@123"})
    assert r.status_code == 200, f"Demo login failed: {r.text}"
    return r.json()

class TestRegistrationFlow:
    """Test registration returns trial data and direct dashboard access"""

    def test_register_returns_trial(self):
        mobile = f"9{int(time.time()) % 1000000000:09d}"[:10]
        payload = {
            "name": "TEST_Trial Vet",
            "reg_no": "TN/VCI/TEST999",
            "mobile": mobile,
            "password": "Test@123",
            "state": "Tamil Nadu",
            "district": "Chennai",
            "taluk": "Alandur"
        }
        r = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert r.status_code == 200, f"Register failed: {r.text}"
        d = r.json()
        assert d.get("success") is True
        assert "token" in d
        assert "user" in d
        user = d["user"]
        assert user.get("is_trial") is True, f"Expected is_trial=True, got {user.get('is_trial')}"
        assert user.get("trial_days_left") == 3, f"Expected trial_days_left=3, got {user.get('trial_days_left')}"

    def test_demo_login_no_trial(self, demo_token):
        """Demo user (activated) should not have trial flag"""
        user = demo_token["user"]
        # Demo user is activated, is_trial should be False
        assert user.get("is_trial") is False, f"Demo user should not be in trial: {user.get('is_trial')}"
        assert user.get("trial_days_left") == 0, f"Demo user trial_days_left should be 0: {user.get('trial_days_left')}"

class TestTopPerformers:
    """Test admin top performers endpoint"""

    def test_top_performers_returns_by_cases(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/analytics/top-performers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200, f"Top performers failed: {r.text}"
        d = r.json()
        assert "by_cases" in d, f"Missing by_cases key: {d.keys()}"
        assert "by_earnings" in d, f"Missing by_earnings key: {d.keys()}"
        assert isinstance(d["by_cases"], list)
        assert isinstance(d["by_earnings"], list)

    def test_top_performers_by_cases_sorted(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/analytics/top-performers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        d = r.json()
        by_cases = d["by_cases"]
        if len(by_cases) >= 2:
            for i in range(len(by_cases) - 1):
                assert by_cases[i]["total_cases"] >= by_cases[i+1]["total_cases"], \
                    "by_cases not sorted descending"

    def test_top_performers_by_earnings_sorted(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/analytics/top-performers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        d = r.json()
        by_earnings = d["by_earnings"]
        if len(by_earnings) >= 2:
            for i in range(len(by_earnings) - 1):
                assert by_earnings[i]["total_earnings"] >= by_earnings[i+1]["total_earnings"], \
                    "by_earnings not sorted descending"

    def test_top_performers_user_fields(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/analytics/top-performers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        d = r.json()
        by_cases = d["by_cases"]
        if by_cases:
            u = by_cases[0]
            required = ["name", "mobile", "total_cases", "total_earnings"]
            for field in required:
                assert field in u, f"Missing field '{field}' in performer: {u.keys()}"

    def test_top_performers_non_admin_blocked(self, demo_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/analytics/top-performers",
            headers={"Authorization": f"Bearer {demo_token['token']}"}
        )
        assert r.status_code in [403, 401], f"Non-admin should be blocked, got {r.status_code}"

class TestExportOwnerData:
    """Test CSV export endpoint"""

    def test_export_owner_data_returns_csv(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/export/owner-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200, f"Export failed: {r.text}"
        content = r.text
        # Check CSV format
        assert len(content) > 0, "CSV should not be empty"
        lines = content.strip().split("\n")
        assert len(lines) >= 1, "CSV should have at least header"
        # Check header row has common fields
        header = lines[0].lower()
        assert any(word in header for word in ["name", "mobile", "owner"]), \
            f"CSV header missing expected fields: {lines[0]}"

    def test_export_owner_data_non_admin_blocked(self, demo_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/export/owner-data",
            headers={"Authorization": f"Bearer {demo_token['token']}"}
        )
        assert r.status_code in [403, 401], f"Non-admin should be blocked, got {r.status_code}"
