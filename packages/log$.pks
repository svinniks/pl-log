CREATE OR REPLACE PACKAGE log$ IS

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

    c_debug CONSTANT PLS_INTEGER := 250;
    c_info CONSTANT PLS_INTEGER := 500;
    c_warning CONSTANT PLS_INTEGER := 750;
    c_error CONSTANT PLS_INTEGER := 1000;
    
    PROCEDURE set_message_resolver
        (p_message_resolver IN t_log_message_resolver);

    PROCEDURE add_message_handler
        (p_message_handler IN t_log_message_handler);
        
    FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2;

    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL)
    RETURN VARCHAR2;

    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2
        ,p_argument5 IN VARCHAR2)
    RETURN VARCHAR2;
    
    PROCEDURE message
        (p_level IN PLS_INTEGER
        ,p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL);
        
    PROCEDURE debug
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL);
        
    PROCEDURE info
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL);
        
    PROCEDURE warning
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL);
        
    PROCEDURE error
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL);
        
    FUNCTION get_system_log_level
    RETURN PLS_INTEGER;
    
    PROCEDURE set_system_log_level
        (p_level IN PLS_INTEGER);        
        
    FUNCTION get_session_log_level
    RETURN PLS_INTEGER;
    
    PROCEDURE set_session_log_level
        (p_level IN PLS_INTEGER);
    
END;
/
