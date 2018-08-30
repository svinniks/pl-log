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
    
    PRAGMA RESTRICT_REFERENCES(DEFAULT, RNDS, WNDS, RNPS, WNPS, TRUST);
    
    c_SESSION_SERIAL# CONSTANT NUMBER := DBMS_DEBUG_JDWP.CURRENT_SESSION_SERIAL;
    
    SUBTYPE BOOLEANN IS 
        BOOLEAN 
            NOT NULL;
    
    SUBTYPE NUMBERN IS
        NUMBER NOT NULL;
 
    c_STRING_LENGTH CONSTANT PLS_INTEGER := 32767;

    SUBTYPE t_formatted_call_stack_length IS
        PLS_INTEGER
            RANGE 3..32767
            NOT NULL;

    SUBTYPE STRING IS 
        VARCHAR2(32767);
        
    SUBTYPE STRINGN IS 
        STRING 
            NOT NULL;
    
    SUBTYPE t_message_log_level IS 
        PLS_INTEGER 
            RANGE 1..600
            NOT NULL;
    
    c_DEBUG CONSTANT t_message_log_level := 100;
    c_INFO CONSTANT t_message_log_level := 200;
    c_WARNING CONSTANT t_message_log_level := 300;
    c_ERROR CONSTANT t_message_log_level := 400;
    c_FATAL CONSTANT t_message_log_level := 500;
            
    SUBTYPE t_resolver_log_level IS 
        PLS_INTEGER 
            RANGE 0..600
            NOT NULL;            

    c_ALL CONSTANT t_resolver_log_level := 0;
    
    SUBTYPE t_handler_log_level IS 
        PLS_INTEGER 
            RANGE 0..601;            

    c_NONE CONSTANT t_handler_log_level := 601;
    
    SUBTYPE t_application_error_code IS
        PLS_INTEGER
            RANGE 20000..20999
            NOT NULL;
    
    TYPE t_call_entry IS
        RECORD (
            id NUMBER(30),
            unit STRING,
            line PLS_INTEGER,
            first_tracked_line PLS_INTEGER
        );
        
    TYPE t_call_stack IS
        TABLE OF t_call_entry;
    
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
     
    TYPE t_call_stack_format_options IS
        RECORD (
            first_line_indent STRING,
            indent STRING,
            argument_notation BOOLEANN := FALSE
        );
        
    /* Initilalization methods */
    
    PROCEDURE reset;
    
    PROCEDURE init;
    
    /* Resolver and handler management */
    
    PROCEDURE add_message_resolver (
        p_resolver IN t_log_message_resolver,
        p_level IN t_resolver_log_level := c_ALL,
        p_formatter IN t_log_message_formatter := NULL
    );
    
    PROCEDURE set_default_message_formatter (
        p_formatter IN t_log_message_formatter
    );

    PROCEDURE add_message_handler (
        p_handler IN t_raw_message_handler
    );

    PROCEDURE add_message_handler (
        p_handler IN t_formatted_message_handler,
        p_language IN VARCHAR2 := NULL
    );
    
    PROCEDURE set_default_language (
        p_language IN VARCHAR2
    );
    
    FUNCTION get_default_language
    RETURN VARCHAR2;
    
    PROCEDURE add_oracle_error_mapper (
        p_mapper IN t_oracle_error_mapper
    );
    
    /* System log level management */
    
    PROCEDURE reset_system_log_level;
    
    PROCEDURE init_system_log_level (
        p_level IN t_handler_log_level
    );
    
    PROCEDURE set_system_log_level (
        p_level IN t_handler_log_level
    );
    
    FUNCTION get_system_log_level
    RETURN t_handler_log_level;
    
    /* Session log level management */
        
    FUNCTION get_session_log_level (
        p_session_serial# IN NUMBERN := c_SESSION_SERIAL#
    )        
    RETURN t_handler_log_level;
        
    PROCEDURE set_session_log_level (
        p_level IN t_handler_log_level,
        p_session_serial# IN NUMBERN := c_SESSION_SERIAL#
    );
    
    /* Call stack management */ 
    
    PROCEDURE reset_call_stack;
    
    $IF $$test $THEN 
        PROCEDURE fill_call_stack (
            p_service_depth IN NATURALN,
            p_reset_top IN BOOLEAN,
            p_track_top IN BOOLEAN
        );
    $END
    
    PROCEDURE call (
        p_id OUT NUMBER,
        p_service_depth IN NATURALN := 0
    );
    
    FUNCTION call (
        p_service_depth IN NATURALN := 0
    )
    RETURN t_call;
    
    PROCEDURE call (
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE param (
        p_call_id IN NUMBER,
        p_name IN STRINGN,
        p_value IN VARCHAR2,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE param (
        p_call_id IN NUMBER,
        p_name IN STRINGN,
        p_value IN NUMBER,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE param (
        p_call_id IN NUMBER,
        p_name IN STRINGN,
        p_value IN BOOLEAN,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE param (
        p_call_id IN NUMBER,
        p_name IN STRINGN,
        p_value IN DATE,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN VARCHAR2,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN NUMBER,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN BOOLEAN,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE value (
        p_name IN STRINGN,
        p_value IN DATE,
        p_service_depth IN NATURALN := 0
    );
    
    FUNCTION backtrace_unit (
        p_depth IN POSITIVEN
    )
    RETURN VARCHAR2;
    
    $IF $$test $THEN
        PROCEDURE fill_error_stack (
            p_service_depth IN NATURAL
        );
    $END
    
    PROCEDURE get_call_stack (
        p_calls OUT t_call_stack,
        p_values OUT t_call_values 
    );
    
    FUNCTION format_call_stack (
        p_length IN t_formatted_call_stack_length := c_STRING_LENGTH,
        p_options IN t_call_stack_format_options := NULL
    )
    RETURN VARCHAR2;
    
    /* Generic log message methods */
    
    FUNCTION format_message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_language IN VARCHAR2 := NULL
    )
    RETURN VARCHAR2;
    
    FUNCTION get_cached_message (
        p_language IN VARCHAR2
    )
    RETURN VARCHAR2;
        
    PROCEDURE message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_service_depth IN NATURALN := 0
    );
    
    PROCEDURE oracle_error (
        p_level IN t_message_log_level,
        p_service_depth IN NATURALN,
        p_mapped_code OUT PLS_INTEGER,
        p_mapped_message OUT VARCHAR2
    );
    
    PROCEDURE oracle_error (
        p_level IN t_message_log_level := c_FATAL,
        p_service_depth IN NATURALN := 0
    );
    
    /* Shortcut message methods */
        
    PROCEDURE debug (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
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
        p_arguments IN t_varchars := NULL
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
        p_arguments IN t_varchars := NULL
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
        p_arguments IN t_varchars := NULL
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
    
    PROCEDURE fatal (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    );
    
    PROCEDURE fatal (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2
    );
    
    PROCEDURE fatal (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2
    );
    
    PROCEDURE fatal (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2
    );
    
    PROCEDURE fatal (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2
    );
    
    PROCEDURE fatal (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        p_argument_2 IN VARCHAR2,
        p_argument_3 IN VARCHAR2,
        p_argument_4 IN VARCHAR2,
        p_argument_5 IN VARCHAR2
    );
    
END;

