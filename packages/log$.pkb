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
    
    v_call_id NUMBER(30);    
    v_call_stack t_call_stack;
    
    v_call_values t_call_values;   

    /* Initialization methods */

    PROCEDURE reset IS
    BEGIN
    
        v_message_resolvers := t_message_resolvers();
        v_resolver_log_levels := t_resolver_log_levels();
        
        v_message_formatters := t_message_formatters();
        v_default_message_formatter := NULL;
        
        v_raw_message_handlers := t_raw_message_handlers();
        v_formatted_message_handlers := t_formatted_message_handlers();
        
        v_session_log_level := NULL;
        
        v_call_id := 0;
        v_call_stack := t_call_stack();
        v_call_values := t_call_values();
    
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
    
    /* Resolver and handler management */
    
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
    
    /* Call stack management */
    
    FUNCTION call_stack_unit (
        p_depth IN PLS_INTEGER
    )
    RETURN VARCHAR2 IS
        v_unit STRING;
    BEGIN
    
        v_unit := utl_call_stack.owner(p_depth + 1);
        
        IF v_unit IS NULL THEN
            RETURN utl_call_stack.concatenate_subprogram(utl_call_stack.subprogram(p_depth + 1));
        ELSE
            RETURN v_unit || '.' || utl_call_stack.concatenate_subprogram(utl_call_stack.subprogram(p_depth + 1));
        END IF;
    
    END;
    
    PROCEDURE call (
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    ) IS
    
        v_dynamic_depth PLS_INTEGER;
        v_actual_height PLS_INTEGER;
    
        v_matching_height PLS_INTEGER;
        
        v_depth PLS_INTEGER;
        v_actual_call t_call;
        v_stack_call t_call;
        
    BEGIN
    
        v_matching_height := 0;
    
        v_dynamic_depth := utl_call_stack.dynamic_depth;
        v_actual_height := v_dynamic_depth - p_service_depth - 1; 
        
        FOR v_height IN 1..LEAST(v_call_stack.COUNT, v_actual_height) LOOP
            
            v_depth := v_dynamic_depth - v_height + 1;
        
            v_actual_call.unit := call_stack_unit(v_depth);
            v_actual_call.line := utl_call_stack.unit_line(v_depth);
            
            v_stack_call := v_call_stack(v_height);
            
            EXIT WHEN v_actual_call.unit != v_stack_call.unit;
            EXIT WHEN v_height = v_actual_height 
                      AND v_actual_call.line <= v_stack_call.first_line
                      AND NVL(p_reset_top, FALSE);
                    
            IF v_stack_call.line != v_actual_call.line THEN 
                                   
                v_stack_call.line := v_actual_call.line;
                v_call_stack(v_height) := v_stack_call;
                    
                v_matching_height := v_height;
                EXIT;
                    
            END IF;

            v_matching_height := v_height;
            
        END LOOP;
        
        v_call_stack.TRIM(v_call_stack.COUNT - v_matching_height);
        v_call_values.TRIM(v_call_values.COUNT - v_matching_height);
        
        FOR v_height IN v_call_stack.COUNT + 1..v_actual_height LOOP 
        
            v_depth := v_dynamic_depth - v_height + 1;
        
            v_actual_call.unit := call_stack_unit(v_depth);
            v_actual_call.line := utl_call_stack.unit_line(v_depth);
            v_actual_call.first_line := v_actual_call.line;
        
            v_call_id := v_call_id + 1;
            v_actual_call.id := v_call_id;
            
            v_call_stack.EXTEND(1);
            v_call_stack(v_call_stack.COUNT) := v_actual_call;
            
            v_call_values.EXTEND(1);
        
        END LOOP;
    
    END;
    
    PROCEDURE call (
        p_service_depth IN NATURALN
    ) IS
    BEGIN
        call(TRUE, p_service_depth + 1);
    END;
    
    PROCEDURE value (
        p_name IN VARCHAR2,
        p_type IN VARCHAR2,
        p_reset_top IN BOOLEAN,
        p_service_depth IN PLS_INTEGER,
        p_varchar2_value IN VARCHAR2 := NULL,
        p_number_value IN NUMBER := NULL,
        p_boolean_value IN BOOLEAN := NULL,
        p_date_value IN DATE := NULL
    ) IS
        v_value t_value;
    BEGIN
    
        call(p_reset_top, p_service_depth + 1);
        
        IF v_call_values.COUNT > 0 THEN
        
            v_value.type := p_type;
            v_value.varchar2_value := p_varchar2_value;
            v_value.number_value := p_number_value;
            v_value.boolean_value := p_boolean_value;
            v_value.date_value := p_date_value;
        
            v_call_values(v_call_values.COUNT)(p_name) := v_value;
            
        END IF;
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN VARCHAR2,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
    
        value(
            p_name, 
            'VARCHAR2', 
            p_reset_top, 
            p_service_depth + 1,
            p_varchar2_value => p_value
        );
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN VARCHAR2,
        p_service_depth IN NATURALN 
    ) IS
    BEGIN
    
        value(
            p_name, 
            'VARCHAR2', 
            TRUE, 
            p_service_depth + 1,
            p_varchar2_value => p_value
        );
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN NUMBER,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
    
        value(
            p_name, 
            'NUMBER', 
            p_reset_top, 
            p_service_depth + 1,
            p_number_value => p_value
        );
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN NUMBER,
        p_service_depth IN NATURALN 
    ) IS
    BEGIN
    
        value(
            p_name, 
            'NUMBER', 
            TRUE, 
            p_service_depth + 1,
            p_number_value => p_value
        );
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN BOOLEAN,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
    
        value(
            p_name, 
            'BOOLEAN', 
            p_reset_top, 
            p_service_depth + 1,
            p_boolean_value => p_value
        );
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN BOOLEAN,
        p_service_depth IN NATURALN 
    ) IS
    BEGIN
    
        value(
            p_name, 
            'BOOLEAN', 
            TRUE, 
            p_service_depth + 1,
            p_boolean_value => p_value
        );
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN DATE,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
    
        value(
            p_name, 
            'DATE', 
            p_reset_top, 
            p_service_depth + 1,
            p_date_value => p_value
        );
    
    END;
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN DATE,
        p_service_depth IN NATURALN 
    ) IS
    BEGIN
    
        value(
            p_name, 
            'DATE', 
            TRUE, 
            p_service_depth + 1,
            p_date_value => p_value
        );
    
    END;
    
    PROCEDURE do_fill_error_stack (
        p_service_depth IN NATURAL
    ) IS
    
        v_dynamic_depth PLS_INTEGER;
        v_actual_height PLS_INTEGER;
        
        v_matching_height PLS_INTEGER;
        
        v_depth PLS_INTEGER;
        v_actual_call t_call;
        v_stack_call t_call;
        
        e_bad_depth_indicator EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_bad_depth_indicator, -64610);
        
        v_backtrace_unit VARCHAR2(4000);
        v_backtrace_depth PLS_INTEGER;
        
        v_call t_call;
    
    BEGIN
    
        v_matching_height := 0;
    
        v_dynamic_depth := utl_call_stack.dynamic_depth;
        v_actual_height := v_dynamic_depth - NVL(p_service_depth, 0) - 1;
    
        FOR v_height IN 1..LEAST(v_call_stack.COUNT, v_actual_height) LOOP
            
            v_depth := v_dynamic_depth - v_height + 1;
        
            v_actual_call.unit := call_stack_unit(v_depth);
            v_actual_call.line := utl_call_stack.unit_line(v_depth);
            
            v_stack_call := v_call_stack(v_height);
            
            EXIT WHEN v_actual_call.unit != v_stack_call.unit
                      OR v_actual_call.line != v_stack_call.line;

            v_matching_height := v_height;
            
        END LOOP;
        
        IF v_matching_height < v_actual_height - 1 THEN
            call(p_service_depth + 1);
            v_matching_height := v_call_stack.COUNT - 1;
        END IF;
        
        v_backtrace_depth := utl_call_stack.backtrace_depth;
        v_matching_height := v_matching_height + 1;
        
        WHILE v_backtrace_depth >= 1 AND v_matching_height <= v_call_stack.COUNT LOOP

            BEGIN
                v_backtrace_unit := utl_call_stack.backtrace_unit(v_backtrace_depth);
            EXCEPTION
                WHEN e_bad_depth_indicator THEN
                    v_backtrace_unit := '__anonymous_block';
            END;
        
            IF v_call_stack(v_matching_height).unit = v_backtrace_unit
               OR v_call_stack(v_matching_height).unit LIKE v_backtrace_unit || '.%' 
            THEN
            
                IF v_call_stack(v_matching_height).line != utl_call_stack.backtrace_line(v_backtrace_depth) THEN
                
                    v_call_stack(v_matching_height).line := utl_call_stack.backtrace_line(v_backtrace_depth);
                    v_call_stack(v_matching_height).first_line := LEAST(v_call_stack(v_matching_height).first_line, v_call_stack(v_matching_height).line);
                
                    v_backtrace_depth := v_backtrace_depth - 1;
                    v_matching_height := v_matching_height + 1;
                
                    EXIT;
                    
                END IF;
                
            ELSE
            
                EXIT;
                
            END IF;
            
            v_backtrace_depth := v_backtrace_depth - 1;
            v_matching_height := v_matching_height + 1;
            
        END LOOP; 
        
        IF v_matching_height <= v_call_stack.COUNT THEN
            v_call_stack.TRIM(v_call_stack.COUNT - v_matching_height + 1);
            v_call_values.TRIM(v_call_values.COUNT - v_matching_height + 1);
        END IF;
        
        WHILE v_backtrace_depth >= 1 LOOP
        
            BEGIN
                v_backtrace_unit := utl_call_stack.backtrace_unit(v_backtrace_depth);
            EXCEPTION
                WHEN e_bad_depth_indicator THEN
                    v_backtrace_unit := '__anonymous_block';
            END;
            
            v_call_id := v_call_id + 1;
            v_call.id := v_call_id;
            
            v_call.unit := v_backtrace_unit;
            v_call.line := utl_call_stack.backtrace_line(v_backtrace_depth);
            v_call.first_line := v_call.line;
            
            v_call_stack.EXTEND(1);
            v_call_stack(v_call_stack.COUNT) := v_call;
            
            v_call_values.EXTEND(1);
            
            v_backtrace_depth := v_backtrace_depth - 1;
        
        END LOOP;
    
    END;
    
    PROCEDURE fill_error_stack (
        p_service_depth IN NATURAL := 0
    ) IS
    BEGIN
        IF utl_call_stack.error_depth > 0 THEN
            do_fill_error_stack(p_service_depth + 1);
        END IF;
    END;
    
    PROCEDURE get_call_stack (
        p_calls OUT t_call_stack,
        p_values OUT t_call_values
    ) IS
    BEGIN
        p_calls := v_call_stack;
        p_values := v_call_values;
    END;
    
    FUNCTION format_call_stack (
        p_length IN t_string_length := c_STRING_LENGTH,
        p_first_line_indent IN VARCHAR2 := NULL,
        p_indent IN VARCHAR2 := NULL
    )
    RETURN VARCHAR2 IS
    
        v_formatted_call_stack STRING;
        e_length_exceeded EXCEPTION;
        
        v_name STRING;
        
        PROCEDURE put (
            p_text IN VARCHAR2
        ) IS
        BEGIN
        
            IF NVL(LENGTH(v_formatted_call_stack), 0) + NVL(LENGTH(p_text), 0) + 3 > p_length THEN
                v_formatted_call_stack := v_formatted_call_stack || '...';
                RAISE e_length_exceeded;
            END IF;
            
            v_formatted_call_stack := v_formatted_call_stack || p_text;
        
        END;
        
        PROCEDURE put_line (
            p_text IN VARCHAR2 := NULL
        ) IS
        BEGIN
            put(p_text);
            put(CHR(10));
        END;
    
    BEGIN
    
        FOR v_i IN REVERSE 1..v_call_stack.COUNT LOOP

            IF v_i = v_call_stack.COUNT THEN
                put(p_first_line_indent);
            ELSE
                put(p_indent);
            END IF;
                
            put_line(v_call_stack(v_i).unit || ' (line ' || v_call_stack(v_i).line || ')');
                
            v_name := v_call_values(v_i).FIRST;
                
            WHILE v_name IS NOT NULL LOOP
                
                put(p_indent);
                put('    ');
                put(v_name);
                put(': ');
                    
                CASE v_call_values(v_i)(v_name).type
                    
                    WHEN 'VARCHAR2' THEN
                        
                        IF v_call_values(v_i)(v_name).varchar2_value IS NULL THEN
                            put_line('NULL');
                        ELSE
                            put('''');
                            put(REPLACE(v_call_values(v_i)(v_name).varchar2_value, '''', ''''''));
                            put_line('''');
                        END IF;
                            
                    WHEN 'NUMBER' THEN
                        
                        IF v_call_values(v_i)(v_name).number_value IS NULL THEN
                            put_line('NULL');
                        ELSE
                            put_line(TO_CHAR(v_call_values(v_i)(v_name).number_value, 'TM', 'NLS_NUMERIC_CHARACTERS=''.,'''));
                        END IF;
                            
                    WHEN 'BOOLEAN' THEN
                        
                        IF v_call_values(v_i)(v_name).boolean_value IS NULL THEN
                            put_line('NULL');
                        ELSIF v_call_values(v_i)(v_name).boolean_value IS NULL THEN
                            put_line('TRUE');
                        ELSE
                            put_line('FALSE');
                        END IF;
                            
                    WHEN 'DATE' THEN
                        
                        IF v_call_values(v_i)(v_name).date_value IS NULL THEN
                            put_line('NULL');
                        ELSE
                            put_line('TIMESTAMP ''' || TO_CHAR(v_call_values(v_i)(v_name).date_value, 'YYYY-MM-DD HH24:MI:SS') || '''');
                        END IF;
                        
                    ELSE
                            
                        put_line;
                            
                END CASE;
                
                v_name := v_call_values(v_i).NEXT(v_name);
                
            END LOOP;
            
        END LOOP;
        
        RETURN v_formatted_call_stack;
    
    EXCEPTION
        WHEN e_length_exceeded THEN
            RETURN v_formatted_call_stack;
    END;
    
    /* Generic log message methods */
    
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

    PROCEDURE message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_service_depth IN NATURALN := 0
    ) IS
        
        v_call_stack_updated BOOLEAN;
    
        v_message VARCHAR2(4000);
        v_message_formatted BOOLEAN;
        
    BEGIN
    
        v_call_stack_updated := FALSE;
    
        FOR v_i IN 1..v_raw_message_handlers.COUNT LOOP
        
            IF p_level >= COALESCE(
                v_raw_message_handlers(v_i).get_log_level, 
                get_session_log_level, 
                get_system_log_level,
                c_NONE
            ) THEN
            
                IF NOT v_call_stack_updated THEN
                    call(TRUE, p_service_depth + 1);
                    v_call_stack_updated := TRUE;
                END IF;
            
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
                
                IF NOT v_call_stack_updated THEN
                    call(TRUE, p_service_depth + 1);
                    v_call_stack_updated := TRUE;
                END IF;
              
                v_formatted_message_handlers(v_i).handle_message(p_level, v_message);
                
            END IF;
        
        END LOOP;
    
    END;
    
    PROCEDURE message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_service_depth IN NATURALN
    ) IS
    BEGIN
        message(p_level, p_message, NULL, p_service_depth + 1);
    END;
    
    PROCEDURE oracle_error (
        p_level IN t_message_log_level := c_ERROR,
        p_service_depth IN NATURALN
    ) IS
    BEGIN
    
        IF utl_call_stack.error_depth > 0 THEN
    
            do_fill_error_stack(p_service_depth + 1);
            
            FOR v_i IN 1..v_formatted_message_handlers.COUNT LOOP
            
                IF p_level >= COALESCE(
                    v_formatted_message_handlers(v_i).get_log_level, 
                    get_session_log_level, 
                    get_system_log_level,
                    c_NONE
                ) THEN
                
                    v_formatted_message_handlers(v_i).handle_message(
                        p_level, 
                        'ORA-' || utl_call_stack.error_number(1) || ': ' || utl_call_stack.error_msg(1) 
                    );
                    
                END IF;
            
            END LOOP;
            
        END IF;
    
    END;
    
    PROCEDURE oracle_error (
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
        oracle_error(c_ERROR, p_service_depth + 1);
    END;
    
    /* Shortcut message methods */
        
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    ) IS
    BEGIN
    
        message(c_DEBUG, p_message, p_arguments, 1);
        
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_DEBUG,
            p_message, 
            NULL,
            1
        );
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_DEBUG,
            p_message, 
            t_varchars(p_argument_1),
            1
        );
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_DEBUG,
            p_message, 
            t_varchars(p_argument_1, p_argument_2),
            1
        );
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_DEBUG,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3),
            1
        );
    
    END;
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_DEBUG,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4),
            1
        );
    
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
    
        message(
            c_DEBUG,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5),
            1
        );
    
    END;
        
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    ) IS
    BEGIN
    
        message(c_INFO, p_message, p_arguments, 1);
        
    END; 
    
    PROCEDURE info (
        p_message IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_INFO,
            p_message, 
            NULL,
            1
        );
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_INFO,
            p_message, 
            t_varchars(p_argument_1),
            1
        );
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_INFO,
            p_message, 
            t_varchars(p_argument_1, p_argument_2),
            1
        );
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_INFO,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3),
            1
        );
    
    END;
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_INFO,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4),
            1
        );
    
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
    
        message(
            c_INFO,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5),
            1
        );
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    ) IS
    BEGIN
    
        message(c_WARNING, p_message, p_arguments, 1);
        
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_WARNING,
            p_message, 
            NULL,
            1
        );
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_WARNING,
            p_message, 
            t_varchars(p_argument_1),
            1
        );
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_WARNING,
            p_message, 
            t_varchars(p_argument_1, p_argument_2),
            1
        );
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_WARNING,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3),
            1
        );
    
    END;
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_WARNING,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4),
            1
        );
    
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
    
        message(
            c_WARNING,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5),
            1
        );
    
    END;
        
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    ) IS
    BEGIN
    
        message(c_ERROR, p_message, p_arguments, 1);
        
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_ERROR,
            p_message, 
            NULL,
            1
        );
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_ERROR,
            p_message, 
            t_varchars(p_argument_1),
            1
        );
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_ERROR,
            p_message, 
            t_varchars(p_argument_1, p_argument_2),
            1
        );
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_ERROR,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3),
            1
        );
    
    END;
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    ) IS
    BEGIN
    
        message(
            c_ERROR,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4),
            1
        );
    
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
    
        message(
            c_ERROR,
            p_message, 
            t_varchars(p_argument_1, p_argument_2, p_argument_3, p_argument_4, p_argument_5),
            1
        );
    
    END;
    
BEGIN

    init;    
    
END;

