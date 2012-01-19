asyncTest("Pass event through denormalizer with custom handle", function() {

    // given
    Backbone.CQRS.hub.init({
        parseEvent: function(msg) {
            var data = JSON.parse(msg);
            return {
                name: data.eventName,
                payload: data.payload
            };
        }
    });

    var myEventDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        handle: function(evt) {
            equals(evt.name, 'myEvent', 'get eventName');
            equals(evt.id, '1', 'get model id');
            equals(evt.get('name'), 'myEvent', 'get eventName from attr');
            equals(evt.get('payload').project, 'Backbone.CQRS', 'get value from payload');

            start();
        }
    });

    var denorm = new myEventDenormalizer({
        forModel: 'myModel',
        forEvent: 'myEvent'
    });

    // when
    Backbone.CQRS.hub.emit('events', '{"eventName": "myEvent", "payload": {"id": "1", "project": "Backbone.CQRS"}}');
});

asyncTest("Pass event through denormalizer to model", function() {

    // given
    Backbone.CQRS.hub.init({
        parseEvent: function(msg) {
            var data = JSON.parse(msg);
            return {
                name: data.eventName,
                payload: data.payload
            };
        }
    });

    var myEventDenormalizer = new Backbone.CQRS.EventDenormalizer({
        forModel: 'myModel',
        forEvent: 'myEvent'
    });

    var myModel = Backbone.Model.extend({
        
        initialize: function() {
            
            Backbone.CQRS.eventHandler.bind('myModel:1', function(evt) {
                equals(evt.name, 'myEvent', 'get eventName');
                equals(evt.id, '1', 'get model id');
                equals(evt.get('name'), 'myEvent', 'get eventName from attr');
                equals(evt.get('payload').project, 'Backbone.CQRS', 'get value from payload');

                start();
            });

        }

    });

    var m = new myModel();

    // when
    Backbone.CQRS.hub.emit('events', '{"eventName": "myEvent", "payload": {"id": "1", "project": "Backbone.CQRS"}}');
});