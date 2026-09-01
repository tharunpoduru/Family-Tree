#!/usr/bin/env bash
# Verifies the DEPLOYED security rules (PRD R5 acceptance criterion) by
# attacking the real project with a real throwaway account.
#
# Creates one temporary auth user and (briefly) one pending membership,
# then deletes both. Never reads, writes, or deletes any person, union,
# or photo belonging to the family.
set -uo pipefail

# Web config comes from app/.env (copy app/.env.example and fill it in).
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
KEY=$(sed -n 's/^VITE_FIREBASE_API_KEY=//p' "$ENV_FILE" 2>/dev/null)
PROJ=$(sed -n 's/^VITE_FIREBASE_PROJECT_ID=//p' "$ENV_FILE" 2>/dev/null)
if [ -z "$KEY" ] || [ -z "$PROJ" ]; then
  echo "Missing app/.env (or empty VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID)."
  exit 1
fi
DOCS="https://firestore.googleapis.com/v1/projects/$PROJ/databases/(default)/documents"
EMAIL="rulescheck-throwaway@example.com"
PW="Trp!9x2Qz#7vLm4"

pass=0; fail=0

expect_denied() {
  local label="$1"; shift
  local code; code=$("$@")
  if [ "$code" = "403" ] || [ "$code" = "401" ]; then
    echo "  ✓ pass  $label — denied ($code)"; pass=$((pass+1))
  else
    echo "  ✗ FAIL  $label — got HTTP $code, expected denial"; fail=$((fail+1))
  fi
}

get() { curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$DOCS/$1"; }
patch_doc() {
  curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" -d "$2" "$DOCS/$1"
}

# ——— sign in (creating the account if needed) ———
RESP=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"returnSecureToken\":true}")
if ! echo "$RESP" | grep -q idToken; then
  RESP=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"returnSecureToken\":true}")
fi
TOKEN=$(echo "$RESP" | sed -n 's/.*"idToken": "\([^"]*\)".*/\1/p')
UID_=$(echo "$RESP" | sed -n 's/.*"localId": "\([^"]*\)".*/\1/p')
[ -z "$TOKEN" ] && { echo "could not obtain a token"; exit 1; }
echo "Throwaway account: $UID_"

echo
echo "Signed in, NO membership record:"
expect_denied "read a person"            get "people/p-anyone"
expect_denied "list every person"        get "people"
expect_denied "list every union"         get "unions"
expect_denied "list the membership roll" get "users"
expect_denied "list suggestions"         get "suggestions"
expect_denied "write a person" patch_doc "people/p-intruder" '{"fields":{"name":{"mapValue":{"fields":{"en":{"stringValue":"Intruder"}}}}}}'
expect_denied "self-approve as admin" patch_doc "users/$UID_" '{"fields":{"status":{"stringValue":"approved"},"role":{"stringValue":"admin"}}}'

# ——— now give it a PENDING membership: the doorstep case ———
npx tsx scripts/rules-fixture.mts create "$UID_" >/dev/null 2>&1
echo
echo "Signed in, request PENDING (the doorstep):"
expect_denied "read a person"     get "people/p-anyone"
expect_denied "list every person" get "people"
expect_denied "list every union"  get "unions"
expect_denied "approve itself"        patch_doc "users/$UID_?updateMask.fieldPaths=status" '{"fields":{"status":{"stringValue":"approved"}}}'
expect_denied "promote itself to admin" patch_doc "users/$UID_?updateMask.fieldPaths=role" '{"fields":{"role":{"stringValue":"admin"}}}'

echo
echo "Unauthenticated (no token at all):"
NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" "$DOCS/people")
if [ "$NOAUTH" = "403" ]; then echo "  ✓ pass  public read of people — denied (403)"; pass=$((pass+1));
else echo "  ✗ FAIL  public read of people — HTTP $NOAUTH"; fail=$((fail+1)); fi

npx tsx scripts/rules-fixture.mts destroy "$UID_" >/dev/null 2>&1
echo
echo "Temporary account and membership removed."
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
