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

    v_error_code t_error_code := -20000;
    v_error_level log$.t_message_log_level := log$.c_ERROR;
    v_oracle_error_level log$.t_message_log_level := log$.c_FATAL;
    
    c_handler_unit CONSTANT VARCHAR2(4000) := $$PLSQL_UNIT_OWNER || '.' || $$PLSQL_UNIT;
    v_handled_lines t_numbers := t_numbers(82, 158, 163, 168);

    PROCEDURE reset IS
    BEGIN
        v_error_code := -20000;
        v_error_level := log$.c_ERROR;
        v_oracle_error_level := log$.c_FATAL;
    END;

    PROCEDURE set_error_code (
        p_code IN t_error_code
    ) IS
    BEGIN
        v_error_code := p_code;
    END;
    
    FUNCTION get_error_code
    RETURN t_error_code IS
    BEGIN
        RETURN v_error_code;
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

    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
    
        log$.message(v_error_level, p_message, p_arguments, p_service_depth + 1);
    
        -- Handled!
        raise_application_error(
            v_error_code, 
            log$.format_message(v_error_level, p_message, p_arguments)
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
    
    PROCEDURE raise (
        p_service_depth IN NATURALN := 0
    ) IS
    
        v_error_number NUMBER;
    
    BEGIN
    
        IF utl_call_stack.error_depth > 0 THEN
        
            IF NOT handled THEN
                log$.oracle_error(v_oracle_error_level, p_service_depth + 1);
            END IF;
            
            v_error_number := utl_call_stack.error_number(1);
        
            IF v_error_number BETWEEN 20000 AND 20999 THEN
        
                -- Handled!
                raise_application_error(-v_error_number, utl_call_stack.error_msg(1), TRUE);
            
            ELSIF v_error_number = 1403 THEN
                
                -- Handled!
                RAISE NO_DATA_FOUND;
            
            ELSE
            
                -- Handled!
                EXECUTE IMMEDIATE '
                    DECLARE
                        e EXCEPTION;
                        PRAGMA EXCEPTION_INIT(e, -' || v_error_number || ');
                    BEGIN
                        RAISE e;
                    END;
                ';
            
            END IF;
        
        END IF;
    
    END;    

    PROCEDURE handle (
        p_service_depth IN NATURALN := 0
    ) IS
    BEGIN
        
        IF NOT handled THEN
            log$.oracle_error(v_oracle_error_level, p_service_depth + 1);
        END IF;
    
    END;
        
    FUNCTION handled
    RETURN BOOLEAN IS
    BEGIN
    
        IF utl_call_stack.error_depth = 0 THEN
        
            RETURN FALSE;
            
        ELSE
 
            FOR v_i IN 1..LEAST(utl_call_stack.backtrace_depth, 2) LOOP
       
                IF log$.backtrace_unit(v_i) = c_handler_unit 
                   AND utl_call_stack.backtrace_line(v_i) MEMBER OF v_handled_lines 
                THEN
                
                    RETURN TRUE;
                   
                END IF;
                       
            END LOOP;
            
            RETURN FALSE; 
        
        END IF;     
        
    END;

BEGIN
    reset;
END;

