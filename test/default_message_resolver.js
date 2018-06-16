suite("Default messsage resolver tests", function() {

    test("Reset resolver and try to resolve something (non-existing)", function() {
    
        database.call("default_message_resolver.reset");

        let message = database.call("default_message_resolver.resolve_message", {
            p_code: "MSG-00001"
        });

        expect(message).to.be(null);
    
    });
    
    test("Register a message with NULL code, resolve NULL code", function() {
    
        database.call("default_message_resolver.reset");

        database.call("default_message_resolver.register_message", {
            p_code: null,
            p_message: "Hello, World!"
        });

        let message = database.call("default_message_resolver.resolve_message", {
            p_code: null
        });

        expect(message).to.be(null);
    
    });

    test("Resolve an existing message", function() {
    
        database.call("default_message_resolver.reset");

        database.call("default_message_resolver.register_message", {
            p_code: "MSG-00001",
            p_message: "Hello, World!"
        });

        let message = database.call("default_message_resolver.resolve_message", {
            p_code: "MSG-00001"
        });

        expect(message).to.be("Hello, World!");
    
    });

    test("Test resolver object type", function() {
    
        database.call("default_message_resolver.reset");

        database.call("default_message_resolver.register_message", {
            p_code: "MSG-00001",
            p_message: "Hello, World!"
        });

        let message = database.selectValue(`
                t_default_message_resolver().resolve_message('MSG-00001')
            FROM dual
        `);

        expect(message).to.be("Hello, World!");
    
    });
    

});