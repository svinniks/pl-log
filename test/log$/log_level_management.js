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
            p_level: 555
        });

        database.commit();

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(555);
    
    });
    
});