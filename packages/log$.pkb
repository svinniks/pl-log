CREATE OR REPLACE PACKAGE BODY log$ IS

    /* 
        Copyright 2017 Sergejs Vinniks

        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
     
          http://www.apache.org/licenses/LICENSE-2.0

        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
    */

    TYPE t_message_resolvers IS 
        TABLE OF t_log_message_resolver;
        
    TYPE t_resolver_log_levels IS   
        TABLE OF t_resolver_log_level;    
        
    TYPE t_message_formatters IS
        TABLE OF t_log_message_formatter;
        
    v_message_resolvers t_message_resolvers;
    v_resolver_log_levels t_resolver_log_levels;
    v_message_formatters t_message_formatters;

    v_default_message_formatter t_log_message_formatter;
    
    TYPE t_raw_message_handlers IS 
        TABLE OF t_raw_message_handler;
    
    TYPE t_formatted_message_handlers IS
        TABLE OF t_formatted_message_handler;
        
    v_raw_message_handlers t_raw_message_handlers;
    v_formatted_message_handlers t_formatted_message_handlers;
    
    v_session_log_level t_handler_log_level;

    PROCEDURE reset IS
    BEGIN
    
        v_message_resolvers := t_message_resolvers();
        v_resolver_log_levels := t_resolver_log_levels();
        
        v_message_formatters := t_message_formatters();
        v_default_message_formatter := NULL;
        
        v_raw_message_handlers := t_raw_message_handlers();
        v_formatted_message_handlers := t_formatted_message_handlers();
        
        v_session_log_level := NULL;
    
    END;

    PROCEDURE init IS
    BEGIN
    
        reset;
        
        BEGIN
        
            EXECUTE IMMEDIATE 'BEGIN log$init; END;';
        
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    
    END;
    
    PROCEDURE add_resolver (
        p_resolver IN t_log_message_resolver,
        p_level IN t_resolver_log_level,
        p_formatter IN t_log_message_formatter := NULL
    ) IS
    BEGIN
    
        IF p_resolver IS NOT NULL THEN
    
            v_message_resolvers.EXTEND(1);
            v_message_resolvers(v_message_resolvers.COUNT) := p_resolver;
            
            v_resolver_log_levels.EXTEND(1);
            v_resolver_log_levels(v_resolver_log_levels.COUNT) := p_level;
            
            v_message_formatters.EXTEND(1);
            v_message_formatters(v_message_formatters.COUNT) := p_formatter;
            
        END IF;
          
    END;
    
    PROCEDURE set_default_formatter (
        p_formatter IN t_log_message_formatter
    ) IS
    BEGIN
    
        v_default_message_formatter := p_formatter;
    
    END;
    
    PROCEDURE add_resolver (
        p_resolver IN t_log_message_resolver,
        p_formatter IN t_log_message_formatter := NULL
    ) IS
    BEGIN
    
        add_resolver(p_resolver, c_ALL, p_formatter); 
     
    END;
    
    PROCEDURE add_handler (
        p_handler IN t_raw_message_handler
    ) IS
    BEGIN
    
        v_raw_message_handlers.EXTEND(1);
        v_raw_message_handlers(v_raw_message_handlers.COUNT) := p_handler;
    
    END;
    
    PROCEDURE add_handler (
        p_handler IN t_formatted_message_handler
    ) IS
    BEGIN
    
        v_formatted_message_handlers.EXTEND(1);
        v_formatted_message_handlers(v_formatted_message_handlers.COUNT) := p_handler;
    
    END;
    
    FUNCTION format_message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    )
    RETURN VARCHAR2 IS
    
        v_message VARCHAR2(32000);
        v_formatter t_log_message_formatter;
    
    BEGIN
     
        FOR v_i IN 1..v_message_resolvers.COUNT LOOP
        
            IF p_level >= v_resolver_log_levels(v_i) THEN
            
                v_message := v_message_resolvers(v_i).resolve_message(p_message);
                
                IF v_message IS NOT NULL THEN
                    v_formatter := v_message_formatters(v_i);
                    EXIT;
                END IF;
                
            END IF;
        
        END LOOP;
    
        v_message := NVL(v_message, p_message);
    
        IF v_formatter IS NULL THEN
            v_formatter := v_default_message_formatter;
        END IF;
    
        IF v_formatter IS NOT NULL THEN
        
            v_message := v_formatter.format_message(v_message, p_arguments);
            
        ELSE    
        
            IF p_arguments IS NOT NULL AND p_arguments.COUNT > 0 THEN

                IF v_message IS NOT NULL THEN
                    v_message := v_message || ' (';
                ELSE
                    v_message := v_message || '(';
                END IF;
            
                FOR v_i IN 1..p_arguments.COUNT LOOP
                
                    IF v_i > 1 THEN
                        v_message := v_message || ', ';
                    END IF;
                
                    v_message := v_message || p_arguments(v_i);
                
                END LOOP;
                
                v_message := v_message || ')';
            
            END IF;
            
        END IF;
        
        RETURN v_message;
        
    END;

    PROCEDURE message
        (p_level IN t_message_log_level
        ,p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL) IS
        
        v_message VARCHAR2(4000);
        v_message_formatted BOOLEAN;
        
    BEGIN
    
        FOR v_i IN 1..v_raw_message_handlers.COUNT LOOP
        
            IF p_level >= COALESCE(
                v_raw_message_handlers(v_i).get_log_level, 
                get_session_log_level, 
                get_system_log_level,
                c_NONE
            ) THEN
            
                v_raw_message_handlers(v_i).handle_message(p_level, p_message, p_arguments);
                
            END IF;
        
        END LOOP;
    
        v_message_formatted := FALSE;
        
        FOR v_i IN 1..v_formatted_message_handlers.COUNT LOOP
        
            IF p_level >= COALESCE(
                v_formatted_message_handlers(v_i).get_log_level, 
                get_session_log_level, 
                get_system_log_level,
                c_NONE
            ) THEN
            
                IF NOT v_message_formatted THEN
                    v_message := format_message(p_level, p_message, p_arguments);
                    v_message_formatted := TRUE;
                END IF;
              
                v_formatted_message_handlers(v_i).handle_message(p_level, v_message);
                
            END IF;
        
        END LOOP;
    
    END;
        
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    ) IS
    BEGIN
    
        message(c_DEBUG, p_message, p_arguments);
        
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        debug(p_message, t_varchars(p_argument_1));
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        debug(p_message, t_varchars(p_argument_1, p_argument_2));
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        debug(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3));
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        debug(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4));
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    ) IS
    BEGIN
    
        debug(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5));
    
    END;
        
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    ) IS
    BEGIN
    
        message(c_INFO, p_message, p_arguments);
        
    END; 
        
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        info(p_message, t_varchars(p_argument_1));
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        info(p_message, t_varchars(p_argument_1, p_argument_2));
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        info(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3));
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        info(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4));
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    ) IS
    BEGIN
    
        info(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5));
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    ) IS
    BEGIN
    
        message(c_WARNING, p_message, p_arguments);
        
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        warning(p_message, t_varchars(p_argument_1));
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        warning(p_message, t_varchars(p_argument_1, p_argument_2));
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        warning(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3));
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        warning(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4));
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    ) IS
    BEGIN
    
        warning(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5));
    
    END;
        
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    ) IS
    BEGIN
    
        message(c_ERROR, p_message, p_arguments);
        
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        error(p_message, t_varchars(p_argument_1));
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        error(p_message, t_varchars(p_argument_1, p_argument_2));
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        error(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3));
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        error(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4));
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    ) IS
    BEGIN
    
        error(p_message, t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5));
    
    END;
    
    FUNCTION get_system_log_level
    RETURN t_handler_log_level IS
    BEGIN
    
        RETURN SYS_CONTEXT('LOG$CONTEXT', 'LOG_LEVEL'); 
    
    END;
    
    PROCEDURE set_system_log_level (
        p_level IN t_handler_log_level
    ) IS
    BEGIN
    
        DBMS_SESSION.SET_CONTEXT('LOG$CONTEXT', 'LOG_LEVEL', p_level);
    
    END;       
    
    PROCEDURE init_system_log_level (
        p_level IN t_handler_log_level
    ) IS
         
        v_dummy NUMBER;
        
        CURSOR c_context_variable IS
            SELECT 1
            FROM global_context
            WHERE namespace = 'LOG$CONTEXT'
                  AND attribute = 'LOG_LEVEL';
        
    BEGIN
    
        OPEN c_context_variable;
        
        FETCH c_context_variable
        INTO v_dummy;
        
        IF c_context_variable%NOTFOUND THEN
            set_system_log_level(p_level);
        END IF;
        
        CLOSE c_context_variable;
    
    END;
    
    PROCEDURE reset_system_log_level IS
    BEGIN
    
        DBMS_SESSION.CLEAR_CONTEXT('LOG$CONTEXT', NULL, 'LOG_LEVEL');
    
    END;
        
    FUNCTION get_session_log_level
    RETURN t_handler_log_level IS
    BEGIN
    
        RETURN v_session_log_level;
    
    END;
    
    PROCEDURE set_session_log_level (
        p_level IN t_handler_log_level
    ) IS
    BEGIN
    
        v_session_log_level := p_level;
    
    END;
    
BEGIN

    init;    
    
END;

