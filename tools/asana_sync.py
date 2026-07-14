#!/usr/bin/env python3
"""
Asana -> Supabase sync for Workbench.

Claude fetches your incomplete assigned Asana tasks (via the Asana
connection in Claude Code), writes them to tools/asana-payload.json,
then runs:  python tools/asana_sync.py

This script upserts that payload into the `asana_tasks` table using your
Supabase service_role key. The key lives ONLY in tools/.asana-secrets.json
(git-ignored) and is never placed in index.html or committed.

One-time setup — create tools/.asana-secrets.json:
{
  "serviceKey": "<your Supabase service_role key>",
  "userEmail": "nick@illustrata.io"
}
Get the service_role key from: Supabase dashboard -> Project Settings ->
API -> Project API keys -> service_role (secret).
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

SUPABASE_URL = "https://ujogoeyyzxfwnzkhzksn.supabase.co"

HERE = os.path.dirname(os.path.abspath(__file__))
SECRETS_PATH = os.path.join(HERE, ".asana-secrets.json")
DEFAULT_PAYLOAD = os.path.join(HERE, "asana-payload.json")


def die(msg):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(1)


def load_secrets():
    if not os.path.exists(SECRETS_PATH):
        die("missing " + SECRETS_PATH + " - create it with your service_role key (see header of this file).")
    with open(SECRETS_PATH, "r", encoding="utf-8") as f:
        s = json.load(f)
    if not s.get("serviceKey"):
        die("serviceKey missing in .asana-secrets.json")
    if not s.get("userEmail"):
        die("userEmail missing in .asana-secrets.json")
    return s


def api(path, service_key, method="GET", body=None, extra_headers=None):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "apikey": service_key,
        "Authorization": "Bearer " + service_key,
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        die("HTTP %s on %s: %s" % (e.code, path, e.read().decode("utf-8", "replace")))


def resolve_user_id(service_key, email):
    # Admin users list (service_role only). Paginate defensively.
    page = 1
    while page <= 20:
        status, payload = api("/auth/v1/admin/users?per_page=200&page=%d" % page, service_key)
        users = payload.get("users", []) if isinstance(payload, dict) else (payload or [])
        if not users:
            break
        for u in users:
            if (u.get("email") or "").lower() == email.lower():
                return u["id"]
        page += 1
    die("no Supabase auth user found for email " + email + " - create the user in the dashboard first.")


def main():
    payload_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PAYLOAD
    if not os.path.exists(payload_path):
        die("payload file not found: " + payload_path)
    with open(payload_path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    tasks = payload.get("tasks", payload if isinstance(payload, list) else [])
    if not isinstance(tasks, list):
        die("payload must be a list of tasks or an object with a 'tasks' array")

    secrets = load_secrets()
    user_id = resolve_user_id(secrets["serviceKey"], secrets["userEmail"])

    row = {
        "user_id": user_id,
        "data": {"tasks": tasks},
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
    status, _ = api(
        "/rest/v1/asana_tasks?on_conflict=user_id",
        secrets["serviceKey"],
        method="POST",
        body=row,
        extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    print("Synced %d task(s) to asana_tasks for %s (HTTP %s)." % (len(tasks), secrets["userEmail"], status))


if __name__ == "__main__":
    main()
