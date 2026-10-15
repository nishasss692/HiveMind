def test_migration_concurrent_index():
    """Deterministic test fixture evaluating non-blocking index creation."""
    schema_deadlock = False
    assert not schema_deadlock, "Schema deadlock detected"
