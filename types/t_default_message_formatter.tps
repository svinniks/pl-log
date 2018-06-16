CREATE OR REPLACE TYPE t_default_message_formatter UNDER t_log_message_formatter (

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
  
    argument_marker CHAR,

    CONSTRUCTOR FUNCTION t_default_message_formatter
    RETURN self AS RESULT,

    CONSTRUCTOR FUNCTION t_default_message_formatter (
        p_argument_marker IN CHAR
    )
    RETURN self AS RESULT,

    OVERRIDING MEMBER FUNCTION format_message (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    )
    RETURN VARCHAR2
    
)
