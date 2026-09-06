# PR1 actions

The installed Pi extension exposes only:

```text
/arbor availability
/arbor assets
```

The standalone CLI exposes only:

```text
pi-fabric-arbor availability
pi-fabric-arbor assets
pi-fabric-arbor asset <asset-id>
pi-fabric-arbor inspect --file <existing-file>
pi-fabric-arbor replay --file <existing-jsonl>
pi-fabric-arbor artifact --root <root> --path <relative-path>
```

These operations read package metadata or existing files. There is no live-owner attachment, setup, doctor, start, pause, resume, cancel, steer, review, keep/discard, apply/undo, cleanup, authorization, certification, Web server, or export generation in PR1.
