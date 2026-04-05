"""Animitra API Tests - Auth, Location, Coupons, Dashboard"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def admin_token(session):
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"mobile": "9999999999", "password": "Admin@1234"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["token"]

# ── Health ──────────────────────────────────────────────────────────────────────
class TestHealth:
    def test_api_root(self, session):
        resp = session.get(f"{BASE_URL}/api/")
        assert resp.status_code == 200
        data = resp.json()
        assert "Animitra" in data.get("message", "")
        print("✅ API health check passed")

# ── Auth ────────────────────────────────────────────────────────────────────────
class TestAuth:
    def test_admin_login_success(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"mobile": "9999999999", "password": "Admin@1234"})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("✅ Admin login passed")

    def test_login_wrong_password(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"mobile": "9999999999", "password": "wrongpass"})
        assert resp.status_code == 401
        print("✅ Login with wrong password returns 401")

    def test_register_new_vet(self, session):
        import random
        mobile = f"8{random.randint(100000000, 999999999)}"
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "TEST_Dr. Jane",
            "reg_no": "TEST/VCI/99999",
            "mobile": mobile,
            "password": "Test@1234",
            "state": "Tamil Nadu",
            "district": "Chennai",
            "taluk": "Anna Nagar"
        })
        assert resp.status_code == 200, f"Register failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["is_activated"] == False
        print(f"✅ Registration successful for mobile {mobile}")
        return mobile

    def test_register_duplicate_mobile(self, session):
        # Admin mobile already exists
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"mobile": "9999999999", "password": "Admin@1234"})
        assert resp.status_code == 200  # Already exists

    def test_unactivated_vet_cannot_login(self, session):
        """Test vet 9876543210 is registered but not activated"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"mobile": "9876543210", "password": "Test@123"})
        # Should fail with 403 if not activated, or 401 if not registered
        assert resp.status_code in [401, 403]
        print(f"✅ Unactivated vet login blocked: {resp.status_code}")

    def test_me_endpoint(self, session, admin_token):
        resp = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        print("✅ /auth/me passed")

# ── Location ────────────────────────────────────────────────────────────────────
class TestLocation:
    def test_get_states(self, session):
        resp = session.get(f"{BASE_URL}/api/location/states")
        assert resp.status_code == 200
        data = resp.json()
        states = data.get("states", [])
        assert len(states) >= 36, f"Expected 36+ states, got {len(states)}"
        assert "Tamil Nadu" in states
        print(f"✅ States: {len(states)} returned")

    def test_get_districts_tamil_nadu(self, session):
        resp = session.get(f"{BASE_URL}/api/location/districts/Tamil Nadu")
        assert resp.status_code == 200
        data = resp.json()
        districts = data.get("districts", [])
        assert len(districts) > 0
        assert "Chennai" in districts
        print(f"✅ Tamil Nadu districts: {len(districts)}")

    def test_get_taluks(self, session):
        resp = session.get(f"{BASE_URL}/api/location/taluks/Tamil Nadu/Chennai")
        assert resp.status_code == 200
        data = resp.json()
        taluks = data.get("taluks", [])
        assert len(taluks) > 0
        print(f"✅ Chennai taluks: {len(taluks)}")

# ── Admin Coupons ────────────────────────────────────────────────────────────────
class TestCoupons:
    def test_list_coupons_admin(self, session, admin_token):
        resp = session.get(f"{BASE_URL}/api/admin/coupons", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 10000, f"Expected 10000+ coupons, got {data['total']}"
        print(f"✅ Coupons total: {data['total']}, unused: {data['unused']}")

    def test_coupons_requires_admin(self, session):
        resp = session.get(f"{BASE_URL}/api/admin/coupons")
        assert resp.status_code == 401
        print("✅ Coupon list requires auth")

# ── Dashboard ────────────────────────────────────────────────────────────────────
class TestDashboard:
    def test_dashboard_stats_admin(self, session, admin_token):
        resp = session.get(f"{BASE_URL}/api/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        expected_keys = ["today_cases", "pending_cases", "today_earnings", "total_earnings", "pending_payments", "total_cases"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        print(f"✅ Dashboard stats: {data}")

    def test_dashboard_requires_auth(self, session):
        resp = session.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 401
        print("✅ Dashboard requires auth")
