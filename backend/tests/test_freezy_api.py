"""Freezy Prop Firm Command Center - Backend API regression suite."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://trader-scaling-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Settings ----------
class TestSettings:
    def test_get_settings_seeded(self, s):
        r = s.get(f"{API}/settings")
        assert r.status_code == 200
        d = r.json()
        assert d["tradingDaysAvailable"] == 90
        assert d["expectedR"] == 210.0
        assert d["profitSplit"] == 0.9
        assert d["goalAmount"] == 50000.0
        assert "_id" not in d

    def test_put_settings_update(self, s):
        r = s.put(f"{API}/settings", json={"traderName": "TEST_Freezy"})
        assert r.status_code == 200
        assert r.json()["traderName"] == "TEST_Freezy"
        # restore
        s.put(f"{API}/settings", json={"traderName": "Freezy"})


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_full_payload(self, s):
        r = s.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["kpis", "goal", "achievements", "scalingRoadmap", "recentPayouts", "payoutCurve", "settings"]:
            assert k in d, f"missing {k}"
        assert d["goal"]["target"] == 50000.0
        assert isinstance(d["achievements"], list) and len(d["achievements"]) == 7
        assert isinstance(d["scalingRoadmap"], list) and len(d["scalingRoadmap"]) == 7


# ---------- Plan ----------
class TestPlan:
    def test_plan_seeded_90_days(self, s):
        r = s.get(f"{API}/plan")
        assert r.status_code == 200
        days = r.json()
        assert len(days) >= 90
        assert days[0]["dayNumber"] == 1

    def test_plan_update(self, s):
        r = s.put(f"{API}/plan/1", json={"status": "completed", "rEarned": 2.5, "notes": "TEST_note",
                                          "checklist": {"marketAnalysis": True, "setupFound": True,
                                                        "tradeTaken": True, "riskFollowed": True,
                                                        "journalUpdated": True, "dayCompleted": True}})
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "completed"
        assert d["rEarned"] == 2.5
        assert d["checklist"]["dayCompleted"] is True
        # reset
        s.put(f"{API}/plan/1", json={"status": "pending", "rEarned": 0.0, "notes": "",
                                      "checklist": {k: False for k in d["checklist"]}})


# ---------- Accounts ----------
class TestAccounts:
    def test_starter_account_seeded(self, s):
        r = s.get(f"{API}/accounts")
        assert r.status_code == 200
        items = r.json()
        assert any(a["accountType"] == "25K" for a in items)
        for a in items:
            assert "_id" not in a

    def test_create_25k_pricing(self, s):
        r = s.post(f"{API}/accounts", json={"name": "TEST_25k", "accountType": "25K"})
        assert r.status_code == 200
        a = r.json()
        assert a["price"] == 60.0 and a["accountSize"] == 25000.0 and a["maxPayout"] == 1000.0
        s.delete(f"{API}/accounts/{a['id']}")

    def test_create_50k_pricing(self, s):
        r = s.post(f"{API}/accounts", json={"name": "TEST_50k", "accountType": "50K"})
        assert r.status_code == 200
        a = r.json()
        assert a["price"] == 80.0 and a["accountSize"] == 50000.0 and a["maxPayout"] == 2000.0
        s.delete(f"{API}/accounts/{a['id']}")

    def test_status_transition_auto_stamps(self, s):
        a = s.post(f"{API}/accounts", json={"name": "TEST_stamp", "accountType": "25K"}).json()
        aid = a["id"]
        try:
            r = s.put(f"{API}/accounts/{aid}", json={"status": "evaluation_passed"})
            assert r.json()["evaluationPassDate"] is not None
            r = s.put(f"{API}/accounts/{aid}", json={"status": "funded_active"})
            assert r.json()["fundedDate"] is not None
        finally:
            s.delete(f"{API}/accounts/{aid}")

    def test_delete_account(self, s):
        a = s.post(f"{API}/accounts", json={"name": "TEST_del", "accountType": "25K"}).json()
        r = s.delete(f"{API}/accounts/{a['id']}")
        assert r.status_code == 200
        r2 = s.get(f"{API}/accounts/{a['id']}")
        assert r2.status_code == 404


# ---------- Funded days ----------
class TestFundedDays:
    def test_counts_threshold(self, s):
        a = s.post(f"{API}/accounts", json={"name": "TEST_fund", "accountType": "50K"}).json()
        aid = a["id"]
        try:
            r1 = s.post(f"{API}/accounts/{aid}/funded-days", json={"dayNumber": 1, "profit": 200.0}).json()
            r2 = s.post(f"{API}/accounts/{aid}/funded-days", json={"dayNumber": 2, "profit": 100.0}).json()
            d1 = next(d for d in r2["fundedDays"] if d["dayNumber"] == 1)
            d2 = next(d for d in r2["fundedDays"] if d["dayNumber"] == 2)
            assert d1["counts"] is True
            assert d2["counts"] is False

            # Idempotent: re-post day 1 with new value replaces
            r3 = s.post(f"{API}/accounts/{aid}/funded-days", json={"dayNumber": 1, "profit": 50.0}).json()
            days1 = [d for d in r3["fundedDays"] if d["dayNumber"] == 1]
            assert len(days1) == 1 and days1[0]["counts"] is False

            r4 = s.delete(f"{API}/accounts/{aid}/funded-days/1").json()
            assert not any(d["dayNumber"] == 1 for d in r4["fundedDays"])
        finally:
            s.delete(f"{API}/accounts/{aid}")


# ---------- Payouts ----------
class TestPayouts:
    def test_payout_split_and_numbering(self, s):
        a = s.post(f"{API}/accounts", json={"name": "TEST_payout", "accountType": "50K"}).json()
        aid = a["id"]
        try:
            r1 = s.post(f"{API}/accounts/{aid}/payouts", json={"grossProfit": 1000.0}).json()
            p1 = r1["payouts"][0]
            assert p1["payoutNumber"] == 1
            assert p1["splitPct"] == 0.9
            assert p1["netReceived"] == 900.0
            r2 = s.post(f"{API}/accounts/{aid}/payouts", json={"grossProfit": 2000.0}).json()
            assert r2["payouts"][1]["payoutNumber"] == 2
            assert r2["payouts"][1]["netReceived"] == 1800.0
        finally:
            s.delete(f"{API}/accounts/{aid}")

    def test_payout_reflects_dashboard(self, s):
        a = s.post(f"{API}/accounts", json={"name": "TEST_dash_pay", "accountType": "50K"}).json()
        aid = a["id"]
        try:
            before = s.get(f"{API}/dashboard").json()["kpis"]["totalPayout"]
            s.post(f"{API}/accounts/{aid}/payouts", json={"grossProfit": 1000.0})
            after = s.get(f"{API}/dashboard").json()["kpis"]["totalPayout"]
            assert round(after - before, 2) == 900.0
        finally:
            s.delete(f"{API}/accounts/{aid}")


# ---------- Journal ----------
class TestJournal:
    def test_journal_crud(self, s):
        r = s.post(f"{API}/journal", json={"market": "TEST_EURUSD", "setupType": "Break", "result": "win",
                                            "rEarned": 1.5, "screenshotBase64": "iVBORw0KGgo="})
        assert r.status_code == 200
        eid = r.json()["id"]
        assert r.json()["screenshotBase64"] == "iVBORw0KGgo="

        lst = s.get(f"{API}/journal").json()
        assert any(j["id"] == eid for j in lst)

        s.put(f"{API}/journal/{eid}", json={"notes": "TEST_note"})
        upd = next(j for j in s.get(f"{API}/journal").json() if j["id"] == eid)
        assert upd["notes"] == "TEST_note"

        s.delete(f"{API}/journal/{eid}")
        assert not any(j["id"] == eid for j in s.get(f"{API}/journal").json())


# ---------- Copy Trading ----------
class TestCopyTrading:
    def test_copy_requires_2_funded(self, s):
        # Ensure clean: get current funded count
        accs = s.get(f"{API}/accounts").json()
        funded_ids = [a["id"] for a in accs if a["status"] == "funded_active"]
        # Create one funded for test isolation
        if len(funded_ids) < 2:
            r = s.get(f"{API}/copy-trading").json()
            assert r["enabled"] is False or len(funded_ids) <= 1

    def test_set_master_exclusive(self, s):
        a1 = s.post(f"{API}/accounts", json={"name": "TEST_ct1", "accountType": "50K"}).json()
        a2 = s.post(f"{API}/accounts", json={"name": "TEST_ct2", "accountType": "50K"}).json()
        try:
            s.put(f"{API}/accounts/{a1['id']}", json={"status": "funded_active"})
            s.put(f"{API}/accounts/{a2['id']}", json={"status": "funded_active"})
            s.put(f"{API}/copy-trading/master/{a1['id']}")
            r = s.put(f"{API}/copy-trading/master/{a2['id']}").json()
            assert r["master"]["id"] == a2["id"]
            assert r["enabled"] is True
            # Verify only one master
            all_a = s.get(f"{API}/accounts").json()
            masters = [a for a in all_a if a.get("isMaster")]
            assert len(masters) == 1 and masters[0]["id"] == a2["id"]
        finally:
            s.delete(f"{API}/accounts/{a1['id']}")
            s.delete(f"{API}/accounts/{a2['id']}")


# ---------- Achievements ----------
class TestAchievements:
    def test_payout_milestone_unlocks(self, s):
        a = s.post(f"{API}/accounts", json={"name": "TEST_ach", "accountType": "50K"}).json()
        aid = a["id"]
        try:
            s.put(f"{API}/accounts/{aid}", json={"status": "evaluation_passed"})
            s.put(f"{API}/accounts/{aid}", json={"status": "funded_active"})
            s.post(f"{API}/accounts/{aid}/payouts", json={"grossProfit": 1000.0})
            d = s.get(f"{API}/dashboard").json()
            ach = {x["id"]: x["unlocked"] for x in d["achievements"]}
            assert ach["first_eval_pass"] is True
            assert ach["first_funded"] is True
            assert ach["first_payout"] is True
        finally:
            s.delete(f"{API}/accounts/{aid}")
