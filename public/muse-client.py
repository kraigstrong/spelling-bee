#!/usr/bin/env python3
"""Small dependency-free Streamable HTTP MCP client for Muse's VM.

Set SPELLING_MCP_URL and SPELLING_AGENT_KEY in the environment (never in the URL).
python3 muse-client.py schema
python3 muse-client.py validate --lesson lesson.json
python3 muse-client.py create --lesson lesson.json
python3 muse-client.py results --id UUID
python3 muse-client.py replace --id UUID --lesson lesson.json
"""
import argparse
import json
import os
import sys
import subprocess
import urllib.request
import urllib.error


class MCP:
    def __init__(self):
        self.url = os.environ.get("SPELLING_MCP_URL", "")
        self.key = os.environ.get("SPELLING_AGENT_KEY", "")
        reference = os.environ.get("SPELLING_AGENT_KEY_REF", "")
        if reference and not self.key:
            result = subprocess.run(["op", "read", reference], text=True, capture_output=True)
            if result.returncode:
                raise ValueError("Could not read the authorized token through 1Password. Check the CLI session and secret reference.")
            self.key = result.stdout.strip()
        if not self.url or not self.key:
            raise ValueError("Set SPELLING_MCP_URL and SPELLING_AGENT_KEY in the environment.")
        if not self.url.startswith("https://") and not self.url.startswith("http://localhost:") and not self.url.startswith("http://127.0.0.1:"):
            raise ValueError("Use HTTPS for a remote MCP endpoint.")
        self.session = None
        self.protocol = None
        self.counter = 0

    def request(self, method, params=None, notification=False):
        self.counter += 1
        payload = {"jsonrpc": "2.0", "method": method}
        if not notification:
            payload["id"] = self.counter
        if params is not None:
            payload["params"] = params
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream", "Authorization": "Bearer " + self.key}
        if self.session:
            headers["Mcp-Session-Id"] = self.session
        if self.protocol:
            headers["MCP-Protocol-Version"] = self.protocol
        req = urllib.request.Request(self.url, data=json.dumps(payload).encode(), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                self.session = response.headers.get("Mcp-Session-Id", self.session)
                content_type = response.headers.get("Content-Type", "")
                if response.status == 202:
                    return None
                if "text/event-stream" in content_type:
                    data_lines = []
                    result = None
                    for raw in response:
                        line = raw.decode().rstrip("\r\n")
                        if line.startswith("data:"):
                            data_lines.append(line[5:].lstrip())
                        elif not line and data_lines:
                            message = json.loads("\n".join(data_lines))
                            data_lines = []
                            if message.get("id") == payload.get("id"):
                                result = message
                                break
                    if result is None:
                        raise ValueError("No JSON-RPC response was received.")
                else:
                    body = response.read()
                    if not body:
                        return None
                    result = json.loads(body)
        except urllib.error.HTTPError as error:
            raise ValueError("MCP request failed with HTTP %s. Check the endpoint and access token." % error.code) from None
        if "error" in result:
            raise ValueError(json.dumps(result["error"]))
        return result.get("result")

    def initialize(self):
        result = self.request("initialize", {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "muse-spelling-client", "version": "0.1.0"}})
        self.protocol = result["protocolVersion"]
        self.request("notifications/initialized", notification=True)

    def call(self, name, arguments):
        result = self.request("tools/call", {"name": name, "arguments": arguments})
        text = "\n".join(block["text"] for block in result.get("content", []) if block.get("type") == "text")
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = {"message": text}
        print(json.dumps(parsed, indent=2))
        return 1 if result.get("isError") else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["tools", "schema", "validate", "create", "replace", "results"])
    parser.add_argument("--lesson", help="Path to the agent-authored lesson JSON")
    parser.add_argument("--id", help="Lesson UUID returned by create")
    args = parser.parse_args()
    names = {"schema": "get_lesson_schema", "validate": "validate_lesson", "create": "create_lesson", "replace": "replace_lesson", "results": "get_results"}
    arguments = {}
    if args.command in ("validate", "create", "replace"):
        if not args.lesson:
            parser.error("--lesson is required")
        with open(args.lesson, encoding="utf-8") as file:
            arguments["lesson"] = json.load(file)
    if args.command in ("replace", "results"):
        if not args.id:
            parser.error("--id is required")
        arguments["lessonId"] = args.id
    client = MCP()
    client.initialize()
    if args.command == "tools":
        print(json.dumps(client.request("tools/list", {}), indent=2))
        return 0
    return client.call(names[args.command], arguments)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError) as error:
        print("Error: " + str(error), file=sys.stderr)
        sys.exit(1)
