CREATE OR REPLACE TYPE BODY t_default_message_handler IS

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

    OVERRIDING FINAL MEMBER PROCEDURE handle_message
        (p_level IN PLS_INTEGER
        ,p_message IN VARCHAR2
        ,p_call_stack IN VARCHAR2) IS
    BEGIN
    
        default_message_handler.add_message(p_level, p_message, p_call_stack);
    
    END;

END;
/
