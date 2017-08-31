CREATE OR REPLACE TYPE t_log_message_handler IS OBJECT (

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
  
    dummy CHAR,
    
    NOT INSTANTIABLE MEMBER FUNCTION get_log_level
    RETURN PLS_INTEGER,

    NOT INSTANTIABLE MEMBER PROCEDURE handle_message
        (p_level IN PLS_INTEGER
        ,p_message IN VARCHAR2
        ,p_call_stack IN VARCHAR2)
    
) NOT INSTANTIABLE NOT FINAL;
/
