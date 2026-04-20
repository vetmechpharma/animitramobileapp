"""
v4 Tests: Reports, Admin panel, Subscription/UTR, Coupon management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

ADMIN_CREDS = {"mobile": "9999999999", "password": "Admin@1234"}
DEMO_CREDS = {"mobile": "1234567890", "password": "Demo@123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_CREDS)
    assert r.status_code == 200, f"Demo login failed: {r.text}"
    return r.json()["token"]


# ── Reports ──────────────────────────────────────────────────────────────────

class TestReports:
    """Reports endpoints for vets"""

    def test_animal_type_report_month(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/reports/animal-type?period=month",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200
        d = r.json()
        assert "data" in d
        assert isinstance(d["data"], list)

    def test_animal_type_report_week(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/reports/animal-type?period=week",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200

    def test_animal_type_report_year(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/reports/animal-type?period=year",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200

    def test_animal_type_report_day(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/reports/animal-type?period=day",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200

    def test_visit_reason_report(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/reports/visit-reason?period=month",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200
        d = r.json()
        assert "data" in d

    def test_forwards_report(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/reports/forwards",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200
        d = r.json()
        assert "cases" in d
        assert "total" in d

    def test_report_unauthorized(self):
        r = requests.get(f"{BASE_URL}/api/reports/animal-type?period=month")
        assert r.status_code in [401, 403]


# ── Admin Panel ───────────────────────────────────────────────────────────────

class TestAdminPanel:
    """Admin-only endpoints"""

    def test_admin_summary(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/reports/summary",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        assert "total_users" in d
        assert "active_users" in d
        assert "total_cases" in d

    def test_admin_users_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/users",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        assert "users" in d
        assert isinstance(d["users"], list)
        assert len(d["users"]) > 0

    def test_admin_payment_submissions(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/payment-submissions",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        assert "submissions" in d

    def test_admin_coupons_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/coupons?limit=10",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        assert "coupons" in d
        assert "total" in d
        assert "unused" in d
        assert "activated" in d

    def test_admin_endpoints_blocked_for_vet(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/admin/reports/summary",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code in [401, 403]

    def test_admin_users_blocked_for_vet(self, demo_token):
        r = requests.get(f"{BASE_URL}/api/admin/users",
                         headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code in [401, 403]


# ── Subscription / UTR ────────────────────────────────────────────────────────

class TestSubscription:
    """UTR submission endpoint"""

    def test_submit_utr(self, demo_token):
        r = requests.post(f"{BASE_URL}/api/subscription/submit-utr",
                          headers={"Authorization": f"Bearer {demo_token}",
                                   "Content-Type": "application/json"},
                          json={"utr_number": "TEST123456789", "mobile": "1234567890", "name": "Test Vet"})
        # 200 or 400 (duplicate) both acceptable
        assert r.status_code in [200, 400]
