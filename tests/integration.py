"""Integration checks against actual API handlers and SQLite.
Run without arguments for the offline D1-interface harness:
    python3 tests/integration.py
Or target a LOCAL built Worker:
    python3 tests/integration.py http://127.0.0.1:8787
Email signup, sign-in, sign-out, and session validation use the real auth handlers.
Google OAuth requires external credentials and is not exercised by this suite.
"""
import sys, json, uuid, subprocess
from pathlib import Path
from urllib.request import Request, build_opener, HTTPCookieProcessor
from urllib.error import HTTPError
from urllib.parse import urlparse, urlencode
from http.cookiejar import CookieJar

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8787"
OFFLINE = len(sys.argv) == 1
worker = subprocess.Popen(["node", str(Path(__file__).with_name("route-harness.mjs"))], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True) if OFFLINE else None
assert urlparse(BASE).hostname in ("127.0.0.1", "localhost"), "Tests may only target a local Worker."
checks = 0
client_count = 0

class Client:
    def __init__(self, identity=None):
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
        self.identity = identity
        global client_count
        client_count += 1
        self.ip = "192.0.2." + str(client_count)
        self.cookies = {}
        self.password = "test-only-long-password-" + uuid.uuid4().hex
        if identity:
            self.req("/api/auth/sign-up/email", "POST", {"email": identity + "@example.com", "password": self.password, "name": "Test " + identity})
    def req(self, path, method="GET", data=None, expected=200, origin=None):
        global checks
        headers = {"Content-Type": "application/json", "cf-connecting-ip": self.ip}
        if method != "GET":
            headers["Origin"] = origin or BASE
        if OFFLINE:
            if self.cookies: headers["Cookie"] = "; ".join(k + "=" + v for k,v in self.cookies.items())
            worker.stdin.write(json.dumps({"path": path, "method": method, "headers": headers, "body": json.dumps(data) if data is not None else None}) + "\n")
            worker.stdin.flush()
            reply = json.loads(worker.stdout.readline())
            assert "fatal" not in reply, reply
            assert reply["status"] == expected, (method, path, reply["status"], expected, reply["body"])
            for cookie in reply.get("cookies", []):
                key, value = cookie.split(";", 1)[0].split("=", 1)
                if value: self.cookies[key] = value
                else: self.cookies.pop(key, None)
            checks += 1
            return json.loads(reply["body"])
        request = Request(BASE+path, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
        try:
            response = self.opener.open(request)
        except HTTPError as error:
            response = error
        body = response.read().decode()
        assert response.status == expected, (method, path, response.status, expected, body[:500])
        checks += 1
        return json.loads(body) if response.headers.get("Content-Type", "").startswith("application/json") else body

def eq(a,b):
    global checks
    assert a == b, (a,b)
    checks += 1

anonymous = Client()
if not OFFLINE: eq("Signal" in anonymous.req("/"), True)
anonymous.req("/api/applications/mine", expected=401)
anonymous.req("/api/organizer/applications", expected=401)
anonymous.req("/api/demo/organizer/applications", expected=401)
anonymous.req("/api/demo", "POST", {}, expected=403, origin="https://foreign.example")

a,b=Client(),Client()
a.req("/api/demo","POST",{},201)
b.req("/api/demo","POST",{},201)
listing=a.req("/api/demo/organizer/applications")
eq(listing["total"],10)
eq(listing["stats"]["secondLook"],2)
eq(listing["stats"]["pending"],5)
eq(a.req("/api/demo/organizer/me")["profile"]["role"],"organizer")
eq(a.req("/api/demo/organizer/applications?"+urlencode({"q":"Maya"}))["total"],1)
eq(a.req("/api/demo/organizer/applications?"+urlencode({"q":"' OR 1=1 --"}))["total"],0)
eq(a.req("/api/demo/organizer/applications?type=mentor")["total"],4)
eq(a.req("/api/demo/organizer/applications?status=accepted")["total"],1)
eq(len(a.req("/api/demo/organizer/applications?page=2")["applications"]),0)

mine=a.req("/api/demo/applications/mine")
app_id=mine["application"]["id"]
b.req("/api/demo/organizer/applications/"+app_id,expected=404)
eq(b.req("/api/demo/applications/mine")["application"]["id"]==app_id,False)
detail=a.req("/api/demo/organizer/applications/"+app_id)
eq(detail["application"]["answers"]["motivation"],"")
answers=mine["application"]["answers"].copy()
a.req("/api/demo/applications/submit","POST",{"answers":answers,"version":0},400)
answers.update(consent=True,motivation="I want to connect physical sensors with a useful software interface for our community.",contribution="I worked with friends to debug a small robotics project and wrote down what helped us solve it.")
saved=a.req("/api/demo/applications/mine","PUT",{"answers":answers,"version":0})
eq(saved["application"]["version"],1)
eq(a.req("/api/demo/applications/mine")["application"]["answers"]["motivation"],answers["motivation"])
a.req("/api/demo/applications/mine","PUT",{"answers":answers,"version":0},409)
submitted=a.req("/api/demo/applications/submit","POST",{"answers":answers,"version":1})
eq(submitted["application"]["status"],"submitted")
eq(len(submitted["events"]),1)
a.req("/api/demo/applications/mine","PUT",{"answers":answers,"version":2},409)
path="/api/demo/organizer/applications/"+app_id
a.req(path+"/decision","POST",{"status":"accepted","note":"Thank you for applying; we are excited to meet you.","version":2},400)
a.req(path+"/review","POST",{"curiosity":6,"craft":3,"collaboration":4,"notes":"Clear evidence of curiosity and collaboration.","expectedUpdatedAt":None},400)
review={"curiosity":5,"craft":4,"collaboration":4,"notes":"Clear evidence of curiosity and collaboration.","expectedUpdatedAt":None}
graded=a.req(path+"/review","POST",review)
eq(graded["application"]["status"],"in_review")
eq(graded["application"]["review_count"],1)
eq(graded["reviews"][0]["total"],13)
a.req(path+"/review","POST",review,409)
own=graded["reviews"][0]
review.update(craft=5,expectedUpdatedAt=own["updated_at"])
graded=a.req(path+"/review","POST",review)
eq(graded["application"]["review_count"],1)
eq(graded["reviews"][0]["total"],14)
a.req(path+"/decision","POST",{"status":"accepted","note":"We look forward to building with you.","version":2},409)
decision=a.req(path+"/decision","POST",{"status":"accepted","note":"We look forward to building with you.","version":graded["application"]["version"]})
eq(decision["application"]["status"],"accepted")
applicant=a.req("/api/demo/applications/mine")
eq(applicant["application"]["status"],"accepted")
eq(applicant["application"]["decision_note"],"We look forward to building with you.")
eq(applicant["application"]["average_score"],None)
eq(any(e["kind"]=="review" for e in applicant["events"]),False)
eq("reviews" in applicant,False)
eq(len(applicant["events"]),2)
a.req(path+"/review","POST",review,409)
b.req("/api/demo/organizer/applications/"+app_id+"/decision","POST",{"status":"rejected","note":"Not authorized.","version":0},404)

mentor=a.req("/api/demo/applications/mine?type=mentor")
eq(mentor["profile"]["role"],"mentor")
ma=mentor["application"]["answers"];ma["consent"]=True;ma["availability"]=""
a.req("/api/demo/applications/submit?type=mentor","POST",{"answers":ma,"version":0},400)
ma["availability"]="4–8 hours"
eq(a.req("/api/demo/applications/submit?type=mentor","POST",{"answers":ma,"version":0})["application"]["type"],"mentor")
second=a.req("/api/demo/organizer/applications?second=1")
eq(second["total"],2)
flag=second["applications"][0]
fd=a.req("/api/demo/organizer/applications/"+flag["id"])
eq(fd["application"]["needs_second_look"],True)
a.req("/api/demo/organizer/applications/"+flag["id"]+"/decision","POST",{"status":"waitlisted","note":"We will revisit your application as places become available.","version":fd["application"]["version"]})
eq(a.req("/api/demo/organizer/applications?second=1")["total"],1)
eq(b.req("/api/demo/organizer/applications?second=1")["total"],2)

# Live-workspace authorization using real email/password sessions.
suffix=uuid.uuid4().hex[:12]
live=Client("applicant-"+suffix)
eq(live.req("/api/me")["profile"]["role"],"unassigned")
live.req("/api/profile","POST",{"name":"Test Applicant","type":"organizer"},400)
live.req("/api/profile","POST",{"name":"Test Applicant","type":"hacker"},201)
live.req("/api/organizer/applications",expected=403)
live.req("/api/profile","POST",{"name":"Changed","type":"mentor"},409)
ownlive=live.req("/api/applications/mine")
eq(ownlive["application"]["type"],"hacker")
other=Client("mentor-"+suffix)
other.req("/api/profile","POST",{"name":"Test Mentor","type":"mentor"},201)
eq(other.req("/api/applications/mine")["application"]["id"]==ownlive["application"]["id"],False)
# Changing a query parameter cannot change a live account's role.
eq(live.req("/api/applications/mine?type=mentor")["profile"]["role"],"hacker")
anonymous.req("/api/organizer/claim","POST",{"code":"signal-local-test-only-code"},401)
if OFFLINE:
    owner = Client("owner")
    eq(owner.req("/api/me")["profile"]["role"], "unassigned")
    owner.req("/api/organizer/applications", expected=403)
    owner.req("/api/organizer/claim", "POST", {"code":"invalid-setup-code"}, 403)
    owner.req("/api/organizer/claim", "POST", {"code":"signal-local-test-only-code"})
    eq(owner.req("/api/me")["profile"]["role"], "organizer")
    owner.req("/api/organizer/applications")
    live_id = ownlive["profile"]["id"]
    live.req("/api/organizer/team", "POST", {"accountId":live_id}, 403)
    owner.req("/api/organizer/team", "POST", {"accountId":live_id}, 409)
    reviewer = Client("reviewer-"+suffix)
    reviewer_id = reviewer.req("/api/me")["profile"]["id"]
    owner.req("/api/organizer/team", "POST", {"accountId":reviewer_id})
    eq(reviewer.req("/api/me")["profile"]["role"], "organizer")
    owner.req("/api/organizer/team", "POST", {"accountId":"user_" + "0"*64}, 404)
    unprivileged = Client("unprivileged-"+suffix)
    unprivileged.req("/api/organizer/claim", "POST", {"code":"signal-local-test-only-code"}, 409)

# Real authentication and session-security regressions.
unauth = Client()
unauth.req("/api/auth/sign-up/email", "POST", {"name":"Short Password", "email":"short@example.com", "password":"short"}, 400)
unauth.req("/api/auth/sign-up/email", "POST", {"name":"Cross Site", "email":"cross@example.com", "password":"long-passphrase-for-tests"}, 403, origin="https://foreign.example")
login = Client()
login.req("/api/auth/sign-in/email", "POST", {"email":live.identity+"@example.com", "password":"wrong-long-password"}, 401)
login.req("/api/auth/sign-in/email", "POST", {"email":live.identity+"@example.com", "password":live.password})
eq(login.req("/api/applications/mine")["application"]["id"], ownlive["application"]["id"])
saved_cookies = login.cookies.copy()
login.req("/api/auth/sign-out", "POST", {})
login.req("/api/me", expected=401)
login.cookies = saved_cookies
login.req("/api/me", expected=401)
# Browser-controlled roles and unsigned cookies do not grant access.
injected = Client()
injected.req("/api/auth/sign-up/email", "POST", {"name":"Injected Role", "email":"injected@example.com", "password":"another-long-password", "role":"organizer"})
eq(injected.req("/api/me")["profile"]["role"], "unassigned")
for key in injected.cookies:
    if "session_token" in key: injected.cookies[key] += "tampered"
injected.req("/api/me", expected=401)

print(f"PASS: {checks} route and data-integrity assertions ({'SQLite harness' if OFFLINE else 'built Worker HTTP'}).")
if worker:
    worker.stdin.close()
    worker.wait(timeout=5)

