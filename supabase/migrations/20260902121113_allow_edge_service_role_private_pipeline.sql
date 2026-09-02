grant usage on schema awenture_private to service_role;
grant select, insert, update on all tables in schema awenture_private to service_role;
alter default privileges for role postgres in schema awenture_private grant select, insert, update on tables to service_role;
alter role authenticator set pgrst.db_schemas = 'public,storage,graphql_public,awenture_private';
notify pgrst, 'reload config';
