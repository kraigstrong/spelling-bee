#!/usr/bin/env python3
"""Send the authorized app token from 1Password to Vercel production.

No secret appears in process arguments, output, or files.
Set SPELLING_AGENT_KEY_REF to override the default reference.
"""
import os
import subprocess
import sys

reference = os.environ.get("SPELLING_AGENT_KEY_REF", "op://Private/Spelling Quest MCP/password")
secret = subprocess.run(["op", "read", reference], text=True, capture_output=True)
if secret.returncode:
    print("1Password could not read the app token. Check the CLI desktop connection and item reference.", file=sys.stderr)
    sys.exit(1)
value = secret.stdout.strip()
if len(value) < 32:
    print("The MCP token must contain at least 32 characters.", file=sys.stderr)
    sys.exit(1)
result = subprocess.run(["npx", "--yes", "vercel", "env", "add", "AGENT_KEY", "production"], input=value, text=True, capture_output=True)
if result.returncode:
    print("Vercel could not add AGENT_KEY. Check project linking and whether the setting already exists.", file=sys.stderr)
    sys.exit(1)
print("Configured the linked Vercel project's production MCP token through 1Password.")
