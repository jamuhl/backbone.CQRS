asyncTest("Emit a command", function() {

    // given
    Backbone.CQRS.hub.init();

    Backbone.CQRS.hub.on('commands', function(cmd) {
        console.log(cmd);

        start();
    }); 

    var cmd = new Backbone.CQRS.Command({
        commandName: 'myCommand',
        payload: {
            id: 8,
            project: 'Backbone.CQRS'
        }
    });

    cmd.emit();
});