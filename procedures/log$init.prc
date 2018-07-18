CREATE OR REPLACE PROCEDURE log$init IS
BEGIN

    log$.init_system_log_level(log$.C_INFO);
    
    log$.add_resolver(t_default_message_resolver());
    
    log$.add_handler(t_default_message_handler());
    log$.add_handler(t_dbms_output_handler());
    
    log$.set_default_formatter(t_default_message_formatter(':'));
    
END;