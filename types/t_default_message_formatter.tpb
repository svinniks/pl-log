CREATE OR REPLACE TYPE BODY t_default_message_formatter IS

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

    CONSTRUCTOR FUNCTION t_default_message_formatter
    RETURN self AS RESULT IS
    BEGIN
        RETURN;
    END;

    CONSTRUCTOR FUNCTION t_default_message_formatter (
        p_argument_marker IN CHAR
    )
    RETURN self AS RESULT IS
    BEGIN
        argument_marker := p_argument_marker;
        RETURN;
    END;

    OVERRIDING MEMBER FUNCTION format_message (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    )
    RETURN VARCHAR2 IS
        v_message VARCHAR2(32000);
    BEGIN
    
        v_message := p_message;
        
        IF p_arguments IS NOT NULL THEN
            FOR v_i IN REVERSE 1..p_arguments.COUNT LOOP
                v_message := REPLACE(v_message, argument_marker || v_i, p_arguments(v_i));
            END LOOP;
        END IF;
        
        RETURN v_message;
    
    END;
    
END;
