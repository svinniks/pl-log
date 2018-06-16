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
    
    PROCEDURE handle_message (
        p_level IN log$.t_message_log_level,
        p_message IN VARCHAR2
    ) IS
    BEGIN
    
        DBMS_OUTPUT.PUT_LINE(
            TO_CHAR(SYSTIMESTAMP, 'hh24:mi:ss.ff3') || ' [' ||
            RPAD(
                CASE p_level
                    WHEN log$.c_DEBUG THEN 'DEBUG'
                    WHEN log$.c_INFO THEN 'INFO'
                    WHEN log$.c_WARNING THEN 'WARNING'
                    WHEN log$.c_ERROR THEN 'ERROR'
                    ELSE TO_CHAR(p_level)
                END,
                7
            ) || '] ' ||
            p_message
        );
    
    END;
    
END;