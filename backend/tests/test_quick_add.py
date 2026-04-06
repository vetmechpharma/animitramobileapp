"""Tests for Quick Add FAB feature - /api/cases/quick-add and /api/cases"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"mobile": "9999999999", "password": "Admin@1234"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

# Quick add valid case
def test_quick_add_creates_case(auth_headers):
    payload = {
        "owner_name": "TEST_Owner Quick",
        "mobile": "9876543210",
        "animal_type": "Dog",
        "visit_reason": "Vaccination",
        "estimated_amount": 500.0,
        "notes": "Test quick add case"
    }
    res = requests.post(f"{BASE_URL}/api/cases/quick-add", json=payload, headers=auth_headers)
    assert res.status_code == 200, f"Failed: {res.text}"
    data = res.json()
    assert data.get("success") is True
    assert "case_id" in data

# Quick add without token => 401
def test_quick_add_requires_auth():
    payload = {"owner_name": "Test", "mobile": "9876543210", "animal_type": "Dog", "visit_reason": "Check-up"}
    res = requests.post(f"{BASE_URL}/api/cases/quick-add", json=payload)
    assert res.status_code == 401

# Quick add missing required fields => 422
def test_quick_add_missing_fields(auth_headers):
    res = requests.post(f"{BASE_URL}/api/cases/quick-add", json={"owner_name": "Test"}, headers=auth_headers)
    assert res.status_code == 422

# GET /api/cases returns list
def test_list_cases(auth_headers):
    res = requests.get(f"{BASE_URL}/api/cases", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "cases" in data or isinstance(data, list)

# Dashboard stats include today_cases and total_cases
def test_dashboard_stats_after_quick_add(auth_headers):
    # Add a case first
    payload = {
        "owner_name": "TEST_Stat Check",
        "mobile": "9000000001",
        "animal_type": "Cat",
        "visit_reason": "Check-up",
    }
    requests.post(f"{BASE_URL}/api/cases/quick-add", json=payload, headers=auth_headers)
    
    res = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
    assert res.status_code == 200
    stats = res.json()
    assert "today_cases" in stats
    assert "total_cases" in stats
    assert stats["today_cases"] >= 1
    assert stats["total_cases"] >= 1
