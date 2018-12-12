CREATE OR REPLACE PACKAGE BODY dbms_output_handler IS

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
    
    v_log_level log$.t_handler_log_level;
    v_call_stack_level log$.t_handler_log_level := log$.c_ERROR;
    
    v_call_stack_format_options log$.t_call_stack_format_options;
    
    PROCEDURE set_log_level (
        p_level IN log$.t_handler_log_level
    ) IS
    BEGIN
        v_log_level := p_level;
    END;
    
    FUNCTION get_log_level
    RETURN log$.t_handler_log_level IS
    BEGIN
        RETURN v_log_level;
    END;
    
    PROCEDURE set_call_stack_level (
        p_level IN log$.t_handler_log_level
    ) IS
    BEGIN
        v_call_stack_level := p_level;
    END;
    
    FUNCTION get_call_stack_level
    RETURN log$.t_handler_log_level IS
    BEGIN
        RETURN v_call_stack_level;
    END;
    
    PROCEDURE set_argument_notation (
        p_value IN log$.BOOLEANN
    ) IS
    BEGIN
        v_call_stack_format_options.argument_notation := p_value;
    END;
    
    FUNCTION get_argument_notation (
        p_value IN log$.BOOLEANN
    ) 
    RETURN log$.BOOLEANN IS
    BEGIN
        RETURN v_call_stack_format_options.argument_notation;
    END;
    
    PROCEDURE handle_message (
        p_level IN log$.t_message_log_level,
        p_message IN VARCHAR2
    ) IS
    
        v_line log$.STRING;
    
        v_calls log$.t_call_stack;
        v_values log$.t_call_values;
        
        v_unit log$.STRING;
        v_name log$.STRING;
        
    BEGIN
    
        v_line := 
            TO_CHAR(SYSTIMESTAMP, 'hh24:mi:ss.ff3') || ' [' ||
            RPAD(
                CASE p_level
                    WHEN log$.c_DEBUG THEN 'DEBUG'
                    WHEN log$.c_INFO THEN 'INFO'
                    WHEN log$.c_WARNING THEN 'WARNING'
                    WHEN log$.c_ERROR THEN 'ERROR'
                    WHEN log$.c_FATAL THEN 'FATAL'
                    ELSE TO_CHAR(p_level)
                END,
                7
            ) || '] ' ||
            p_message;
        
        IF p_level >= v_call_stack_level THEN
        
            v_line := 
                v_line || CHR(10) ||
                log$.format_call_stack(
                    p_options => v_call_stack_format_options
                );
        
        END IF;
        
        DBMS_OUTPUT.PUT_LINE(v_line);
    
    END;
    
BEGIN
    log$.touch;
    v_call_stack_format_options.first_line_indent := 'at: ';
    v_call_stack_format_options.indent := '    ';
END;