CREATE OR REPLACE PROCEDURE log$init IS
BEGIN

    log$.init_system_log_level(log$.C_INFO);
    
    log$.add_message_resolver(t_default_message_resolver());
    oracle_message_resolver.set_nls_language_mapper(t_iso_language_mapper());
    
    log$.add_message_handler(t_default_message_handler(), 'ENG');
    log$.add_message_handler(t_dbms_output_handler(), 'FRA');
    
    log$.set_default_message_formatter(t_default_message_formatter(':'));
    
END;