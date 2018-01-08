CREATE OR REPLACE PROCEDURE log$_init IS
BEGIN
    log$.init_system_log_level(log$.C_INFO);
    log$.add_message_resolver(t_default_message_resolver());
    log$.add_message_handler(t_default_message_handler());
END;