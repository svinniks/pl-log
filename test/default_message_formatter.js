suite("Default message formatter tests", function() {

    test("Format a message with no prefix and NULL arguments", function() {
    
        let message = database.selectValue(`
                t_default_message_formatter()
                    .format_message(
                        'Hello, World!', 
                        NULL
                    )
            FROM dual
        `);

        expect(message).to.be("Hello, World!");
    
    });

    test("Format a message with no prefix and 10 arguments", function() {
    
        let message = database.selectValue(`
                t_default_message_formatter()
                    .format_message(
                        '1, 2, 3, 4, 5, 6, 7, 8, 9, 10', 
                        t_varchars('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j')
                    )
            FROM dual
        `);

        expect(message).to.be("a, b, c, d, e, f, g, h, i, j");
    
    });

    test("Format a message with no a prefix and 10 arguments", function() {
    
        let message = database.selectValue(`
                t_default_message_formatter(':')
                    .format_message(
                        ':1, :2, :3, :4, :5, :6, :7, :8, :9, :10', 
                        t_varchars('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j')
                    )
            FROM dual
        `);

        expect(message).to.be("a, b, c, d, e, f, g, h, i, j");
    
    });

});