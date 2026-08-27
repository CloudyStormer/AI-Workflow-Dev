-- Fixture only: the first statement must roll back with the invalid second statement.
CREATE TABLE must_not_survive_failed_up (id INTEGER PRIMARY KEY);
THIS IS NOT VALID SQL;
