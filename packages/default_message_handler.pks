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
    
    /**
    
    Default message handler (T_DEFAULT_MESSAGE_HANDLER) implementation package, 
    which stores messages in a FIFO organized array of a configurable maximal capacity.
        
    Additionally, there is a view LOG$TAIL, based on the pipelined function
    TAIL, which returns the list of most recent log records, with the last record on the top.
    
    There can be only one default message handler, because of the singleton pattern being used -
    all data is stored in a set of package global variables. If multiple instances of
    T_DEFAULT_MESSAGE_HANDLER are configured for LOG$, each message will appear in LOG$TAIL 
    as many times as handler instances there are!
            
    @change 14.11.2017 S.Vinniks Initial release.
        
    */
    
    -- Log record being stored
    TYPE t_log_record IS RECORD
        (log_date TIMESTAMP
        ,log_level NUMBER
        ,log_level_name VARCHAR2(30)
        ,message_text VARCHAR2(32000)
        ,call_stack VARCHAR2(32000));
        
    -- This collection type is neceaasry only for PIPELINED finction definition 
    TYPE t_log_records IS TABLE OF t_log_record;
    
    /**
    
    Returns current log level for the default message handler.
    
    Log level, just as any other data structure, is stored as a package global variable,
    therefore all default message handler instances will get the same value.
    
    This function is called from the corresponding method of the T_DEFAULT_MESSAGE_HANDLER
    object type.
    
    */
    FUNCTION get_log_level
    RETURN PLS_INTEGER;
    
    /**
    
    Sets current log level for all T_DEFAULT_MESSAGE_HANDLER instances.
    
    This procedure does not have a wrapper in T_DEFAULT_MESSAGE_HANDLER
    and therefore must be called directly from the package.
    
    */
    PROCEDURE set_log_level
        (p_level IN PLS_INTEGER);
        
    /**
    
    Erases the log tail.
    
    */   
    PROCEDURE reset;
    
    /**
    
    Adds new message onto the top of the log tail.
    
    If the tail is full, the oldest message record is removed and lost forever.
    
    */
    PROCEDURE save_message
        (p_log_level IN PLS_INTEGER
        ,p_message_text IN VARCHAR2
        ,p_call_stack IN VARCHAR2);
        
    /**
    
    Returns a list of the saved log records, starting from the most recent,
    down to the oldest.
    
    This function is used in the LOG$TAIL view.
    
    */    
    FUNCTION tail
    RETURN t_log_records PIPELINED;
    
    /**
    
    Allows to increase or to decrease log message buffer capacity.
    
    If the new capacity is smaller than current buffer size,
    necessary number of olders log records are removed and lost.
    
    */
    PROCEDURE set_capacity
        (p_capacity IN PLS_INTEGER);
        
    /**
    
    Returns currently set log record buffer max. size (capacity).
    
    Note: capacity IS NOT current size of the tail. It shows HOW BIG can be tail.
    
    */    
    FUNCTION get_capacity
    RETURN PLS_INTEGER;        
    
END;
