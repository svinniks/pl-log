const NONE = 1001;
const ERROR = 800;
const WARNING = 600;
const INFO = 400;
const DEBUG = 200;
const ALL = 0;

suite("Log level management", function() {

    test("Set and get session level", function() {
    
        database.call("log$.set_session_log_level", {
            p_level: 123
        });

        let level = database.call("log$.get_session_log_level");

        expect(level).to.be(123);
    
    });

    test("Reset system level", function() {
    
        database.call("log$.reset_system_log_level");

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(null);
    
    });

    test("Initialize system level", function() {
    
        database.call("log$.reset_system_log_level");

        database.call("log$.init_system_log_level", {
            p_level: 123
        });

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(123);
    
    });

    test("Initialize already initialized system level", function() {
    
        database.call("log$.reset_system_log_level");

        database.call("log$.init_system_log_level", {
            p_level: 123
        });

        database.call("log$.init_system_log_level", {
            p_level: 321
        });

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(123);
    
    });

    test("Set system level, get from another (proxy) session", function() {
    
        database.call("log$.set_system_log_level", {
            p_level: 777
        });

        database.commit();

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(777);
    
    });
    
});

suite("Message resolving and formatting", function() {

    suite("Concatenation formatter", function() {
    
        test("NULL message, NULL arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: null
            });

            expect(message).to.be(null);
        
        });
        
        test("NULL message, empty arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: []
            });

            expect(message).to.be(null);
        
        });

        test("NULL message, one argument", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: ["hello"]
            });

            expect(message).to.be("(hello)");
        
        });

        test("NULL message, multiple arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: ["hello", "world", "!"]
            });

            expect(message).to.be("(hello, world, !)");
        
        });

        test("Non-NULL message, multiple arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "Hello, World!",
                p_arguments: ["hello", "world", "!"]
            });

            expect(message).to.be("Hello, World! (hello, world, !)");
        
        });
    
    });

    suite("Resolvers", function() {
    
        let dummyResolverName;

        setup("Create a dummy resolver", function() {
        
            dummyResolverName = randomString(30);

            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE "${dummyResolverName}" UNDER t_log_message_resolver (
                            
                            CONSTRUCTOR FUNCTION "${dummyResolverName}"
                            RETURN self AS RESULT,

                            OVERRIDING MEMBER FUNCTION resolve_message (
                                p_message IN VARCHAR2
                            )
                            RETURN VARCHAR2

                        );
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE BODY "${dummyResolverName}" IS
                            
                            CONSTRUCTOR FUNCTION "${dummyResolverName}"
                            RETURN self AS RESULT IS
                            BEGIN
                                RETURN;
                            END;

                            OVERRIDING MEMBER FUNCTION resolve_message (
                                p_message IN VARCHAR2
                            )
                            RETURN VARCHAR2 IS
                            BEGIN
                                RETURN UPPER(p_message);
                            END;

                        END;
                    ';

                END;
            `);
        
        });

        test("Add resolver with no level (defaults to ALL), resolve a message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"());    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });
        
        test("Add resolver with INFO level, resolve a DEBUG message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"(), p_level => log$.c_INFO);    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: DEBUG,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("hello, world!");
        
        });

        test("Add resolver with INFO level, resolve an ERROR message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"(), p_level => log$.c_INFO);    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });

        test("Resolver, which can't resolve the message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver());    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("hello, world!");
        
        });

        test("Two resolvers, the first can't resolve, the second resolves", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver()); 
                    log$.add_resolver("${dummyResolverName}"());       
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });

        test("Two resolvers, the first resolves", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"());       
                    log$.add_resolver(t_default_message_resolver()); 
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });

        teardown("Drop the dummy resolver", function() {
        
            database.run(`
                BEGIN
                    EXECUTE IMMEDIATE '
                        DROP TYPE "${dummyResolverName}"
                    ';
                END;
            `);

            database.commit();
        
        });
        
    
    });

    suite("Custom formatters", function() {
    
        test("No resolver, default formatter", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.set_default_formatter(
                        t_default_message_formatter(':')
                    );    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            expect(message).to.be("Hello, World!");

        });

        test("Resolver with no formatter, default formatter", function() {
        
            database.call("log$.reset");
            
            database.call("default_message_resolver.reset");
            database.call("default_message_resolver.register_message", {
                p_code: "MSG-00001",
                p_message: "Hello, :1!"
            });

            database.run(`
                BEGIN

                    log$.add_resolver(
                        t_default_message_resolver()
                    );

                    log$.set_default_formatter(
                        t_default_message_formatter(':')
                    );    
                    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("Hello, World!");
        
        });

        test("Resolver with formatter, default formatter", function() {
        
            database.call("log$.reset");
            
            database.call("default_message_resolver.reset");
            database.call("default_message_resolver.register_message", {
                p_code: "MSG-00001",
                p_message: "Hello, :1!"
            });

            database.run(`
                BEGIN

                    log$.add_resolver(
                        t_default_message_resolver(),
                        t_default_message_formatter(':')
                    );

                    log$.set_default_formatter(
                        t_default_message_formatter('#')
                    );    
                    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("Hello, World!");
        
        });

        test("Resolver, no formatter, no default formatter", function() {
        
            database.call("log$.reset");
            
            database.call("default_message_resolver.reset");
            database.call("default_message_resolver.register_message", {
                p_code: "MSG-00001",
                p_message: "Hello, :1!"
            });

            database.run(`
                BEGIN
                    log$.add_resolver(
                        t_default_message_resolver()
                    );
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("Hello, :1! (World)");
        
        });
        
        
        
    });

});

suite("Message handling", function() {

    suite("Raw message handlers", function() {
    
        let handlerTypeName = randomString(30);
        let handlerPackageName = randomString(30);

        setup("Create a dummy raw message handler", function() {
        
            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE "${handlerPackageName}" IS
                            
                            v_messages t_varchars;

                            PROCEDURE reset;

                            PROCEDURE handle_message (
                                p_level IN log$.t_message_log_level,
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
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
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
                            ) IS
                            BEGIN

                                v_messages.EXTEND(1);
                                v_messages(v_messages.COUNT) := p_level || '': '' || t_default_message_formatter('':'').format_message(
                                    p_message,
                                    p_arguments
                                );

                            END;

                            FUNCTION get_messages
                            RETURN t_varchars IS
                            BEGIN
                                RETURN v_messages;
                            END;

                        END;
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE "${handlerTypeName}" UNDER t_raw_message_handler (

                            log_level NUMBER,

                            OVERRIDING MEMBER FUNCTION get_log_level
                            RETURN PLS_INTEGER,
                            
                            OVERRIDING MEMBER PROCEDURE handle_message (
                                p_level IN PLS_INTEGER,
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
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
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
                            ) IS
                            BEGIN

                                "${handlerPackageName}".handle_message(p_level, p_message, p_arguments);

                            END;
                            
                        END;
                    ';

                END;
            `);
        
        });

        test("INFO message to one handler with NULL handler, session and system level", function() {
        
            database.call("log$.reset");
            database.call("log$.reset_system_log_level");

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
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
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ERROR
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
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
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
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
                "400: Hello, World!"
            ]);
        
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
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
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
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
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
                "400: Hello, World!"
            ]);
        
        });

        test("INFO message to two handlers, both handle", function() {
        
            database.call("log$.reset");

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
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
                "400: Hello, World!",
                "400: Hello, World!"
            ]);
        
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

    suite("Formatted message handlers", function() {
    
        let handlerTypeName = randomString(30);
        let handlerPackageName = randomString(30);

        setup("Create a dummy formatted message handler", function() {
        
            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE "${handlerPackageName}" IS
                            
                            v_messages t_varchars;

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
        
            database.call("log$.reset");
            database.call("log$.reset_system_log_level");

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
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
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ERROR
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
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
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
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
                "400: Hello, World!"
            ]);
        
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
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
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
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
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
                "400: Hello, World!"
            ]);
        
        });

        test("INFO message to two handlers, both handle", function() {
        
            database.call("log$.reset");

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
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
                "400: Hello, World!",
                "400: Hello, World!"
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

});

suite("Log level data type constraints", function() {

    test("Try to add resolver with NULL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver(), p_level => NULL);
                END;
            `);
        
        }).to.throw(/PLS-00567/);
    
    });
    
    test("Try to add resolver with NONE level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver(), p_level => ${NONE});
                END;
            `);
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Add resolver with ALL level", function() {
    
        database.call("log$.reset");

        database.run(`
            BEGIN
                log$.add_resolver(t_default_message_resolver(), p_level => ${ALL});
            END;
        `);
    
    });
    
    test("Try to format message with NULL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.format_message", {
               p_level: null,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });
    
    test("Try to format message with ALL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.format_message", {
               p_level: ALL,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to format message with NONE level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.format_message", {
               p_level: NONE,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to dispatch message with NULL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.message", {
               p_level: null,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to dispatch message with NONE level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.message", {
               p_level: NONE,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to dispatch message with ALL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.message", {
               p_level: ALL,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

});