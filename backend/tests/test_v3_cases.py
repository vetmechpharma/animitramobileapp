"""
Backend tests for Animitra v3 - Cases, Ledger, Villages, Dashboard APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"mobile": "1234567890", "password": "Demo@123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


class TestCasesAPI:
    """Cases endpoint tests - today, upcoming, pending, closed"""

    def test_today_cases_returns_3(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "cases" in data
        assert len(data["cases"]) == 3, f"Expected 3 today cases, got {len(data['cases'])}"

    def test_today_cases_have_expected_names(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        data = res.json()
        names = [c["owner_name"] for c in data["cases"]]
        assert "Arjun Sharma" in names
        assert "Priya Nair" in names
        assert "Ramesh Kumar" in names

    def test_today_cases_have_villages(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        data = res.json()
        for c in data["cases"]:
            assert "village_name" in c

    def test_upcoming_cases_returns_2(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/upcoming", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "cases" in data
        assert len(data["cases"]) == 2, f"Expected 2 upcoming cases, got {len(data['cases'])}"

    def test_upcoming_cases_have_expected_names(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/upcoming", headers=headers)
        data = res.json()
        names = [c["owner_name"] for c in data["cases"]]
        assert "Lokesh P" in names
        assert "Murugan P" in names

    def test_pending_cases_returns_1(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/pending", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "cases" in data
        assert len(data["cases"]) == 1, f"Expected 1 pending case, got {len(data['cases'])}"

    def test_pending_has_kavitha(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/pending", headers=headers)
        data = res.json()
        names = [c["owner_name"] for c in data["cases"]]
        assert "Kavitha M" in names

    def test_closed_cases_returns_cases(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/closed", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "cases" in data
        names = [c["owner_name"] for c in data["cases"]]
        assert "Arjun Sharma" in names
        assert "Priya Nair" in names

    def test_cases_have_required_fields(self, headers):
        res = requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        data = res.json()
        for c in data["cases"]:
            assert "id" in c
            assert "owner_name" in c
            assert "mobile" in c
            assert "village_name" in c
            assert "animal_type" in c
            assert "status" in c
            assert "is_paid" in c

    def test_close_case(self, headers):
        # Get an active case first
        res = requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        data = res.json()
        active_cases = [c for c in data["cases"] if c["status"] == "active"]
        if not active_cases:
            pytest.skip("No active cases to close")
        case_id = active_cases[0]["id"]
        close_res = requests.post(
            f"{BASE_URL}/api/cases/{case_id}/close",
            headers=headers,
            json={"amount": 500.0, "payment_mode": "Cash", "is_paid": True, "follow_up_date": None}
        )
        assert close_res.status_code == 200
        assert close_res.json()["success"] is True


class TestLedgerAPI:
    """Ledger outstanding endpoint tests"""

    def test_ledger_outstanding_returns_data(self, headers):
        res = requests.get(f"{BASE_URL}/api/ledger/outstanding", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_outstanding" in data
        assert "cases" in data

    def test_ledger_total_outstanding_3500(self, headers):
        res = requests.get(f"{BASE_URL}/api/ledger/outstanding?period=all", headers=headers)
        data = res.json()
        # Sunita Devi has 3500 outstanding
        assert data["total_outstanding"] >= 3500, f"Expected >= 3500, got {data['total_outstanding']}"

    def test_ledger_has_sunita_devi(self, headers):
        res = requests.get(f"{BASE_URL}/api/ledger/outstanding?period=all", headers=headers)
        data = res.json()
        names = [c["owner_name"] for c in data["cases"]]
        assert "Sunita Devi" in names

    def test_ledger_period_month(self, headers):
        res = requests.get(f"{BASE_URL}/api/ledger/outstanding?period=month", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_outstanding" in data

    def test_ledger_period_week(self, headers):
        res = requests.get(f"{BASE_URL}/api/ledger/outstanding?period=week", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_outstanding" in data


class TestVillagesAPI:
    """Villages autocomplete API"""

    def test_villages_returns_list(self, headers):
        res = requests.get(f"{BASE_URL}/api/villages", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "villages" in data
        assert isinstance(data["villages"], list)

    def test_villages_has_expected_values(self, headers):
        res = requests.get(f"{BASE_URL}/api/villages", headers=headers)
        data = res.json()
        # Seeded cases have Perur, Kovaipudur, etc.
        assert len(data["villages"]) > 0, "Villages list should not be empty"


class TestDashboardStats:
    """Dashboard stats endpoint"""

    def test_dashboard_stats_returns_all_fields(self, headers):
        res = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert res.status_code == 200
        data = res.json()
        for field in ["today_cases", "upcoming_cases", "today_earnings", "total_earnings", "pending_payments", "total_cases"]:
            assert field in data, f"Missing field: {field}"

    def test_dashboard_today_cases_count(self, headers):
        res = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        data = res.json()
        assert data["today_cases"] == 3
