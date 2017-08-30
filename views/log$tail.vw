CREATE OR REPLACE VIEW log$tail AS
SELECT *
FROM TABLE(default_message_handler.tail)