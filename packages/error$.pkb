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

    v_error_code PLS_INTEGER := -20000;

    PROCEDURE set_error_code
        (p_code IN PLS_INTEGER) IS
    BEGIN
        v_error_code := p_code;
    END;

    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL) IS
    BEGIN
        log$.error(p_message, p_arguments);
        raise_application_error(v_error_code, log$.format_message(log$.c_ERROR, p_message, p_arguments));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2));
    END;
  
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2
        ,p_argument5 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4, p_argument5));
    END;

END;

