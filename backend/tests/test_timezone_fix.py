"""
Tests for timezone date fix — verifying that visit_date='YYYY-MM-DD' correctly
determines status (upcoming vs active vs pending) without timezone shift.
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

DEMO_MOBILE = "1234567890"
DEMO_PASSWORD = "Demo@123"

@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"mobile": DEMO_MOBILE, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

def get_local_date_str(delta_days: int) -> str:
    """Get YYYY-MM-DD for today + delta_days in UTC (simulates toLocalDateStr)."""
    d = datetime.now(timezone.utc) + timedelta(days=delta_days)
    return f"{d.year}-{str(d.month).padStart(2, '0') if False else str(d.month).zfill(2)}-{str(d.day).zfill(2)}"

# Test: Tomorrow's visit_date should create status='upcoming'
class TestTomorrowCase:
    case_id = None

    def test_create_tomorrow_case(self, headers):
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        r = requests.post(f"{BASE_URL}/api/cases/quick-add", headers=headers, json={
            "owner_name": "TEST_TomorrowCase",
            "mobile": "9000000001",
            "animal_type": "Dog",
            "visit_reason": "Vaccination",
            "visit_date": tomorrow,
        })
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        assert data["success"] is True
        TestTomorrowCase.case_id = data["case_id"]
        print(f"Created tomorrow case id={data['case_id']} with visit_date={tomorrow}")

    def test_tomorrow_case_not_in_today(self, headers):
        r = requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        assert r.status_code == 200
        cases = r.json()["cases"]
        ids = [c["id"] for c in cases]
        assert TestTomorrowCase.case_id not in ids, \
            f"Tomorrow's case {TestTomorrowCase.case_id} should NOT appear in today's cases!"
        print(f"PASS: tomorrow case not in today's cases (total today: {len(cases)})")

    def test_tomorrow_case_in_upcoming(self, headers):
        r = requests.get(f"{BASE_URL}/api/cases/upcoming", headers=headers)
        assert r.status_code == 200
        cases = r.json()["cases"]
        ids = [c["id"] for c in cases]
        assert TestTomorrowCase.case_id in ids, \
            f"Tomorrow's case {TestTomorrowCase.case_id} should appear in upcoming cases! Got: {ids}"
        # Verify status
        tc = next(c for c in cases if c["id"] == TestTomorrowCase.case_id)
        assert tc["status"] == "upcoming", f"Expected status=upcoming, got {tc['status']}"
        print(f"PASS: tomorrow case is in upcoming with status={tc['status']}")


# Test: Today's visit_date should create status='active'
class TestTodayCase:
    case_id = None

    def test_create_today_case(self, headers):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = requests.post(f"{BASE_URL}/api/cases/quick-add", headers=headers, json={
            "owner_name": "TEST_TodayCase",
            "mobile": "9000000002",
            "animal_type": "Cat",
            "visit_reason": "Check-up",
            "visit_date": today,
        })
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        assert data["success"] is True
        TestTodayCase.case_id = data["case_id"]
        print(f"Created today case id={data['case_id']} with visit_date={today}")

    def test_today_case_in_today(self, headers):
        r = requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        assert r.status_code == 200
        cases = r.json()["cases"]
        ids = [c["id"] for c in cases]
        assert TestTodayCase.case_id in ids, \
            f"Today's case should appear in today's cases!"
        tc = next(c for c in cases if c["id"] == TestTodayCase.case_id)
        assert tc["status"] in ("active", "upcoming"), f"Expected active/upcoming, got {tc['status']}"
        print(f"PASS: today case in today's list with status={tc['status']}")

    def test_today_case_not_in_upcoming(self, headers):
        r = requests.get(f"{BASE_URL}/api/cases/upcoming", headers=headers)
        assert r.status_code == 200
        cases = r.json()["cases"]
        ids = [c["id"] for c in cases]
        assert TestTodayCase.case_id not in ids, \
            "Today's case should NOT be in upcoming!"
        print("PASS: today case not in upcoming")


# Test: Yesterday's visit_date should appear as pending
class TestYesterdayCase:
    case_id = None

    def test_create_yesterday_case(self, headers):
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        r = requests.post(f"{BASE_URL}/api/cases/quick-add", headers=headers, json={
            "owner_name": "TEST_YesterdayCase",
            "mobile": "9000000003",
            "animal_type": "Cow",
            "visit_reason": "Treatment",
            "visit_date": yesterday,
        })
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        TestYesterdayCase.case_id = data["case_id"]
        print(f"Created yesterday case id={data['case_id']} with visit_date={yesterday}")

    def test_yesterday_case_in_pending(self, headers):
        # Trigger auto_pending via any cases endpoint
        requests.get(f"{BASE_URL}/api/cases/today", headers=headers)
        r = requests.get(f"{BASE_URL}/api/cases/pending", headers=headers)
        assert r.status_code == 200
        cases = r.json()["cases"]
        ids = [c["id"] for c in cases]
        assert TestYesterdayCase.case_id in ids, \
            f"Yesterday case should be in pending! Got ids: {ids[:5]}"
        tc = next(c for c in cases if c["id"] == TestYesterdayCase.case_id)
        assert tc["status"] == "pending", f"Expected pending, got {tc['status']}"
        print(f"PASS: yesterday case is in pending with status={tc['status']}")


# Cleanup
class TestCleanup:
    def test_delete_test_cases(self, headers):
        for case_id in [TestTomorrowCase.case_id, TestTodayCase.case_id, TestYesterdayCase.case_id]:
            if case_id:
                r = requests.delete(f"{BASE_URL}/api/cases/{case_id}", headers=headers)
                print(f"Deleted case {case_id}: {r.status_code}")
        print("Cleanup complete")
