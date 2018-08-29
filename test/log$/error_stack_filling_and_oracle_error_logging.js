const NONE = 601;
const FATAL = 500;
const ERROR = 400; 
const WARNING = 300; 
const INFO = 200; 
const DEBUG = 100;
const ALL = 0;

function resetPackage() {
    database.run(`
        BEGIN
            dbms_session.reset_package;            
        END;
    `);
}

let getCallStackJsonProcedureName;

function getCallStack() {
    return database.call(`"${getCallStackJsonProcedureName}"`);
}

setup("Create wrapper for LOG$.GET_CALL_STACK to handle associative array argument", function() {

    getCallStackJsonProcedureName = "get_call_stack_" + randomString(15);

    let getCallStackJsonProcedure = readFile("test/sql/get_call_stack_json.sql");

    database.run(`
        BEGIN
            EXECUTE IMMEDIATE '${getCallStackJsonProcedure.replaceAll("'", "''").replace("${getCallStackJsonProcedureName}", getCallStackJsonProcedureName)}';
        END;
    `);

});

suite("Error stack filling and oracle error logging", function() {

    let handlerTypeName = randomString(30);
    let handlerPackageName = randomString(30);

    setup("Create a dummy formatted message handler", function() {
    
        database.run(`
            BEGIN

                EXECUTE IMMEDIATE '
                    CREATE OR REPLACE PACKAGE "${handlerPackageName}" IS
                        
                        v_messages t_varchars := t_varchars();

                        PROCEDURE reset;

                        PROCEDURE handle_message (
                            p_level IN log$.t_message_log_level,
                            p_message IN VARCHAR2
                        );

                        FUNCTION get_messages
                        RETURN t_varchars;

                    END;
                ';

                EXECUTE IMMEDIATE '
                    CREATE OR REPLACE PACKAGE BODY "${handlerPackageName}" IS

                        PROCEDURE reset IS
                        BEGIN
                            v_messages := t_varchars();
                        END;

                        PROCEDURE handle_message (
                            p_level IN log$.t_message_log_level,
                            p_message IN VARCHAR2
                        ) IS
                        BEGIN

                            v_messages.EXTEND(1);
                            v_messages(v_messages.COUNT) := p_level || '': '' || p_message;

                        END;

                        FUNCTION get_messages
                        RETURN t_varchars IS
                        BEGIN
                            RETURN v_messages;
                        END;

                    END;
                ';

                EXECUTE IMMEDIATE '
                    CREATE OR REPLACE TYPE "${handlerTypeName}" UNDER t_formatted_message_handler (

                        log_level NUMBER,

                        OVERRIDING MEMBER FUNCTION get_log_level
                        RETURN PLS_INTEGER,
                        
                        OVERRIDING MEMBER PROCEDURE handle_message (
                            p_level IN PLS_INTEGER,
                            p_message IN VARCHAR2
                        )

                    );
                ';

                EXECUTE IMMEDIATE '
                    CREATE OR REPLACE TYPE BODY "${handlerTypeName}" IS

                        OVERRIDING MEMBER FUNCTION get_log_level
                        RETURN PLS_INTEGER IS
                        BEGIN
                            RETURN log_level;
                        END;
                        
                        OVERRIDING MEMBER PROCEDURE handle_message (
                            p_level IN PLS_INTEGER,
                            p_message IN VARCHAR2
                        ) IS
                        BEGIN

                            "${handlerPackageName}".handle_message(p_level, p_message);

                        END;
                        
                    END;
                ';

            END;
        `);
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 0, backtrace depth 1", function() {
    
        resetPackage();

        database.run(`
            BEGIN
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack(0);
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 3,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 1, backtrace depth 1", function() {
    
        resetPackage();

        database.run(`
            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack(0);
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 1, backtrace depth 3", function() {
    
        resetPackage();

        database.run(`
            DECLARE
                
                PROCEDURE proc2 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;

                PROCEDURE proc1 IS
                BEGIN
                    proc2;
                END;

            BEGIN
                log$.value('hello', 'world');
                proc1;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack(0);
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 16,
                    first_tracked_line: 15
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block",
                    line: 11,
                    first_tracked_line: null
                }, 
                {
                    id: 3,
                    unit: "__anonymous_block",
                    line: 6,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }, 
                {}, 
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 2, backtrace depth 3", function() {
    
        resetPackage();

        database.run(`
            DECLARE
                
                PROCEDURE proc2 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;

                PROCEDURE proc1 IS
                BEGIN
                    log$.call;
                    proc2;
                END;

            BEGIN
                log$.value('hello', 'world');
                proc1;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack(0);
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 17,
                    first_tracked_line: 16
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 12,
                    first_tracked_line: 11
                }, 
                {
                    id: 3,
                    unit: "__anonymous_block",
                    line: 6,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }, 
                {}, 
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 2, backtrace depth 2, common depth 1", function() {
    
        resetPackage();

        database.run(`
            DECLARE
                
                PROCEDURE proc2 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;

                PROCEDURE proc1 IS
                BEGIN
                    log$.call;
                END;

            BEGIN
                log$.value('hello', 'world');
                proc1;
                proc2;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack(0);
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 17,
                    first_tracked_line: 15
                }, 
                {
                    id: 3,
                    unit: "__anonymous_block",
                    line: 6,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }, 
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 3, backtrace depth 4, common depth 2", function() {
    
        resetPackage();
    
        database.run(`
            DECLARE
    
                PROCEDURE proc4 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;
    
                PROCEDURE proc3 IS
                BEGIN
                    proc4;
                END;
    
                PROCEDURE proc2 IS
                BEGIN
                    log$.value('hello', 'people');
                END;
    
                PROCEDURE proc1 IS
                BEGIN
                    log$.call;
                    proc2;
                    proc3;
                END;
    
            BEGIN
                log$.value('hello', 'world');
                proc1;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack(0);
            END;
        `);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 28,
                    first_tracked_line: 27
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 23,
                    first_tracked_line: 21
                },
                {
                    id: 4,
                    unit: "__anonymous_block",
                    line: 11,
                    first_tracked_line: null
                },
                {
                    id: 5,
                    unit: "__anonymous_block",
                    line: 6,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }, 
                {},
                {},
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 3, tracked depth 1, backtrace depth 3", function() {
    
        resetPackage();
    
        database.run(`
            DECLARE
    
                PROCEDURE proc4 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;
    
                PROCEDURE proc3 IS
                BEGIN
                    proc4;
                END;
    
                PROCEDURE proc2 IS
                BEGIN
                    proc3;
                EXCEPTION
                    WHEN OTHERS THEN
                        log$.fill_error_stack(0);
                END;
    
                PROCEDURE proc1 IS
                BEGIN
                    proc2;
                END;
    
            BEGIN
                log$.value('hello', 'world');
                proc1;
            END;
        `);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 29,
                    first_tracked_line: 28
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 24,
                    first_tracked_line: null
                },
                {
                    id: 3,
                    unit: "__anonymous_block.PROC2",
                    line: 16,
                    first_tracked_line: null
                },
                {
                    id: 4,
                    unit: "__anonymous_block",
                    line: 11,
                    first_tracked_line: null
                },
                {
                    id: 5,
                    unit: "__anonymous_block",
                    line: 6,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }, 
                {},
                {},
                {},
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 3, tracked depth 1, backtrace depth 3, hide one stack level", function() {
    
        resetPackage();
    
        database.run(`
            DECLARE
    
                PROCEDURE proc5 IS
                BEGIN
                    log$.fill_error_stack(1);
                END;

                PROCEDURE proc4 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;
    
                PROCEDURE proc3 IS
                BEGIN
                    proc4;
                END;
    
                PROCEDURE proc2 IS
                BEGIN
                    proc3;
                EXCEPTION
                    WHEN OTHERS THEN
                        proc5;
                END;
    
                PROCEDURE proc1 IS
                BEGIN
                    proc2;
                END;
    
            BEGIN
                log$.value('hello', 'world');
                proc1;
            END;
        `);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 34,
                    first_tracked_line: 33
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 29,
                    first_tracked_line: null
                },
                {
                    id: 3,
                    unit: "__anonymous_block.PROC2",
                    line: 21,
                    first_tracked_line: null
                },
                {
                    id: 4,
                    unit: "__anonymous_block",
                    line: 16,
                    first_tracked_line: null
                },
                {
                    id: 5,
                    unit: "__anonymous_block",
                    line: 11,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }, 
                {},
                {},
                {},
                {}
            ]
        });
    
    });

    test("Check if nothing is logged if there is no error", function() {
        
        database.run(`
            BEGIN
                log$.reset;
                log$.set_system_log_level(log$.c_ERROR);
                log$.add_message_handler("${handlerTypeName}"(NULL, 0));    
            END;
        `);

        database.run(`
            BEGIN
                log$.set_default_message_formatter(t_default_message_formatter(':'));
            END;
        `);

        database.call(`"${handlerPackageName}".reset`);

        database.run(`
            BEGIN
                log$.oracle_error;
            END;
        `);

        let messages = database.call(`"${handlerPackageName}".get_messages`);

        expect(messages).to.eql([]);

        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [],
            p_values: []
        });
    
    });

    test("Log oracle error with NULL handler, session and system level", function() {
        
        database.run(`
            BEGIN
                log$.reset;
                log$.set_system_log_level(NULL);
                log$.add_message_handler("${handlerTypeName}"(NULL, NULL));    
                log$.set_default_message_formatter(t_default_message_formatter(':'));
                "${handlerPackageName}".reset;
            END;
        `);

        database.run(`
            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.oracle_error;
            END;
        `);

        let messages = database.call(`"${handlerPackageName}".get_messages`);

        expect(messages).to.eql([]);

        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 3,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Log oracle error with NULL handler and session level, ERROR system level", function() {
        
        database.run(`
            BEGIN
                log$.reset;
                log$.set_system_log_level(log$.c_ERROR);
                log$.add_message_handler("${handlerTypeName}"(NULL, NULL));    
            END;
        `);

        database.run(`
            BEGIN
                log$.set_default_message_formatter(t_default_message_formatter(':'));
            END;
        `);

        database.call(`"${handlerPackageName}".reset`);

        database.run(`
            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.oracle_error;
            END;
        `);

        let messages = database.call(`"${handlerPackageName}".get_messages`);

        expect(messages).to.eql([`${FATAL}: ORA-01403: no data found`]);

        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Log oracle error with NULL handler level, INFO session level, NONE system level", function() {
        
        database.run(`
            BEGIN
                log$.reset;                
                log$.set_system_log_level(log$.c_NONE);
                log$.set_session_log_level(log$.c_INFO);
            END;
        `);

        database.run(`
            BEGIN
                log$.add_message_handler("${handlerTypeName}"(NULL, NULL));    
            END;
        `);

        database.run(`
            BEGIN
                log$.set_default_message_formatter(t_default_message_formatter(':'));
            END;
        `);

        database.call(`"${handlerPackageName}".reset`);

        database.run(`
            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.oracle_error;
            END;
        `);

        let messages = database.call(`"${handlerPackageName}".get_messages`);

        expect(messages).to.eql([`${FATAL}: ORA-01403: no data found`]);

        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Log oracle error with INFO handler level, NONE session level and system level", function() {
        
        database.run(`
            BEGIN
                log$.reset;                
                log$.set_system_log_level(log$.c_NONE);
                log$.set_session_log_level(log$.c_NONE);
                log$.add_message_handler("${handlerTypeName}"(NULL, ${INFO}));    
                log$.set_default_message_formatter(t_default_message_formatter(':'));
            END;
        `);

        database.call(`"${handlerPackageName}".reset`);

        database.run(`
            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.oracle_error;
            END;
        `);

        let messages = database.call(`"${handlerPackageName}".get_messages`);

        expect(messages).to.eql([`${FATAL}: ORA-01403: no data found`]);

        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Log oracle error custom message level", function() {
        
        database.run(`
            BEGIN
                log$.reset;                
                log$.set_system_log_level(log$.c_NONE);
                log$.set_session_log_level(log$.c_NONE);
                log$.add_message_handler("${handlerTypeName}"(NULL, ${INFO}));    
                log$.set_default_message_formatter(t_default_message_formatter(':'));
            END;
        `);

        database.call(`"${handlerPackageName}".reset`);

        database.run(`
            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.oracle_error(p_level => log$.c_WARNING);
            END;
        `);

        let messages = database.call(`"${handlerPackageName}".get_messages`);

        expect(messages).to.eql([`${WARNING}: ORA-01403: no data found`]);

        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Log oracle error, hide one stack level", function() {
        
        database.run(`
            BEGIN
                log$.reset;                
                log$.set_system_log_level(log$.c_NONE);
                log$.set_session_log_level(log$.c_NONE);
                log$.add_message_handler("${handlerTypeName}"(NULL, ${INFO}));    
                log$.set_default_message_formatter(t_default_message_formatter(':'));
            END;
        `);

        database.run(`
            BEGIN
                log$.set_default_message_formatter(t_default_message_formatter(':'));
            END;
        `);

        database.call(`"${handlerPackageName}".reset`);

        database.run(`
            DECLARE

                PROCEDURE proc IS
                BEGIN
                    log$.oracle_error(p_service_depth => 1);
                END;

            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN    
                    proc;
            END;
        `);

        let messages = database.call(`"${handlerPackageName}".get_messages`);

        expect(messages).to.eql([`${FATAL}: ORA-01403: no data found`]);

        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 11,
                    first_tracked_line: 10
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    teardown("Drop the dummy formatted message handler", function() {
        
        database.run(`
            BEGIN
                EXECUTE IMMEDIATE '
                    DROP TYPE "${handlerTypeName}"
                ';
                EXECUTE IMMEDIATE '
                    DROP PACKAGE "${handlerPackageName}"
                ';
            END;
        `);

        database.commit();

    });
    
});

teardown("Drop the LOG$.GET_CALL_STACK wrapper", function() {
    
    database.run(`
        BEGIN
            EXECUTE IMMEDIATE '
                DROP PROCEDURE "${getCallStackJsonProcedureName}"
            ';
        END;
    `);

});