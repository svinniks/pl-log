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
 
    SUBTYPE STRING IS VARCHAR2(32767);
    SUBTYPE STRINGN IS STRING NOT NULL;

    SUBTYPE t_message_log_level IS 
        PLS_INTEGER 
            RANGE 1..1000
            NOT NULL;
    
    c_DEBUG CONSTANT t_message_log_level := 200;
    c_INFO CONSTANT t_message_log_level := 400;
    c_WARNING CONSTANT t_message_log_level := 600;
    c_ERROR CONSTANT t_message_log_level := 800;
            
    SUBTYPE t_resolver_log_level IS 
        PLS_INTEGER 
            RANGE 0..1000
            NOT NULL;            

    c_ALL CONSTANT t_resolver_log_level := 0;
    
    SUBTYPE t_handler_log_level IS 
        PLS_INTEGER 
            RANGE 0..1001;            

    c_NONE CONSTANT t_handler_log_level := 1001;

    TYPE t_call IS
        RECORD (
            id NUMBER(30),
            owner VARCHAR2(30),
            unit STRING,
            line PLS_INTEGER,
            first_line PLS_INTEGER
        );
        
    TYPE t_call_stack IS
        TABLE OF t_call;
    
    TYPE t_value IS
        RECORD (
            type VARCHAR2(9),
            varchar2_value STRING,
            number_value NUMBER,
            boolean_value BOOLEAN,
            date_value DATE
        );
    
    TYPE t_values IS
        TABLE OF t_value
        INDEX BY STRING;
    
    TYPE t_call_values IS
        TABLE OF t_values;
    
    /* Initilalization methods */
    
    PROCEDURE reset;
    
    PROCEDURE init;
    
    /* Resolver and handler management */
    
    PROCEDURE add_resolver (
        p_resolver IN t_log_message_resolver,
        p_formatter IN t_log_message_formatter := NULL
    );
    
    PROCEDURE add_resolver (
        p_resolver IN t_log_message_resolver,
        p_level IN t_resolver_log_level,
        p_formatter IN t_log_message_formatter := NULL
    );
    
    PROCEDURE set_default_formatter (
        p_formatter IN t_log_message_formatter
    );

    PROCEDURE add_handler (
        p_handler IN t_raw_message_handler
    );
    
    PROCEDURE add_handler (
        p_handler IN t_formatted_message_handler
    );
    
    /* Log level management */
    
    FUNCTION get_system_log_level
    RETURN t_handler_log_level;
    
    PROCEDURE set_system_log_level (
        p_level IN t_handler_log_level
    );  
        
    PROCEDURE init_system_log_level (
        p_level IN t_handler_log_level
    );      
    
    PROCEDURE reset_system_log_level;
        
    FUNCTION get_session_log_level
    RETURN t_handler_log_level;
    
    PROCEDURE set_session_log_level (
        p_level IN t_handler_log_level
    );
    
    /* Call stack management */ 
     
    PROCEDURE call (
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE call (
        p_service_depth IN NATURALN
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN VARCHAR2,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN VARCHAR2,
        p_service_depth IN NATURALN
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN NUMBER,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN NUMBER,
        p_service_depth IN NATURALN
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN BOOLEAN,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN BOOLEAN,
        p_service_depth IN NATURALN
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN DATE,
        p_reset_top IN BOOLEAN := TRUE,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN DATE,
        p_service_depth IN NATURALN
    );
    
    PROCEDURE fill_error_stack (
        p_service_depth IN NATURAL := 0
    );
    
    PROCEDURE get_call_stack (
        p_calls OUT t_call_stack,
        p_values OUT t_call_values 
    );
    
    /* Generic log message methods */
    
    FUNCTION format_message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    )
    RETURN VARCHAR2;
    
    PROCEDURE message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_service_depth IN NATURALN
    ); 
    
    PROCEDURE oracle_error (
        p_level IN t_message_log_level := c_ERROR
    );
    
    /* Shortcut message methods */
        
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    );
    
    PROCEDURE debug (
        p_message IN VARCHAR2
    );
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    );
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    );
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    );
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    );
    
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    );
        
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    );
    
    PROCEDURE info (
        p_message IN VARCHAR2
    );
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    );
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    );
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    );
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    );
    
    PROCEDURE info (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    );
        
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    );
    
    PROCEDURE warning (
        p_message IN VARCHAR2
    );
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    );
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    );
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    );
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    );
    
    PROCEDURE warning (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    );
      
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    );
    
    PROCEDURE error (
        p_message IN VARCHAR2
    );
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    );
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    );
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    );
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    );
    
    PROCEDURE error (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    );
    
END;

