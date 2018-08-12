const NONE = 601;
const FATAL = 500;
const ERROR = 400; 
const WARNING = 300; 
const INFO = 200; 
const DEBUG = 100;
const ALL = 0;

suite("Message resolving and formatting", function() {

    test("Try to format a message with NULL level", function() {
    
        expect(function() {
        
            let message = database.call("log$.format_message", {
                p_level: null,
                p_message: null,
                p_arguments: null
            });
        
        }).to.throw(/ORA-06502/);
    
    });
    
    test("Try to format a message with ALL level", function() {
    
        expect(function() {
        
            let message = database.call("log$.format_message", {
                p_level: ALL,
                p_message: null,
                p_arguments: null
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to format a message with NONE level", function() {
    
        expect(function() {
        
            let message = database.call("log$.format_message", {
                p_level: NONE,
                p_message: null,
                p_arguments: null
            });
        
        }).to.throw(/ORA-06502/);
    
    });

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

        test("Try to add resolver with NULL level", function() {
        
            database.call("log$.reset");

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.add_message_resolver("${dummyResolverName}"(), p_level => NULL);    
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to add resolver with NONE level", function() {
        
            database.call("log$.reset");

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.add_message_resolver("${dummyResolverName}"(), p_level => log$.c_NONE);    
                    END;
                `);
            
            }).to.throw(/ORA-06502/);

        });

        test("Add resolver with no level (defaults to ALL), resolve a message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_message_resolver("${dummyResolverName}"());    
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
                    log$.add_message_resolver("${dummyResolverName}"(), p_level => log$.c_INFO);    
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
                    log$.add_message_resolver("${dummyResolverName}"(), p_level => log$.c_INFO);    
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
                    log$.add_message_resolver(t_default_message_resolver());    
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
                    log$.add_message_resolver(t_default_message_resolver()); 
                    log$.add_message_resolver("${dummyResolverName}"());       
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
                    log$.add_message_resolver("${dummyResolverName}"());       
                    log$.add_message_resolver(t_default_message_resolver()); 
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
                    log$.set_default_message_formatter(
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

                    log$.add_message_resolver(
                        t_default_message_resolver()
                    );

                    log$.set_default_message_formatter(
                        t_default_message_formatter(':')
                    );    
                    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("MSG-00001: Hello, World!");
        
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

                    log$.add_message_resolver(
                        t_default_message_resolver(),
                        t_default_message_formatter(':')
                    );

                    log$.set_default_message_formatter(
                        t_default_message_formatter('#')
                    );    
                    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("MSG-00001: Hello, World!");
        
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
                    log$.add_message_resolver(
                        t_default_message_resolver()
                    );
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("MSG-00001: Hello, :1! (World)");
        
        });
        
    });

});