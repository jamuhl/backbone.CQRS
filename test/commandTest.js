asyncTest("Emit a command", function() {

    // given
    Backbone.CQRS.hub.init();

    var process = function(cmd) {
        // then
        equals(cmd.commandName, 'myCommand', 'get cmdName from attr');
        equals(cmd.payload.project, 'Backbone.CQRS', 'get value from payload');
        
        // teardown
        Backbone.CQRS.hub.unbind('commands', process);

        // go on
        start();
    }; 

    Backbone.CQRS.hub.on('commands', process); 

    var cmd = new Backbone.CQRS.Command({
        commandName: 'myCommand',
        payload: {
            id: 8,
            project: 'Backbone.CQRS'
        }
    });

    // when
    cmd.emit();
});

asyncTest("Emit a command and observe it", function() {

    // given
    Backbone.CQRS.hub.init();

    var process = function(cmd) {
        // simulate event loop
        Backbone.CQRS.hub.emit('events', '{"commandId": "cmd1", "eventName": "myEvent", "payload": {"id": "1", "project": "Backbone.CQRS"}}');
    }; 

    Backbone.CQRS.hub.on('commands', process); 

    var cmd = new Backbone.CQRS.Command({
        id: "cmd1",
        commandName: 'myCommand',
        payload: {
            id: 8,
            project: 'Backbone.CQRS'
        }
    });

    // when
    cmd.observe(function(evt) {
        equals(evt.name, 'myEvent', 'get eventName');
        equals(evt.id, '1', 'get model id');
        equals(evt.get('name'), 'myEvent', 'get eventName from attr');
        equals(evt.get('payload').project, 'Backbone.CQRS', 'get value from payload');

        // teardown
        Backbone.CQRS.hub.unbind('commands', process);

        // go on
        start();
    });
    cmd.emit();
});