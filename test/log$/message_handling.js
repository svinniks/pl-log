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

suite("Message handling", function() {

    test("Try to call MESSAGE with NULL level", function() {
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.message(NULL, 'Hello, World!');    
                END;
            `);
        
        }).to.throw(/PLS-00567/);    
    
    });

    test("Try to call MESSAGE with NONE level", function() {
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.message(log$.c_NONE, 'Hello, World!');    
                END;
            `);
        
        }).to.throw(/ORA-06512/);    
    
    });

    test("Try to call MESSAGE with ALL level", function() {
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.message(log$.c_ALL, 'Hello, World!');    
                END;
            `);
        
        }).to.throw(/ORA-06512/);    
    
    });
    
    test("Try to call MESSAGE with NULL service depth", function() {
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, World!', NULL, NULL);    
                END;
            `);
        
        }).to.throw(/PLS-00567/);
    
    });
    
    test("Check if call stack is updated when no handlers are registered", function() {
        
        resetPackage();

        database.run(`
            BEGIN
                log$.reset_system_log_level;
            END;
        `);
        
        database.run(`
            BEGIN
                log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World'));
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [],
            p_values: []
        });
    
    });

    suite("Message handlers", function() {
    
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

        test("INFO message to one handler with NULL handler, session and system level", function() {
        
            database.run(`
                BEGIN
                    log$.reset;
                    log$.reset_system_log_level;
                    log$.add_message_handler("${handlerTypeName}"(NULL, NULL));
                    log$.set_default_message_formatter(t_default_message_formatter(':'));
                END;
            `);
            
            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with NULL handler and session level, ERROR system level", function() {
        
            database.run(`
                BEGIN
                    log$.reset;
                    log$.set_system_log_level(log$.c_ERROR);
                    log$.add_message_handler("${handlerTypeName}"(NULL, NULL));
                    log$.set_default_message_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with NULL handler and session level, INFO system level", function() {
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

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

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World!`
            ]);
        
        });

        test("Check if call stack is updated when at least one handler is executed", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_message_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World'));
                END;
            `);
            
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
                    {}
                ]
            });
        
        });

        test("INFO message to one handler with NULL handler level, ERROR session level, INFO system level", function() {
        
            database.call("log$.reset");

            database.call("log$.set_session_log_level", {
                p_level: ERROR
            });

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

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

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with ALL handler level, ERROR session level, INFO system level", function() {
        
            database.call("log$.reset");

            database.call("log$.set_session_log_level", {
                p_level: ERROR
            });

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_message_handler("${handlerTypeName}"(NULL, 0));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_message_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World!`
            ]);
        
        });

        test("INFO message to two handlers, both handle", function() {
        
            database.call("log$.reset");

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_message_handler("${handlerTypeName}"(NULL, 0));    
                    log$.add_message_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_message_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World!`,
                `${INFO}: Hello, World!`
            ]);
        
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

    suite("Shortcut methods", function() {
    
        let handlerTypeName = randomString(30);
        let handlerPackageName = randomString(30);

        setup("Create a dummy message handler", function() {
        
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

        setup("Setup the logger", function() {
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_message_handler("${handlerTypeName}"(NULL, NULL));    
                    log$.set_default_message_formatter(t_default_message_formatter(':'));
                END;
            `);
        
        });

        test("DEBUG argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${DEBUG}: Hello, World!`
            ]);
        
        });

        test("DEBUG argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${DEBUG}: Hello, :1, :2, :3, :4 and :5!`
            ]);
        
        });

        test("DEBUG no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${DEBUG}: Hello, World, :2, :3, :4 and :5!`
            ]);
        
        });

        test("DEBUG 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${DEBUG}: Hello, World, People, :3, :4 and :5!`
            ]);
        
        });

        test("DEBUG 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${DEBUG}: Hello, World, People, Sun, :4 and :5!`
            ]);
        
        });

        test("DEBUG 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${DEBUG}: Hello, World, People, Sun, Joy and :5!`
            ]);
        
        });

        test("DEBUG 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${DEBUG}: Hello, World, People, Sun, Joy and Fun!`
            ]);
        
        });

        test("DEBUG 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World!`
            ]);
        
        });

        test("INFO argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, :1, :2, :3, :4 and :5!`
            ]);
        
        });

        test("INFO no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World, :2, :3, :4 and :5!`
            ]);
        
        });

        test("INFO 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World, People, :3, :4 and :5!`
            ]);
        
        });

        test("INFO 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World, People, Sun, :4 and :5!`
            ]);
        
        });

        test("INFO 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World, People, Sun, Joy and :5!`
            ]);
        
        });

        test("INFO 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${INFO}: Hello, World, People, Sun, Joy and Fun!`
            ]);
        
        });

        test("INFO 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${WARNING}: Hello, World!`
            ]);
        
        });

        test("WARNING argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${WARNING}: Hello, :1, :2, :3, :4 and :5!`
            ]);
        
        });

        test("WARNING no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${WARNING}: Hello, World, :2, :3, :4 and :5!`
            ]);
        
        });

        test("WARNING 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${WARNING}: Hello, World, People, :3, :4 and :5!`
            ]);
        
        });

        test("WARNING 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${WARNING}: Hello, World, People, Sun, :4 and :5!`
            ]);
        
        });

        test("WARNING 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${WARNING}: Hello, World, People, Sun, Joy and :5!`
            ]);
        
        });

        test("WARNING 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${WARNING}: Hello, World, People, Sun, Joy and Fun!`
            ]);
        
        });

        test("WARNING 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${ERROR}: Hello, World!`
            ]);
        
        });

        test("ERROR argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${ERROR}: Hello, :1, :2, :3, :4 and :5!`
            ]);
        
        });

        test("ERROR no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${ERROR}: Hello, World, :2, :3, :4 and :5!`
            ]);
        
        });

        test("ERROR 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${ERROR}: Hello, World, People, :3, :4 and :5!`
            ]);
        
        });

        test("ERROR 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${ERROR}: Hello, World, People, Sun, :4 and :5!`
            ]);
        
        });

        test("ERROR 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${ERROR}: Hello, World, People, Sun, Joy and :5!`
            ]);
        
        });

        test("ERROR 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${ERROR}: Hello, World, People, Sun, Joy and Fun!`
            ]);
        
        });

        test("ERROR 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("FATAL no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${FATAL}: Hello, :1, :2, :3, :4 and :5!`
            ]);
        
        });

        test("FATAL no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("FATAL 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${FATAL}: Hello, World, :2, :3, :4 and :5!`
            ]);
        
        });

        test("FATAL 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("FATAL 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${FATAL}: Hello, World, People, :3, :4 and :5!`
            ]);
        
        });

        test("FATAL 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("FATAL 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${FATAL}: Hello, World, People, Sun, :4 and :5!`
            ]);
        
        });

        test("FATAL 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("FATAL 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${FATAL}: Hello, World, People, Sun, Joy and :5!`
            ]);
        
        });

        test("FATAL 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("FATAL 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                `${FATAL}: Hello, World, People, Sun, Joy and Fun!`
            ]);
        
        });

        test("FATAL 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.fatal('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });
        
        teardown("Drop the dummy raw message handler", function() {
        
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