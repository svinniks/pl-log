CREATE OR REPLACE PACKAGE BODY error$ IS

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

    v_default_error_code log$.t_application_error_code := 20000;
    v_error_level log$.t_message_log_level := log$.c_ERROR;
    v_oracle_error_level log$.t_message_log_level := log$.c_FATAL;
    
    c_handler_unit CONSTANT VARCHAR2(4000) := $$PLSQL_UNIT_OWNER || '.' || $$PLSQL_UNIT;
    v_handled_lines t_numbers := t_numbers(133, 244, 249, 254, 322);
    
    v_display_language log$.STRING;
    
    PROCEDURE reset IS
    BEGIN
        v_default_error_code := 20000;
        v_error_level := log$.c_ERROR;
        v_oracle_error_level := log$.c_FATAL;
    END;

    PROCEDURE set_default_error_code (
        p_code IN log$.t_application_error_code
    ) IS
    BEGIN
        v_default_error_code := p_code;
    END;
    
    FUNCTION get_default_error_code
    RETURN log$.t_application_error_code IS
    BEGIN
        RETURN v_default_error_code;
    END;
    
    PROCEDURE set_error_level (
        p_level IN log$.t_message_log_level
    ) IS
    BEGIN
        v_error_level := p_level;
    END;
    
    FUNCTION get_error_level
    RETURN log$.t_message_log_level IS
    BEGIN
        RETURN v_error_level;
    END;
    
    PROCEDURE set_oracle_error_level (
        p_level IN log$.t_message_log_level
    ) IS
    BEGIN
        v_oracle_error_level := p_level;
    END;
    
    FUNCTION get_oracle_error_level
    RETURN log$.t_message_log_level IS
    BEGIN
        RETURN v_oracle_error_level;
    END;
    
    PROCEDURE set_display_language (
        p_language IN VARCHAR2
    ) IS
    BEGIN
        v_display_language := p_language;
    END;
    
    FUNCTION get_display_language
    RETURN VARCHAR2 IS
    BEGIN
        RETURN v_display_language;
    END;
    
    FUNCTION format_message (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    )
    RETURN VARCHAR2 IS
    
        v_message log$.STRING;
    
    BEGIN
    
        v_message := log$.get_cached_message(v_display_language);
        
        IF v_message IS NULL THEN
        
            v_message := log$.format_message(
                v_error_level,
                p_message,
                p_arguments,
                v_display_language
            );
                
        END IF;
        
        RETURN v_message;
    
    END;
    
    PROCEDURE raise (
        p_code IN log$.t_application_error_code,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars,
        p_service_depth IN NATURALN
    ) IS
    
        v_message log$.STRING;
    
    BEGIN
    
        log$.message(
            v_error_level,
            p_message,
            p_arguments,
            p_service_depth => p_service_depth + 1
        );
    
        -- Handled!
        raise_application_error(
            -p_code, 
            format_message(p_message, p_arguments)
        );
         
    END;
    
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
    
        error$.raise(
            v_default_error_code, 
            p_message, 
            p_arguments, 
            p_service_depth + 1
        );
        
    END;
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2
    ) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1), 1);
    END;
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2
    ) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2), 1);
    END;
  
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2,
        p_argument3 IN VARCHAR2
    ) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3), 1);
    END;
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2,
        p_argument3 IN VARCHAR2,
        p_argument4 IN VARCHAR2
    ) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4), 1);
    END;
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2,
        p_argument3 IN VARCHAR2,
        p_argument4 IN VARCHAR2,
        p_argument5 IN VARCHAR2
    ) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4, p_argument5), 1);
    END;
    
    FUNCTION get_error_message (
        p_depth IN PLS_INTEGER
    )
    RETURN VARCHAR2 IS
    
        v_message log$.STRING;
        
    BEGIN
    
        v_message := utl_call_stack.error_msg(p_depth);
        
        $IF DBMS_DB_VERSION.VERSION = 12 AND DBMS_DB_VERSION.RELEASE = 1 $THEN
            v_message := SUBSTR(v_message, 1, LENGTH(v_message) - 1);
        $END
        
        RETURN v_message;
        
    END;
    
    PROCEDURE raise (
        p_service_depth IN NATURALN := 0
    ) IS
    
        v_code PLS_INTEGER;
        v_message log$.STRING;
        
    BEGIN
    
        IF utl_call_stack.error_depth > 0 THEN
        
            handle(TRUE, p_service_depth + 1);
        
            v_code := utl_call_stack.error_number(1);
            v_message := get_error_message(1);
                        
            IF v_code BETWEEN 20000 AND 20999 THEN
        
                -- Handled!
                raise_application_error(-v_code, v_message, TRUE);
            
            ELSIF v_code = 1403 THEN
                
                -- Handled!
                RAISE NO_DATA_FOUND;
            
            ELSE
            
                -- Handled!
                EXECUTE IMMEDIATE '
                    DECLARE
                        e EXCEPTION;
                        PRAGMA EXCEPTION_INIT(e, -' || v_code || ');
                    BEGIN
                        RAISE e;
                    END;
                ';
            
            END IF;
        
        END IF;
    
    END;    

    FUNCTION handled
    RETURN BOOLEAN IS
    BEGIN
    
        IF utl_call_stack.error_depth = 0 THEN
        
            RETURN NULL;
            
        ELSE
    
            $IF DBMS_DB_VERSION.VERSION = 12 AND DBMS_DB_VERSION.RELEASE = 1 $THEN
                FOR v_i IN REVERSE utl_call_stack.backtrace_depth - LEAST(utl_call_stack.backtrace_depth, 2) + 1..utl_call_stack.backtrace_depth LOOP
            $ELSE
                FOR v_i IN 1..LEAST(utl_call_stack.backtrace_depth, 2) LOOP
            $END 

                IF log$.backtrace_unit(v_i) = c_handler_unit 
                   AND utl_call_stack.backtrace_line(v_i) MEMBER OF v_handled_lines 
                THEN
                
                    RETURN TRUE;
                   
                END IF;
                       
            END LOOP;
            
            RETURN FALSE; 
        
        END IF;     
        
    END;

    PROCEDURE handle (
        p_raise_mapped_error IN log$.BOOLEANN := FALSE,
        p_service_depth IN NATURALN := 0
    ) IS
    
        v_mapped_code PLS_INTEGER;
        v_mapped_message log$.STRING;
        
    BEGIN
        
        IF NOT handled THEN
        
            log$.oracle_error(
                v_oracle_error_level, 
                p_service_depth + 1, 
                v_mapped_code, 
                v_mapped_message
            );
            
            IF v_mapped_code IS NOT NULL AND p_raise_mapped_error THEN
                
                raise_application_error(
                    -v_mapped_code,
                    format_message(
                        v_mapped_message,
                        t_varchars(
                            utl_call_stack.error_number(1),
                            get_error_message(1)
                        )
                    )
                );
                    
            END IF; 
            
        END IF;
    
    END;
    
BEGIN
    reset;
END;

