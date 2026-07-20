DO $$
DECLARE
  application_tables text;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ')
  INTO application_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> 'schema_migrations';

  IF application_tables IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || application_tables ||
      ' RESTART IDENTITY CASCADE';
  END IF;
END
$$;
