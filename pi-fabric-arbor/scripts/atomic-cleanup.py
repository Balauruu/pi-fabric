#!/usr/bin/python
"""Linux fd-relative cleanup helper. It never follows a manifest pathname symlink."""
import ctypes
import hashlib
import json
import os
import secrets
import stat
import sys

NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
DIRECTORY = getattr(os, "O_DIRECTORY", 0)
RENAME_NOREPLACE = 1
MAX_ENTRIES = 10000
MAX_BYTES = 64 * 1024 * 1024

libc = ctypes.CDLL(None, use_errno=True)
renameat2 = getattr(libc, "renameat2", None)
if renameat2:
    renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renameat2.restype = ctypes.c_int

def emit(status, **extra):
    print(json.dumps({"version": 1, "status": status, **extra}, sort_keys=True, separators=(",", ":")))

def open_directory(name, parent_fd):
    return os.open(name, os.O_RDONLY | DIRECTORY | NOFOLLOW, dir_fd=parent_fd)

def identity(value):
    return {"device": str(value.st_dev), "inode": str(value.st_ino), "mode": value.st_mode & 0o7777, "size": value.st_size}

def stable(before, after):
    return before.st_dev == after.st_dev and before.st_ino == after.st_ino and before.st_mode == after.st_mode and before.st_size == after.st_size and before.st_mtime_ns == after.st_mtime_ns and before.st_ctime_ns == after.st_ctime_ns

def digest_fd(fd):
    h = hashlib.sha256(); os.lseek(fd, 0, os.SEEK_SET)
    while True:
        chunk = os.read(fd, 1024 * 1024)
        if not chunk:
            return h.hexdigest()
        h.update(chunk)

def canonical_directory_digest(root_fd):
    entries = []; total = 0
    def visit(directory_fd, prefix):
        nonlocal total
        before_directory = os.fstat(directory_fd)
        for name in sorted(os.listdir(directory_fd), key=lambda value: value.encode("utf-8")):
            if len(entries) >= MAX_ENTRIES:
                raise ValueError("entry-bound")
            path = f"{prefix}/{name}" if prefix else name
            value = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            if stat.S_ISLNK(value.st_mode):
                raise ValueError("symlink")
            if stat.S_ISDIR(value.st_mode):
                entries.append({"path": path, "type": "directory", "mode": value.st_mode & 0o7777})
                child_fd = open_directory(name, directory_fd)
                try:
                    if not stable(value, os.fstat(child_fd)):
                        raise ValueError("directory-race")
                    visit(child_fd, path)
                finally:
                    os.close(child_fd)
            elif stat.S_ISREG(value.st_mode):
                file_fd = os.open(name, os.O_RDONLY | NOFOLLOW, dir_fd=directory_fd)
                try:
                    opened = os.fstat(file_fd)
                    if not stable(value, opened):
                        raise ValueError("file-race")
                    digest = digest_fd(file_fd); after = os.fstat(file_fd)
                    if not stable(opened, after):
                        raise ValueError("file-mutation")
                    total += opened.st_size
                    if total > MAX_BYTES:
                        raise ValueError("byte-bound")
                    entries.append({"path": path, "type": "file", "mode": opened.st_mode & 0o7777, "digest": digest})
                finally:
                    os.close(file_fd)
            else:
                raise ValueError("special")
        if not stable(before_directory, os.fstat(directory_fd)):
            raise ValueError("directory-mutation")
    visit(root_fd, "")
    entries.sort(key=lambda entry: entry["path"].encode("utf-8"))
    encoded = json.dumps(entries, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()

def restore(parent_fd, name, quarantine_fd, slot):
    if not renameat2:
        return False
    result = renameat2(quarantine_fd, os.fsencode(slot), parent_fd, os.fsencode(name), RENAME_NOREPLACE)
    return result == 0

def erase_directory(directory_fd):
    for name in sorted(os.listdir(directory_fd), key=lambda value: value.encode("utf-8")):
        value = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
        if stat.S_ISDIR(value.st_mode):
            child_fd = open_directory(name, directory_fd)
            try:
                erase_directory(child_fd)
            finally:
                os.close(child_fd)
            os.rmdir(name, dir_fd=directory_fd)
        elif stat.S_ISREG(value.st_mode):
            os.unlink(name, dir_fd=directory_fd)
        else:
            raise ValueError("unsafe-delete-type")

def main():
    try:
        request = json.loads(sys.stdin.read(1024 * 1024))
        required = {"version", "root", "rootIdentity", "cleanupId", "entry"}
        if set(request) != required or request["version"] != 1:
            emit("invalid"); return 2
        root_fd = os.open(request["root"], os.O_RDONLY | DIRECTORY | NOFOLLOW)
        try:
            root_stat = os.fstat(root_fd); root_identity = identity(root_stat)
            if root_identity["device"] != request["rootIdentity"]["device"] or root_identity["inode"] != request["rootIdentity"]["inode"]:
                emit("identity-mismatch"); return 3
            parts = request["entry"]["relativePath"].split("/"); parent_fd = os.dup(root_fd)
            try:
                for part in parts[:-1]:
                    next_fd = open_directory(part, parent_fd); os.close(parent_fd); parent_fd = next_fd
                name = parts[-1]
                try:
                    target_stat = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
                except FileNotFoundError:
                    emit("absent"); return 0
                expected_type = request["entry"]["type"]
                if expected_type == "file" and not stat.S_ISREG(target_stat.st_mode):
                    emit("identity-mismatch"); return 3
                if expected_type == "directory" and not stat.S_ISDIR(target_stat.st_mode):
                    emit("identity-mismatch"); return 3
                if expected_type not in ("file", "directory"):
                    emit("unsupported-atomic-type"); return 4
                try:
                    os.mkdir(".cleanup-quarantine", mode=0o700, dir_fd=root_fd)
                except FileExistsError:
                    pass
                quarantine_fd = open_directory(".cleanup-quarantine", root_fd)
                try:
                    slot = f"{request['cleanupId']}-{secrets.token_hex(16)}"; os.rename(name, slot, src_dir_fd=parent_fd, dst_dir_fd=quarantine_fd)
                    flags = os.O_RDONLY | NOFOLLOW | (DIRECTORY if expected_type == "directory" else 0)
                    moved_fd = os.open(slot, flags, dir_fd=quarantine_fd)
                    try:
                        before = os.fstat(moved_fd); actual_identity = identity(before)
                        actual_digest = digest_fd(moved_fd) if expected_type == "file" else canonical_directory_digest(moved_fd)
                        after = os.fstat(moved_fd); expected = request["entry"]["expectedIdentity"]
                        matches = actual_identity == expected and stable(before, after) and actual_digest == request["entry"]["expectedDigest"]
                        if matches and expected_type == "directory":
                            erase_directory(moved_fd)
                    finally:
                        os.close(moved_fd)
                    if not matches:
                        restored = restore(parent_fd, name, quarantine_fd, slot); emit("identity-mismatch", restored=restored); return 3
                    if expected_type == "directory": os.rmdir(slot, dir_fd=quarantine_fd)
                    else: os.unlink(slot, dir_fd=quarantine_fd)
                    emit("deleted", identity=actual_identity, digest=actual_digest); return 0
                finally:
                    os.close(quarantine_fd)
            finally:
                os.close(parent_fd)
        finally:
            os.close(root_fd)
    except Exception as error:
        emit("indeterminate", error=type(error).__name__); return 5

if __name__ == "__main__":
    raise SystemExit(main())
