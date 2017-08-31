CREATE OR REPLACE PACKAGE default_message_handler IS

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
    
    FUNCTION get_log_level
    RETURN PLS_INTEGER;
    
    PROCEDURE set_log_level
        (p_level IN PLS_INTEGER);
    
    PROCEDURE reset;
    
    PROCEDURE create_message
        (p_log_level IN PLS_INTEGER
        ,p_message_text IN VARCHAR2
        ,p_call_stack IN VARCHAR2);
    
END;