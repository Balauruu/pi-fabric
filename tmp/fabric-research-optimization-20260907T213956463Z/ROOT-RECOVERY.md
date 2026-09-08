# Root-level recovery

Prior optimizer -> trial executor -> researcher nesting exceeded maxDepth 2. Main now directly owns the optimization loop and launches trial executors at depth 1. Their research leaves run at depth 2. No runtime/config changes are authorized or needed if this probe passes. Prior blocked trials remain excluded from quality and timing comparison. Installed package remains baseline. Use full matched trials only after probe.
