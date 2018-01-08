CREATE OR REPLACE PACKAGE BODY default_message_handler IS

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
    
    -- Stored handler-local log level 
    v_log_level PLS_INTEGER;
    
    -- Log record buffer is stored as a double-linked ring
    -- (that is, a double-linked list, in which the last record
    -- points to the first one and vice versa).
    -- Memory heap is modelled through an assotiative array,
    -- where indexes are "addresses".
    -- 
    -- The next two types declare the list record and the heap, accordingly.
    
    TYPE t_log_item IS RECORD
        (log_record t_log_record
        ,next_item_i PLS_INTEGER
        ,prev_item_i PLS_INTEGER);
    
    TYPE t_log_items IS TABLE OF t_log_item INDEX BY PLS_INTEGER;
        
    v_log_items t_log_items;        -- log record buffer
    v_capacity PLS_INTEGER := 1000; -- current capacity
    v_size PLS_INTEGER := 0;        -- current SIZE of the buffer (actual record count)
    v_first_item_i PLS_INTEGER;     -- pointer to the first (latest) item in the list
    v_last_item_i PLS_INTEGER;      -- pointer to the last (olders) item in the list
    
        
    FUNCTION get_log_level
    RETURN PLS_INTEGER IS
    BEGIN
    
        RETURN v_log_level;
    
    END;
    
    PROCEDURE set_log_level
        (p_level IN PLS_INTEGER) IS
    BEGIN
    
        v_log_level := p_level;
    
    END;
    
    PROCEDURE reset IS
    BEGIN
    
        v_log_items.DELETE;
        v_size := 0;
        v_first_item_i := NULL;
        v_first_item_i := NULL;
    
    END;
    
    /**
    
    Saves a constructed record in the log record buffer.
    
    */
    PROCEDURE save_record
        (p_log_record t_log_record) IS
    BEGIN
        
        -- In case when the buffer is empty, initialize the first item,
        -- which points to itself.
        IF v_first_item_i IS NULL THEN
        
            v_first_item_i := 1;
            v_last_item_i := 1;
            
            v_log_items(1).next_item_i := 1;
            v_log_items(1).prev_item_i := 1;
            
            v_size := 1;
            
        -- If the list can grow, then increase the size,
        -- adjusting the first and the last record pointers.    
        ELSIF v_size < v_capacity THEN
        
            v_log_items(v_first_item_i).prev_item_i := v_size + 1;
            v_log_items(v_size + 1).next_item_i := v_first_item_i;
            
            v_log_items(v_last_item_i).next_item_i := v_size + 1;
            v_log_items(v_size + 1).prev_item_i := v_last_item_i;
            
            v_first_item_i := v_size + 1;
            v_size := v_size + 1;
            
        -- In case the capacity is reached, just move v_first_item_i and v_last_item_i one item forward.    
        ELSE
        
            v_first_item_i := v_last_item_i;
            v_last_item_i := v_log_items(v_last_item_i).prev_item_i;
        
        END IF;
        
        -- In any case, v_first_item_i now points to the latest log record item
        -- and the specified record can be assigned to the payload field.
        v_log_items(v_first_item_i).log_record := p_log_record;
    
    END;
    
    PROCEDURE save_message
        (p_log_level IN PLS_INTEGER
        ,p_message_text IN VARCHAR2
        ,p_call_stack IN VARCHAR2) IS
        
        v_log_record t_log_record;
        
    BEGIN
    
        -- Construct the message record and save it into the buffer.
    
        v_log_record.log_date := CURRENT_TIMESTAMP;
        v_log_record.log_level := p_log_level;
        v_log_record.message_text := p_message_text;
        v_log_record.call_stack := p_call_stack;
    
        save_record(v_log_record);
    
    END;
    
    FUNCTION tail
    RETURN t_log_records PIPELINED IS
    
        v_item_i PLS_INTEGER;
    
    BEGIN
    
        -- The buffer is empty
        IF v_first_item_i IS NULL THEN
            RETURN;
        END IF;
    
        v_item_i := v_first_item_i;
        
        -- Iterate through the list from the first item down to
        -- the last one, pipe each row met.
        LOOP
        
            PIPE ROW(v_log_items(v_item_i).log_record);
        
            EXIT WHEN v_item_i = v_last_item_i;
            
            v_item_i := v_log_items(v_item_i).next_item_i;
        
        END LOOP;
    
        RETURN;
    
    END;
    
    PROCEDURE set_capacity
        (p_capacity IN PLS_INTEGER) IS
        
        v_old_log_items t_log_items;
        v_old_item_i PLS_INTEGER;
        v_old_first_item_i PLS_INTEGER;
        
    BEGIN
    
        v_capacity := p_capacity;

        -- If new capacity is larger than the actual size, everything will work just fine.
        -- If new capacity is less, some sort of shrinking is necessary.
        -- However, the heap can be weirdly messed after capacity changing, so 
        -- shrinking is not trivial.
        -- Therefore the simplest way is just to copy the current buffer, initialize the new one
        -- and just populate from the old one.

        IF v_capacity < v_size THEN
        
            v_old_log_items := v_log_items;
            v_old_item_i := v_last_item_i;
            v_old_first_item_i := v_first_item_i;
            
            reset;
            
            IF v_old_item_i IS NOT NULL THEN
            
                LOOP
                
                    save_record(v_old_log_items(v_old_item_i).log_record);
                    
                    EXIT WHEN v_old_item_i = v_old_first_item_i;
                    v_old_item_i := v_old_log_items(v_old_item_i).prev_item_i;
                
                END LOOP;
            
            END IF;
        
        END IF;
    
    END;
        
    FUNCTION get_capacity
    RETURN PLS_INTEGER IS
    BEGIN
    
        RETURN v_capacity;
    
    END;
    
END;
