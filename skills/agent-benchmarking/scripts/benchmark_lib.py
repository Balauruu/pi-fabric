#!/usr/bin/env python3
"""Deterministic, stdlib-only primitives for benchmark packet helpers."""

from __future__ import annotations

import datetime as _datetime
import errno
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import stat
from typing import Any, Iterable, Iterator, Mapping, MutableSequence, Sequence

EXIT_OK = 0
EXIT_INVALID = 1
EXIT_USAGE = 2
EXIT_IO = 3
DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema"
DETERMINISTIC_SHUFFLE_ALGORITHM = "sha256-counter-fisher-yates-v1"
_PRNG_DOMAIN = b"pi-agent-benchmarking-prng-v1\0"


class BenchmarkError(Exception):
    """Base class for deterministic user-facing failures."""


class InputError(BenchmarkError):
    """Input bytes are unreadable or malformed."""


class DuplicateKeyError(InputError):
    """A JSON object repeats a key."""


class UnsafePathError(BenchmarkError):
    """A path is not a canonical safe relative path."""


class ContractError(BenchmarkError):
    """A document or schema violates its contract."""

    def __init__(self, issues: Sequence[str]):
        self.issues = tuple(issues)
        super().__init__("; ".join(self.issues))


def _reject_constant(value: str) -> None:
    raise InputError(f"non-finite JSON number {value!r} is forbidden")


def _parse_float(value: str) -> float:
    parsed = float(value)
    if not math.isfinite(parsed):
        raise InputError(f"non-finite JSON number {value!r} is forbidden")
    return parsed


def _object_without_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate JSON object key {key!r}")
        result[key] = value
    return result


def parse_json_bytes(data: bytes, source: str = "<bytes>") -> Any:
    """Decode strict UTF-8 and parse strict JSON, rejecting duplicate keys."""
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise InputError(
            f"{source}: malformed UTF-8 at byte {exc.start}"
        ) from None
    try:
        return json.loads(
            text,
            object_pairs_hook=_object_without_duplicates,
            parse_constant=_reject_constant,
            parse_float=_parse_float,
        )
    except DuplicateKeyError as exc:
        raise InputError(f"{source}: {exc}") from None
    except InputError as exc:
        raise InputError(f"{source}: {exc}") from None
    except json.JSONDecodeError as exc:
        raise InputError(
            f"{source}:{exc.lineno}:{exc.colno}: malformed JSON: {exc.msg}"
        ) from None


def read_bytes(path: os.PathLike[str] | str) -> bytes:
    display = os.fspath(path)
    try:
        return Path(path).read_bytes()
    except OSError as exc:
        raise InputError(f"{display}: cannot read: {exc.strerror or exc}") from None


def load_json(path: os.PathLike[str] | str) -> Any:
    return parse_json_bytes(read_bytes(path), os.fspath(path))


def parse_jsonl_bytes(data: bytes, source: str = "<bytes>") -> list[Any]:
    """Parse LF-delimited JSON. Empty lines and CR/CRLF are invalid."""
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise InputError(
            f"{source}: malformed UTF-8 at byte {exc.start}"
        ) from None
    if "\r" in text:
        raise InputError(f"{source}: JSONL must use LF line endings")
    if not text:
        return []
    records: list[Any] = []
    lines = text.split("\n")
    if lines[-1] == "":
        lines.pop()
    for line_number, line in enumerate(lines, 1):
        if not line.strip():
            raise InputError(f"{source}:{line_number}: blank JSONL line")
        records.append(parse_json_bytes(line.encode("utf-8"), f"{source}:{line_number}"))
    return records


def load_jsonl(path: os.PathLike[str] | str) -> list[Any]:
    return parse_jsonl_bytes(read_bytes(path), os.fspath(path))


def iter_jsonl(path: os.PathLike[str] | str) -> Iterator[Any]:
    yield from load_jsonl(path)


def canonical_json_bytes(value: Any) -> bytes:
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
    except (TypeError, ValueError) as exc:
        raise InputError(f"value is not finite JSON: {exc}") from None
    return (text + "\n").encode("utf-8")


def canonical_jsonl_bytes(values: Iterable[Any]) -> bytes:
    return b"".join(canonical_json_bytes(value) for value in values)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: os.PathLike[str] | str) -> str:
    digest = hashlib.sha256()
    try:
        with Path(path).open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    except OSError as exc:
        raise InputError(
            f"{os.fspath(path)}: cannot read: {exc.strerror or exc}"
        ) from None
    return digest.hexdigest()


def safe_relative_path(value: str, field: str = "path") -> str:
    """Return a canonical POSIX relative path or raise UnsafePathError."""
    if not isinstance(value, str):
        raise UnsafePathError(f"{field}: expected a string")
    if not value:
        raise UnsafePathError(f"{field}: empty path is forbidden")
    if value in {".", ".."}:
        raise UnsafePathError(f"{field}: dot paths are forbidden")
    if value.startswith(("/", "~")):
        raise UnsafePathError(f"{field}: absolute or expanded paths are forbidden")
    if "\\" in value:
        raise UnsafePathError(f"{field}: backslashes are forbidden")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise UnsafePathError(f"{field}: control characters are forbidden")
    if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", value):
        raise UnsafePathError(f"{field}: URI or drive prefixes are forbidden")
    path = PurePosixPath(value)
    if any(part in {"", ".", ".."} for part in path.parts):
        raise UnsafePathError(f"{field}: empty, dot, and parent components are forbidden")
    if path.is_absolute() or path.as_posix() != value or "//" in value:
        raise UnsafePathError(f"{field}: path must be canonical POSIX relative form")
    return value


def require_safe_relative_path(value: str, field: str = "path") -> str:
    return safe_relative_path(value, field)


def _path_mode(path: Path) -> int | None:
    try:
        return path.lstat().st_mode
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise InputError(f"{path}: cannot inspect: {exc.strerror or exc}") from None


def _absolute_lexical(path: os.PathLike[str] | str) -> Path:
    return Path(os.path.abspath(os.fspath(path)))


def assert_no_symlink_components(
    path: os.PathLike[str] | str,
    *,
    field: str = "path",
    require_parent: bool = False,
) -> Path:
    """Reject symlinks in every existing component without resolving through them."""
    absolute = _absolute_lexical(path)
    current = Path(absolute.anchor)
    parts = absolute.parts[1:]
    for index, part in enumerate(parts):
        current = current / part
        mode = _path_mode(current)
        if mode is None:
            if require_parent and index < len(parts) - 1:
                raise InputError(f"{field}: parent component {current} does not exist")
            break
        if stat.S_ISLNK(mode):
            raise UnsafePathError(f"{field}: symlink component {current} is forbidden")
        if index < len(parts) - 1 and not stat.S_ISDIR(mode):
            raise InputError(f"{field}: parent component {current} is not a directory")
    return absolute


def safe_join(root: os.PathLike[str] | str, relative: str) -> Path:
    """Join below an existing real directory, rejecting every symlink component."""
    relative = safe_relative_path(relative)
    root_input = assert_no_symlink_components(root, field="root")
    root_mode = _path_mode(root_input)
    if root_mode is None or not stat.S_ISDIR(root_mode):
        raise InputError(f"{root}: root does not exist or is not a directory")
    root_path = root_input.resolve(strict=True)
    candidate = root_path.joinpath(*PurePosixPath(relative).parts)
    assert_no_symlink_components(candidate, field="path")
    return candidate


def preflight_create_outputs(
    paths: Sequence[os.PathLike[str] | str],
) -> tuple[Path, ...]:
    """Validate all create-only destinations before any output is published."""
    if not paths:
        raise InputError("at least one output destination is required")
    destinations = tuple(_absolute_lexical(path) for path in paths)
    rendered = [os.fspath(path) for path in destinations]
    duplicates = sorted({path for path in rendered if rendered.count(path) > 1})
    if duplicates:
        raise InputError(f"output destinations must be different: {', '.join(duplicates)}")
    for destination in destinations:
        assert_no_symlink_components(destination, field=os.fspath(destination), require_parent=True)
        parent_mode = _path_mode(destination.parent)
        if parent_mode is None or not stat.S_ISDIR(parent_mode):
            raise InputError(
                f"{destination.parent}: output parent does not exist or is not a directory"
            )
        if _path_mode(destination) is not None:
            raise InputError(f"{destination}: destination already exists")
    return destinations


def atomic_create_bytes(
    path: os.PathLike[str] | str,
    data: bytes,
    *,
    mode: int = 0o600,
) -> None:
    """Publish complete bytes atomically and fail if the destination exists."""
    destination = preflight_create_outputs((path,))[0]
    parent = destination.parent
    token = secrets.token_hex(12)
    temporary_name = f".{destination.name}.tmp-{os.getpid()}-{token}"
    descriptor: int | None = None
    directory_fd: int | None = None
    try:
        directory_fd = os.open(
            parent,
            os.O_RDONLY
            | getattr(os, "O_DIRECTORY", 0)
            | getattr(os, "O_NOFOLLOW", 0)
            | getattr(os, "O_CLOEXEC", 0),
        )
        descriptor = os.open(
            temporary_name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_CLOEXEC", 0),
            mode,
            dir_fd=directory_fd,
        )
        view = memoryview(data)
        while view:
            written = os.write(descriptor, view)
            if written <= 0:
                raise OSError(errno.EIO, "short write")
            view = view[written:]
        os.fsync(descriptor)
        os.close(descriptor)
        descriptor = None
        try:
            os.link(
                temporary_name,
                destination.name,
                src_dir_fd=directory_fd,
                dst_dir_fd=directory_fd,
                follow_symlinks=False,
            )
        except FileExistsError:
            raise InputError(f"{destination}: destination already exists") from None
        try:
            os.fsync(directory_fd)
        except OSError:
            # The complete file is already published. Some filesystems do not
            # support directory fsync, so this cannot safely be rolled back.
            pass
    except InputError:
        raise
    except OSError as exc:
        raise InputError(
            f"{destination}: create-only write failed: {exc.strerror or exc}"
        ) from None
    finally:
        if descriptor is not None:
            try:
                os.close(descriptor)
            except OSError:
                pass
        if directory_fd is not None:
            try:
                os.unlink(temporary_name, dir_fd=directory_fd)
            except FileNotFoundError:
                pass
            except OSError:
                pass
            try:
                os.close(directory_fd)
            except OSError:
                pass


def atomic_write_bytes(path: os.PathLike[str] | str, data: bytes, *, mode: int = 0o600) -> None:
    """Compatibility name for create-only atomic publication."""
    atomic_create_bytes(path, data, mode=mode)


def atomic_create_json(path: os.PathLike[str] | str, value: Any, *, mode: int = 0o600) -> None:
    atomic_create_bytes(path, canonical_json_bytes(value), mode=mode)


class DeterministicPrng:
    """Stable SHA-256-counter PRNG plus unbiased Fisher-Yates shuffle.

    Version 1 hashes DOMAIN || uint32_be(len(ASCII(seed))) || ASCII(seed) ||
    uint128_be(counter), takes the first unsigned big-endian 64 bits, and uses
    rejection sampling for randbelow. ``shuffle`` walks indexes n-1 through 1.
    These bytes and steps, not a language runtime's random module, define the
    algorithm named by DETERMINISTIC_SHUFFLE_ALGORITHM.
    """

    def __init__(self, seed: int):
        if isinstance(seed, bool) or not isinstance(seed, int):
            raise InputError("seed: expected an integer")
        self._seed = str(seed).encode("ascii")
        self._counter = 0

    def _next_u64(self) -> int:
        if self._counter >= 1 << 128:
            raise ContractError(("deterministic PRNG counter exhausted",))
        payload = (
            _PRNG_DOMAIN
            + len(self._seed).to_bytes(4, "big")
            + self._seed
            + self._counter.to_bytes(16, "big")
        )
        self._counter += 1
        return int.from_bytes(hashlib.sha256(payload).digest()[:8], "big")

    def randbelow(self, bound: int) -> int:
        if isinstance(bound, bool) or not isinstance(bound, int) or not 1 <= bound <= 1 << 64:
            raise InputError("PRNG bound must be an integer from 1 through 2^64")
        limit = (1 << 64) - ((1 << 64) % bound)
        while True:
            value = self._next_u64()
            if value < limit:
                return value % bound

    def shuffle(self, values: MutableSequence[Any]) -> None:
        for index in range(len(values) - 1, 0, -1):
            other = self.randbelow(index + 1)
            values[index], values[other] = values[other], values[index]


def deterministic_shuffle(values: MutableSequence[Any], seed: int) -> None:
    DeterministicPrng(seed).shuffle(values)


def _json_equal(left: Any, right: Any) -> bool:
    if isinstance(left, bool) or isinstance(right, bool):
        return type(left) is type(right) and left == right
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return left == right
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return left.keys() == right.keys() and all(
            _json_equal(left[key], right[key]) for key in left
        )
    if isinstance(left, list):
        return len(left) == len(right) and all(
            _json_equal(a, b) for a, b in zip(left, right)
        )
    return left == right


def _type_matches(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    if expected == "string":
        return isinstance(value, str)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    return False


def _path_child(path: str, key: str | int) -> str:
    if isinstance(key, int):
        return f"{path}[{key}]"
    if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", key):
        return f"{path}.{key}"
    return f"{path}[{json.dumps(key, ensure_ascii=False)}]"


def _resolve_local_ref(root_schema: Mapping[str, Any], reference: str) -> Mapping[str, Any] | bool:
    if not reference.startswith("#/"):
        raise ContractError((f"schema: only local JSON Pointer references are supported: {reference!r}",))
    node: Any = root_schema
    for encoded in reference[2:].split("/"):
        token = encoded.replace("~1", "/").replace("~0", "~")
        if not isinstance(node, dict) or token not in node:
            raise ContractError((f"schema: unresolved reference {reference!r}",))
        node = node[token]
    if not isinstance(node, (dict, bool)):
        raise ContractError((f"schema: reference does not name a schema: {reference!r}",))
    return node


def _validate_format(value: str, format_name: str) -> bool:
    if format_name == "safe-relative-path":
        try:
            safe_relative_path(value)
            return True
        except UnsafePathError:
            return False
    if format_name == "sha256":
        return re.fullmatch(r"[0-9a-f]{64}", value) is not None
    if format_name == "date-time":
        match = re.fullmatch(
            r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})",
            value,
        )
        if not match:
            return False
        try:
            _datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return False
        return True
    return False


def validate_json_schema(instance: Any, schema: Mapping[str, Any] | bool) -> list[str]:
    """Validate the deterministic JSON-Schema subset used by this package."""
    if not isinstance(schema, (dict, bool)):
        raise ContractError(("schema: root must be an object or boolean",))
    root_schema = schema
    issues: list[str] = []

    def visit(value: Any, rule: Mapping[str, Any] | bool, path: str) -> None:
        if rule is True:
            return
        if rule is False:
            issues.append(f"{path}: rejected by false schema")
            return
        if "$ref" in rule:
            target = _resolve_local_ref(root_schema, rule["$ref"])
            visit(value, target, path)

        def branch_matches(subschema: Mapping[str, Any] | bool) -> bool:
            issue_count = len(issues)
            visit(value, subschema, path)
            matched = len(issues) == issue_count
            del issues[issue_count:]
            return matched

        if "allOf" in rule:
            for subschema in rule["allOf"]:
                visit(value, subschema, path)
        if "anyOf" in rule:
            if not any(branch_matches(subschema) for subschema in rule["anyOf"]):
                issues.append(f"{path}: does not satisfy anyOf")
        if "oneOf" in rule:
            matches = sum(branch_matches(subschema) for subschema in rule["oneOf"])
            if matches != 1:
                issues.append(f"{path}: satisfies {matches} oneOf branches, expected exactly 1")
        if "not" in rule and branch_matches(rule["not"]):
            issues.append(f"{path}: satisfies forbidden schema")

        if "const" in rule and not _json_equal(value, rule["const"]):
            issues.append(f"{path}: expected constant {rule['const']!r}")
        if "enum" in rule and not any(_json_equal(value, item) for item in rule["enum"]):
            issues.append(f"{path}: value is not in enum")

        expected = rule.get("type")
        if expected is not None:
            types = [expected] if isinstance(expected, str) else expected
            if not any(_type_matches(value, item) for item in types):
                issues.append(f"{path}: expected type {' or '.join(types)}")
                return

        if isinstance(value, str):
            if "minLength" in rule and len(value) < rule["minLength"]:
                issues.append(f"{path}: shorter than minLength {rule['minLength']}")
            if "maxLength" in rule and len(value) > rule["maxLength"]:
                issues.append(f"{path}: longer than maxLength {rule['maxLength']}")
            if "pattern" in rule and re.search(rule["pattern"], value) is None:
                issues.append(f"{path}: does not match pattern {rule['pattern']!r}")
            if "format" in rule and not _validate_format(value, rule["format"]):
                issues.append(f"{path}: invalid {rule['format']} format")

        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if "minimum" in rule and value < rule["minimum"]:
                issues.append(f"{path}: less than minimum {rule['minimum']}")
            if "maximum" in rule and value > rule["maximum"]:
                issues.append(f"{path}: greater than maximum {rule['maximum']}")
            if "exclusiveMinimum" in rule and value <= rule["exclusiveMinimum"]:
                issues.append(f"{path}: not greater than {rule['exclusiveMinimum']}")
            if "exclusiveMaximum" in rule and value >= rule["exclusiveMaximum"]:
                issues.append(f"{path}: not less than {rule['exclusiveMaximum']}")

        if isinstance(value, list):
            if "minItems" in rule and len(value) < rule["minItems"]:
                issues.append(f"{path}: has fewer than {rule['minItems']} items")
            if "maxItems" in rule and len(value) > rule["maxItems"]:
                issues.append(f"{path}: has more than {rule['maxItems']} items")
            if rule.get("uniqueItems"):
                for index, item in enumerate(value):
                    if any(_json_equal(item, prior) for prior in value[:index]):
                        issues.append(f"{_path_child(path, index)}: duplicate array item")
            item_rule = rule.get("items")
            if item_rule is not None:
                for index, item in enumerate(value):
                    visit(item, item_rule, _path_child(path, index))

        if isinstance(value, dict):
            required = rule.get("required", [])
            for key in sorted(required):
                if key not in value:
                    issues.append(f"{path}: missing required property {key!r}")
            properties = rule.get("properties", {})
            for key in sorted(value):
                child_path = _path_child(path, key)
                if key in properties:
                    visit(value[key], properties[key], child_path)
                elif "additionalProperties" in rule:
                    additional = rule["additionalProperties"]
                    if additional is False:
                        issues.append(f"{child_path}: additional property is forbidden")
                    elif isinstance(additional, dict):
                        visit(value[key], additional, child_path)
            if "minProperties" in rule and len(value) < rule["minProperties"]:
                issues.append(f"{path}: has fewer than {rule['minProperties']} properties")
            if "maxProperties" in rule and len(value) > rule["maxProperties"]:
                issues.append(f"{path}: has more than {rule['maxProperties']} properties")

    visit(instance, schema, "$")
    return issues


_ALLOWED_SCHEMA_KEYWORDS = frozenset(
    {
        "$schema", "$id", "$defs", "$ref", "title", "description", "$comment",
        "type", "const", "enum", "required", "properties", "additionalProperties",
        "items", "minItems", "maxItems", "uniqueItems", "minLength", "maxLength",
        "pattern", "format", "minimum", "maximum", "exclusiveMinimum",
        "exclusiveMaximum", "minProperties", "maxProperties", "allOf", "anyOf",
        "oneOf", "not", "default", "examples",
    }
)
_ALLOWED_TYPES = frozenset({"null", "boolean", "integer", "number", "string", "array", "object"})
_ALLOWED_FORMATS = frozenset({"safe-relative-path", "sha256", "date-time"})


def check_schema(schema: Any, *, machine_contract: bool = False) -> list[str]:
    """Check that a schema uses only the supported, fail-closed subset."""
    issues: list[str] = []
    if not isinstance(schema, dict):
        return ["schema: root must be an object"]
    if schema.get("$schema") != DRAFT_2020_12:
        issues.append(f"schema: $schema must be {DRAFT_2020_12!r}")

    def walk(node: Any, path: str, property_name: str | None = None) -> None:
        if isinstance(node, bool):
            return
        if not isinstance(node, dict):
            issues.append(f"{path}: schema must be an object or boolean")
            return
        for keyword in sorted(node):
            if keyword not in _ALLOWED_SCHEMA_KEYWORDS:
                issues.append(f"{path}: unsupported schema keyword {keyword!r}")
        expected = node.get("type")
        if expected is not None:
            types = [expected] if isinstance(expected, str) else expected
            if not isinstance(types, list) or not types or any(item not in _ALLOWED_TYPES for item in types):
                issues.append(f"{path}: invalid type declaration")
            elif len(set(types)) != len(types):
                issues.append(f"{path}: duplicate type declaration")
        if "pattern" in node:
            try:
                re.compile(node["pattern"])
            except (re.error, TypeError):
                issues.append(f"{path}: invalid regular expression")
        if "format" in node and node["format"] not in _ALLOWED_FORMATS:
            issues.append(f"{path}: unsupported format {node['format']!r}")
        if "$ref" in node:
            try:
                _resolve_local_ref(schema, node["$ref"])
            except ContractError as exc:
                issues.extend(exc.issues)

        if isinstance(expected, str):
            declared_types = [expected]
        elif isinstance(expected, list):
            declared_types = expected
        else:
            declared_types = []
        if "object" in declared_types:
            if "additionalProperties" not in node:
                issues.append(f"{path}: object schema must declare additionalProperties")
            elif property_name == "provider_native":
                if node["additionalProperties"] is not True:
                    issues.append(f"{path}: provider_native must explicitly allow native fields")
            elif node["additionalProperties"] is not False:
                issues.append(f"{path}: only provider_native may allow additional properties")

        properties = node.get("properties", {})
        if not isinstance(properties, dict):
            issues.append(f"{path}.properties: expected object")
        else:
            required = node.get("required", [])
            if "object" in declared_types and not isinstance(required, list):
                issues.append(f"{path}.required: expected array")
            elif "object" in declared_types and (
                any(not isinstance(key, str) for key in required)
                or len(set(required)) != len(required)
            ):
                issues.append(f"{path}.required: expected unique string names")
            elif (
                machine_contract
                and "object" in declared_types
                and properties
                and set(required) != set(properties)
            ):
                issues.append(f"{path}: every declared property must be required")
            for key in sorted(properties):
                walk(properties[key], f"{path}.properties[{key!r}]", key)
        definitions = node.get("$defs", {})
        if not isinstance(definitions, dict):
            issues.append(f"{path}.$defs: expected object")
        else:
            for key in sorted(definitions):
                walk(definitions[key], f"{path}.$defs[{key!r}]")
        if "items" in node:
            walk(node["items"], f"{path}.items")
        if isinstance(node.get("additionalProperties"), dict):
            walk(node["additionalProperties"], f"{path}.additionalProperties")
        for group in ("allOf", "anyOf", "oneOf"):
            if group in node:
                if not isinstance(node[group], list) or not node[group]:
                    issues.append(f"{path}.{group}: expected non-empty array")
                else:
                    for index, child in enumerate(node[group]):
                        walk(child, f"{path}.{group}[{index}]")
        if "not" in node:
            walk(node["not"], f"{path}.not")

    walk(schema, "schema")
    if machine_contract:
        required = schema.get("required")
        version_schema = schema.get("properties", {}).get("schema_version")
        if not isinstance(required, list) or "schema_version" not in required:
            issues.append("schema: machine contract must require schema_version")
        if version_schema != {"const": 1}:
            issues.append("schema: schema_version must be exactly {\"const\": 1}")
    return issues


def validate_or_raise(
    instance: Any,
    schema: Mapping[str, Any] | bool,
    source: str = "document",
) -> None:
    """Validate one document against the supported strict JSON-schema subset."""
    issues = validate_json_schema(instance, schema)
    if issues:
        raise ContractError(tuple(f"{source}: {issue}" for issue in issues))


def load_and_validate_json(
    document_path: os.PathLike[str] | str,
    schema_path: os.PathLike[str] | str,
) -> Any:
    schema = load_json(schema_path)
    schema_issues = check_schema(schema)
    if schema_issues:
        raise ContractError(tuple(f"{os.fspath(schema_path)}: {issue}" for issue in schema_issues))
    document = load_json(document_path)
    validate_or_raise(document, schema, os.fspath(document_path))
    return document
