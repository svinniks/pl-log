DECLARE

    v_arguments t_varchars;

    FUNCTION extract_arguments (
        p_template IN VARCHAR2,
        p_message IN VARCHAR2,
        p_arguments OUT t_varchars
    )
    RETURN BOOLEAN IS 

        v_position PLS_INTEGER;
        v_placeholder_position PLS_INTEGER;
        
        v_fragments t_varchars;
        v_arguments t_varchars;
        
        FUNCTION find_fragment (
            p_fragment_i IN PLS_INTEGER,
            p_position IN PLS_INTEGER
        )
        RETURN BOOLEAN IS
        
            v_position PLS_INTEGER;
            v_fragment_position PLS_INTEGER;
            
            v_argument_count PLS_INTEGER;
            
        BEGIN
        
            IF p_fragment_i > v_fragments.COUNT THEN
            
                RETURN TRUE;
        
            ELSIF v_fragments(p_fragment_i) = '%s' THEN
                
                IF p_fragment_i = v_fragments.COUNT THEN
                
                    v_arguments.EXTEND(1);
                    v_arguments(v_arguments.COUNT) := SUBSTR(p_message, p_position);
                    
                    RETURN TRUE;
                    
                ELSE
                    RETURN find_fragment(p_fragment_i + 1, p_position);
                END IF;
            
            ELSE
            
                v_argument_count := v_arguments.COUNT;
                v_position := p_position;
                
                WHILE v_position <= LENGTH(p_message) LOOP
                
                    v_fragment_position := INSTR(p_message, v_fragments(p_fragment_i), v_position);
                    
                    IF v_fragment_position = 0 THEN
                        RETURN FALSE;
                    ELSE
                    
                        IF p_fragment_i = 1 THEN
                            IF v_fragment_position > 1 THEN
                                RETURN FALSE;
                            END IF; 
                        ELSE
                            v_arguments.EXTEND(1);
                            v_arguments(v_arguments.COUNT) := SUBSTR(p_message, v_position, v_fragment_position - v_position); 
                        END IF;
                        
                        IF p_fragment_i = v_fragments.COUNT 
                           AND v_fragment_position + LENGTH(v_fragments(p_fragment_i)) <= LENGTH(p_message)
                        THEN
                            RETURN FALSE;
                        END IF;
                        
                        IF find_fragment(p_fragment_i + 1, v_fragment_position + LENGTH(v_fragments(p_fragment_i))) THEN
                            RETURN TRUE;
                        ELSE
                            v_position := v_fragment_position + 1;
                            v_arguments.TRIM(v_arguments.COUNT - v_argument_count);
                        END IF;
                        
                    END IF;
                
                END LOOP;
            
                RETURN FALSE;
                
            END IF;
        
        END;
        
    BEGIN

        IF p_template IS NULL AND p_message IS NOT NULL THEN
            RETURN FALSE;
        END IF;

        v_fragments := t_varchars();
        v_position := 1;
        
        WHILE v_position <= LENGTH(p_template) LOOP
        
            v_placeholder_position := INSTR(p_template, '%s', v_position);
            
            IF v_placeholder_position = 0 THEN
                
                v_fragments.EXTEND(1);
                v_fragments(v_fragments.COUNT) := SUBSTR(p_template, v_position);
                
                EXIT;
        
            ELSE
                
                IF v_placeholder_position > v_position THEN
                    v_fragments.EXTEND(1);
                    v_fragments(v_fragments.COUNT) := SUBSTR(p_template, v_position, v_placeholder_position - v_position);
                ELSIF v_position > 1 THEN
                    RETURN FALSE;
                END IF;
                
                v_fragments.EXTEND(1);
                v_fragments(v_fragments.COUNT) := '%s';
                
                v_position := v_placeholder_position + 2;
            
            END IF;
        
        END LOOP;

        v_arguments := t_varchars();

        IF find_fragment(1, 1) THEN
            p_arguments := v_arguments;
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
            
    END;

BEGIN

    IF extract_arguments('unique constraint (%s.%s) violated', 'unique constraint (JODUS.SYS_C0044978) violated', v_arguments) THEN
        --dbms_output.put_line('ok');
        for i in 1..v_arguments.count loop
            dbms_output.put_line(v_arguments(i));
        end loop;
    ELSE
        dbms_output.put_line('nok');
    END IF;

END;

create table pk (id number not null primary key);

begin
    insert into pk values(1);
    insert into pk values(1);
exception
    when others then
        error$.handle;
        raise;
end;

-- unique constraint (%s.%s) violated
-- unique constraint (JODUS.SYS_C0044978) violated
