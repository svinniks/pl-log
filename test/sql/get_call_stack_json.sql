CREATE OR REPLACE PROCEDURE "${getCallStackJsonProcedureName}" (
    p_calls OUT log$.t_call_stack,
    -- @json
    p_values OUT VARCHAR2
) IS

    v_values log$.t_call_values;
    v_values_json VARCHAR2(32000);
    v_name VARCHAR2(4000);

    FUNCTION escape_string (
        p_string IN VARCHAR2
    )
    RETURN VARCHAR2 IS

        v_result VARCHAR2(4000);

    BEGIN

        v_result := REPLACE(p_string, '\', '\\');
        v_result := REPLACE(v_result, '"', '\"');
        v_result := REPLACE(v_result, '/', '\/');
        v_result := REPLACE(v_result, CHR(8), '\b');
        v_result := REPLACE(v_result, CHR(12), '\f');
        v_result := REPLACE(v_result, CHR(10), '\n');
        v_result := REPLACE(v_result, CHR(13), '\r');
        v_result := REPLACE(v_result, CHR(9), '\t');

        RETURN v_result;

    END;

BEGIN

    log$.get_call_stack(p_calls, v_values);
    
    v_values_json := '[';
    
    FOR v_i IN 1..p_calls.COUNT LOOP
    
        IF v_i > 1 THEN
            v_values_json := v_values_json || ',';
        END IF;
        
        v_values_json := v_values_json || '{';
        
        v_name := v_values(v_i).FIRST;
        
        WHILE v_name IS NOT NULL LOOP
        
            IF v_name != v_values(v_i).FIRST THEN
                v_values_json := v_values_json || ',';
            END IF;
            
            v_values_json := v_values_json
                || '"'
                || escape_string(v_name)
                || '":{"type":"'
                || v_values(v_i)(v_name).type
                || '","varchar2_value":'
                || CASE 
                       WHEN v_values(v_i)(v_name).varchar2_value IS NULL THEN 'null'
                       ELSE '"' || escape_string(v_values(v_i)(v_name).varchar2_value) || '"'
                   END
                || ',"number_value":'
                || CASE 
                       WHEN v_values(v_i)(v_name).number_value IS NULL THEN 'null'
                       ELSE TO_CHAR(v_values(v_i)(v_name).number_value, 'TM', 'NLS_NUMERIC_CHARACTERS=''.,''')
                   END    
                || ',"boolean_value":'
                || CASE
                       WHEN v_values(v_i)(v_name).boolean_value IS NULL THEN 'null'
                       WHEN v_values(v_i)(v_name).boolean_value THEN 'true'
                       ELSE 'false'
                   END
                || ',"date_value":'
                || CASE 
                       WHEN v_values(v_i)(v_name).date_value IS NULL THEN 'null'
                       ELSE '"' || TO_CHAR(v_values(v_i)(v_name).date_value, 'YYYY-MM-DD HH24:MI:SS') || '"'
                   END 
                || '}';
                
            v_name := v_values(v_i).NEXT(v_name);    
        
        END LOOP;
        
        v_values_json := v_values_json || '}';
    
    END LOOP;
    
    v_values_json := v_values_json || ']';
    
    p_values := v_values_json;

END;