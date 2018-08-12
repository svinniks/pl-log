CREATE OR REPLACE PACKAGE error$ IS

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

    PROCEDURE reset;

    PROCEDURE set_error_code (
        p_code IN log$.t_application_error_code
    );
    
    FUNCTION get_error_code
    RETURN log$.t_application_error_code;
    
    PROCEDURE set_error_level (
        p_level IN log$.t_message_log_level
    );
    
    FUNCTION get_error_level
    RETURN log$.t_message_log_level;
    
    PROCEDURE set_oracle_error_level (
        p_level IN log$.t_message_log_level
    );
    
    FUNCTION get_oracle_error_level
    RETURN log$.t_message_log_level;

    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_service_depth IN NATURALN := 0
    );
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2
    );
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2
    );
  
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2,
        p_argument3 IN VARCHAR2
    );
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2,
        p_argument3 IN VARCHAR2,
        p_argument4 IN VARCHAR2
    );
        
    PROCEDURE raise (
        p_message IN VARCHAR2,
        p_argument1 IN VARCHAR2,
        p_argument2 IN VARCHAR2,
        p_argument3 IN VARCHAR2,
        p_argument4 IN VARCHAR2,
        p_argument5 IN VARCHAR2
    );
        
    PROCEDURE raise (
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE handle (
        p_service_depth IN NATURALN := 0
    );    
        
    FUNCTION handled
    RETURN BOOLEAN;
    
END;

