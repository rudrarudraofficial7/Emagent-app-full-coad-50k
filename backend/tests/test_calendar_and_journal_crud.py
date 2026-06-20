"""Targeted regression tests for the latest changes:
- GET /api/calendar (weeks + days, Mon-Fri only, journal-derived trade stats)
- POST/PUT/DELETE /api/journal (full CRUD round-trip)
- Calendar tradeCount integrates with journal entries on the same date.
"""
import os
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://trader-scaling-hub.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- /api/calendar ----------
class TestCalendar:
    def test_calendar_shape(self, s):
        r = s.get(f"{API}/calendar")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "weeks" in d and "days" in d
        assert isinstance(d["weeks"], list)
        assert isinstance(d["days"], list)

    def test_calendar_days_count_and_weekday(self, s):
        d = s.get(f"{API}/calendar").json()
        days = d["days"]
        assert len(days) == 90, f"expected 90 trading days, got {len(days)}"
        # No weekends allowed
        for day in days:
            assert day["weekday"] < 5, f"weekend day leaked in: {day}"
            # Required keys per day
            for k in ["dayNumber", "date", "targetR", "status", "rEarned",
                      "tradeCount", "wins", "losses", "journalR", "weekday"]:
                assert k in day, f"day missing key {k}: {day}"
            # Sanity: parse date and confirm weekday matches
            dt = datetime.fromisoformat(day["date"].replace("Z", "+00:00"))
            assert dt.weekday() == day["weekday"]
            assert dt.weekday() < 5

    def test_calendar_weeks_grouping(self, s):
        d = s.get(f"{API}/calendar").json()
        weeks = d["weeks"]
        # 90 days / 5 per chunk = 18 weeks
        assert len(weeks) == 18, f"expected 18 weeks, got {len(weeks)}"
        for w in weeks:
            for k in ["weekNumber", "startDay", "endDay", "startDate", "endDate",
                      "plannedR", "rEarned", "tradeCount", "wins", "losses", "days"]:
                assert k in w, f"week missing {k}: keys={list(w.keys())}"
            assert len(w["days"]) == 5
            assert w["endDay"] - w["startDay"] == 4
        # Week numbers monotonic 1..18
        assert [w["weekNumber"] for w in weeks] == list(range(1, 19))

    def test_calendar_no_object_id(self, s):
        d = s.get(f"{API}/calendar").json()
        for day in d["days"]:
            assert "_id" not in day
        for w in d["weeks"]:
            assert "_id" not in w
            for day in w["days"]:
                assert "_id" not in day


# ---------- /api/journal full CRUD ----------
class TestJournalCRUD:
    created_id = None

    def test_create_entry(self, s):
        payload = {
            "market": "TEST_EURUSD",
            "setupType": "TEST_breakout",
            "entry": 1.0800,
            "stopLoss": 1.0780,
            "takeProfit": 1.0840,
            "risk": 100.0,
            "result": "win",
            "rEarned": 2.0,
            "notes": "TEST_initial entry",
        }
        r = s.post(f"{API}/journal", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body
        assert body["market"] == "TEST_EURUSD"
        assert body["rEarned"] == 2.0
        assert body["result"] == "win"
        assert "_id" not in body
        TestJournalCRUD.created_id = body["id"]

    def test_entry_appears_in_list(self, s):
        assert TestJournalCRUD.created_id, "create test must run first"
        r = s.get(f"{API}/journal")
        assert r.status_code == 200
        ids = [j["id"] for j in r.json()]
        assert TestJournalCRUD.created_id in ids

    def test_calendar_trade_count_updated(self, s):
        """The day matching the new entry's date must show tradeCount >= 1."""
        assert TestJournalCRUD.created_id
        jr = s.get(f"{API}/journal").json()
        entry = next(j for j in jr if j["id"] == TestJournalCRUD.created_id)
        entry_date = datetime.fromisoformat(entry["date"].replace("Z", "+00:00")).date().isoformat()

        cal = s.get(f"{API}/calendar").json()
        matching = [d for d in cal["days"]
                    if datetime.fromisoformat(d["date"].replace("Z", "+00:00")).date().isoformat() == entry_date]
        # The entry may fall on a weekend (created with now()), so only assert if a plan day exists
        if matching:
            assert matching[0]["tradeCount"] >= 1, f"calendar day did not pick up the new trade: {matching[0]}"
            # The week containing it should also aggregate
            week = next(w for w in cal["weeks"]
                        if w["startDay"] <= matching[0]["dayNumber"] <= w["endDay"])
            assert week["tradeCount"] >= 1

    def test_update_entry(self, s):
        assert TestJournalCRUD.created_id
        upd = {"market": "TEST_GBPUSD", "notes": "TEST_updated notes", "rEarned": 3.5, "result": "loss"}
        r = s.put(f"{API}/journal/{TestJournalCRUD.created_id}", json=upd)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["market"] == "TEST_GBPUSD"
        assert body["notes"] == "TEST_updated notes"
        assert body["rEarned"] == 3.5
        assert body["result"] == "loss"
        # GET to verify persistence
        lst = s.get(f"{API}/journal").json()
        e = next(j for j in lst if j["id"] == TestJournalCRUD.created_id)
        assert e["market"] == "TEST_GBPUSD"
        assert e["rEarned"] == 3.5
        assert e["notes"] == "TEST_updated notes"
        assert e["result"] == "loss"

    def test_delete_entry(self, s):
        assert TestJournalCRUD.created_id
        r = s.delete(f"{API}/journal/{TestJournalCRUD.created_id}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("deleted") == 1
        # Verify gone from list
        lst = s.get(f"{API}/journal").json()
        assert all(j["id"] != TestJournalCRUD.created_id for j in lst)

    def test_delete_nonexistent_returns_zero(self, s):
        r = s.delete(f"{API}/journal/does-not-exist-id")
        assert r.status_code == 200
        assert r.json().get("deleted") == 0
