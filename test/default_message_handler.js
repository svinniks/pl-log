const ERROR = 1000;
const WARNING = 750;
const INFO = 500;
const DEBUG = 250;

suite("Default message handler tests", function() {

    test("Get initial log level", function() {
    
        database.run(`
            DECLARE
            BEGIN
                dbms_session.reset_package;
            END;
        `);

        let level = database.call("default_message_handler.get_log_level");
    
        expect(level).to.be(null);

    });
    
    test("Set and get non-NULL log level", function() {
    
        database.run(`
            DECLARE
            BEGIN
                dbms_session.reset_package;
            END;
        `);

        database.call("default_message_handler.set_log_level", {
            p_level: 123
        });

        let level = database.call("default_message_handler.get_log_level");
    
        expect(level).to.be(123);

    });

    test("Set and get non-NULL log level via the object type", function() {
    
        database.run(`
            DECLARE
            BEGIN
                dbms_session.reset_package;
            END;
        `);

        database.call("default_message_handler.set_log_level", {
            p_level: 321
        });

        let level = database.selectValue(`
                t_default_message_handler().get_log_level()
            FROM dual
        `);
    
        expect(level).to.be(321);

    });

    test("Reset message buffer, check buffer content", function() {
    
        database.call("default_message_handler.reset");

        let messages = database.call("default_message_handler.tail");
    
        expect(messages).to.eql([]);

    });

    test("Add some log messages", function() {
    
        database.call("default_message_handler.reset");

        database.call("default_message_handler.handle_message", {
            p_level: ERROR,
            p_message: "Error message"
        });

        database.call("default_message_handler.handle_message", {
            p_level: INFO,
            p_message: "Info message"
        });

        database.call("default_message_handler.handle_message", {
            p_level: DEBUG,
            p_message: "Debug message"
        });

        database.call("default_message_handler.handle_message", {
            p_level: 123,
            p_message: "Level 123 message"
        });

        let messages = database.selectRows(`
                log_level,
                log_level_name,
                message
            FROM TABLE(default_message_handler.tail)
        `);
    
        expect(messages).to.eql([
            [123, null, "Level 123 message"],
            [DEBUG, null, "Debug message"],
            [INFO, null, "Info message"],
            [ERROR, null, "Error message"],
        ]);
    
    });
    
    test("Add some log messages via the object type", function() {
    
        database.call("default_message_handler.reset");

        database.run(`
            DECLARE
                v_handler t_default_message_handler := t_default_message_handler();
            BEGIN
                v_handler.handle_message(
                    ${ERROR},
                    'Error message'
                );
            END;
        `);

        database.run(`
            DECLARE
                v_handler t_default_message_handler := t_default_message_handler();
            BEGIN
                v_handler.handle_message(
                    ${INFO},
                    'Info message'
                );
            END;
        `);

        database.run(`
            DECLARE
                v_handler t_default_message_handler := t_default_message_handler();
            BEGIN
                v_handler.handle_message(
                    ${DEBUG},
                    'Debug message'
                );
            END;
        `);

        database.run(`
            DECLARE
                v_handler t_default_message_handler := t_default_message_handler();
            BEGIN
                v_handler.handle_message(
                    123,
                    'Level 123 message'
                );
            END;
        `);

        let messages = database.selectRows(`
                log_level,
                log_level_name,
                message
            FROM TABLE(default_message_handler.tail)
        `);
    
        expect(messages).to.eql([
            [123, null, "Level 123 message"],
            [DEBUG, null, "Debug message"],
            [INFO, null, "Info message"],
            [ERROR, null, "Error message"],
        ]);
    
    });

    test("Set capacity to empty tail", function() {
    
        database.call("default_message_handler.reset");

        database.call("default_message_handler.set_capacity", {
            p_capacity: 5
        });

        var size = database.call("default_message_handler.get_capacity");

        expect(size).to.be(5);
    
    });

    test("Add more messages than tail capacity", function() {
    
        database.call("default_message_handler.reset");

        database.call("default_message_handler.set_capacity", {
            p_capacity: 5
        });

        for (var i = 1; i <= 7; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        var tail = database.selectRows(`
                message
            FROM TABLE(default_message_handler.tail)
        `);

        expect(tail).to.eql([
            ["Message 7"],
            ["Message 6"],
            ["Message 5"],
            ["Message 4"],
            ["Message 3"]
        ]);
    
    });

    test("Fill the capacity, increase and fill again", function() {
    
        database.call("default_message_handler.reset");

        database.call("default_message_handler.set_capacity", {
            p_capacity: 5
        });

        for (var i = 1; i <= 5; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        database.call("default_message_handler.set_capacity", {
            p_capacity: 8
        });

        for (var i = 6; i <= 8; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        var tail = database.selectRows(`
                message
            FROM TABLE(default_message_handler.tail)
        `);

        expect(tail).to.eql([
            ["Message 8"],
            ["Message 7"],
            ["Message 6"],
            ["Message 5"],
            ["Message 4"],
            ["Message 3"],
            ["Message 2"],
            ["Message 1"]
        ]);
    
    });
    
    test("Increase capacity when the first message pointer is > 1", function() {
        
        database.call("default_message_handler.reset");

        database.call("default_message_handler.set_capacity", {
            p_capacity: 5
        });

        for (var i = 1; i <= 7; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        var result = database.call("default_message_handler.set_capacity", {
            p_capacity: 7
        });

        for (var i = 8; i <= 9; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        var tail = database.selectRows(`
                message
            FROM TABLE(default_message_handler.tail)
        `);

        expect(tail).to.eql([
            ["Message 9"],
            ["Message 8"],
            ["Message 7"],
            ["Message 6"],
            ["Message 5"],
            ["Message 4"],
            ["Message 3"]
        ]);
    
    });

    test("Decrease capacity when the tail is fully filled, check tail", function() {
    
        database.call("default_message_handler.reset");

        database.call("default_message_handler.set_capacity", {
            p_capacity: 5
        });

        for (var i = 1; i <= 5; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        database.call("default_message_handler.set_capacity", {
            p_capacity: 3
        });

        var tail = database.selectRows(`
                message
            FROM TABLE(default_message_handler.tail)
        `);

        expect(tail).to.eql([
            ["Message 5"],
            ["Message 4"],
            ["Message 3"]
        ]);
    
    });

    test("Decrease capacity when the tail is fully filled, then add more messages", function() {
    
        database.call("default_message_handler.reset");

        database.call("default_message_handler.set_capacity", {
            p_capacity: 5
        });

        for (var i = 1; i <= 5; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        database.call("default_message_handler.set_capacity", {
            p_capacity: 3
        });

        for (var i = 6; i <= 7; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        var tail = database.selectRows(`
                message
            FROM TABLE(default_message_handler.tail)
        `);

        expect(tail).to.eql([
            ["Message 7"],
            ["Message 6"],
            ["Message 5"]
        ]);
    
    });

    test("Decrease capacity when the tail is fully filled and pointer is > 1, then add more messages", function() {
    
        database.call("default_message_handler.reset");

        database.call("default_message_handler.set_capacity", {
            p_capacity: 5
        });

        for (var i = 1; i <= 8; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        database.call("default_message_handler.set_capacity", {
            p_capacity: 3
        });

        for (var i = 9; i <= 10; i++)
            database.call("default_message_handler.handle_message", {
                p_level: INFO,
                p_message: `Message ${i}`
            });

        var tail = database.selectRows(`
                message
            FROM TABLE(default_message_handler.tail)
        `);

        expect(tail).to.eql([
            ["Message 10"],
            ["Message 9"],
            ["Message 8"]
        ]);
    
    });

});