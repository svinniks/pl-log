CREATE OR REPLACE PACKAGE dbms_output_handler IS

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
    
    PROCEDURE set_log_level (
        p_level IN log$.t_handler_log_level
    );
    
    FUNCTION get_log_level
    RETURN log$.t_handler_log_level;
    
    PROCEDURE set_call_stack_level (
        p_level IN log$.t_handler_log_level
    );
    
    FUNCTION get_call_stack_level
    RETURN log$.t_handler_log_level;
    
    PROCEDURE set_argument_notation (
        p_value IN log$.BOOLEANN
    );
    
    FUNCTION get_argument_notation (
        p_value IN log$.BOOLEANN
    ) 
    RETURN log$.BOOLEANN;
    
    PROCEDURE handle_message (
        p_level IN log$.t_message_log_level,
        p_message IN VARCHAR2
    );
    
END;