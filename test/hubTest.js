asyncTest("pass a simple message through hub", function() {

    // given
    var process = function(payload) {
        // then
        equals(payload, 'myMessage', 'pass a string through hub');

        // teardown
        Backbone.CQRS.hub.unbind('message', process);

        // go on
        start();
    };

    Backbone.CQRS.hub.on('message', process);

    // when
    Backbone.CQRS.hub.emit('message', 'myMessage');
});

asyncTest("emit parsed backbone.CQRS.Event", function() {

    // given
    var process = function(evt) {

        // then
        equals(evt.name, 'myEvent', 'get eventName');
        equals(evt.id, '1', 'get model id');
        equals(evt.get('name'), 'myEvent', 'get eventName from attr');
        equals(evt.get('payload').project, 'Backbone.CQRS', 'get value from payload');

        // teardown
        Backbone.CQRS.hub.unbind('dispatchEvent', process);

        // go on
        start();
    };

    Backbone.CQRS.hub.on('dispatchEvent', process);
    Backbone.CQRS.hub.init({
        parseEvent: function(msg) {
            var data = JSON.parse(msg);
            return {
                name: data.eventName,
                payload: data.payload
            };
        }
    });

    // when
    Backbone.CQRS.hub.emit('events', '{"eventName": "myEvent", "payload": {"id": "1", "project": "Backbone.CQRS"}}');
});