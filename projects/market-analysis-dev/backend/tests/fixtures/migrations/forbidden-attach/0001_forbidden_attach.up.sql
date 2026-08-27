-- Fixture only: migration execution must reject cross-database attachment.
ATTACH DATABASE ':memory:' AS forbidden;
CREATE TABLE forbidden.cross_database_probe (id INTEGER PRIMARY KEY);
