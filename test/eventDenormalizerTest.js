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
            equals(evt.name, 'myEvent2', 'get eventName');
            equals(evt.id, '2', 'get model id');
            equals(evt.get('name'), 'myEvent2', 'get eventName from attr');
            equals(evt.get('payload').project, 'Backbone.CQRS', 'get value from payload');

            start();
        }
    });

    var denorm = new myEventDenormalizer({
        forModel: 'myModel',
        forEvent: 'myEvent2'
    });

    // when
    Backbone.CQRS.hub.emit('events', '{"eventName": "myEvent2", "payload": {"id": "2", "project": "Backbone.CQRS"}}');
});

asyncTest("Pass event through multiple denormalizer with custom handle", function() {

    // given
    var todo = 2;

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
            todo--;
            equals(evt.name, 'myEvent3', 'get eventName');
            equals(evt.id, '3', 'get model id');
            equals(evt.get('name'), 'myEvent3', 'get eventName from attr');
            equals(evt.get('payload').project, 'Backbone.CQRS', 'get value from payload');

            if (!todo) start();
        }
    });

    var denorm1 = new myEventDenormalizer({
        forModel: 'myModel',
        forEvent: 'myEvent3'
    });

    var denorm2 = new myEventDenormalizer({
        forModel: 'myModel',
        forEvent: 'myEvent3'
    });

    // when
    Backbone.CQRS.hub.emit('events', '{"eventName": "myEvent3", "payload": {"id": "3", "project": "Backbone.CQRS"}}');
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
        forEvent: 'myEvent4'
    });

    var myModel = Backbone.Model.extend({
        
        initialize: function() {
            
            Backbone.CQRS.eventHandler.bind('myModel:4', function(evt) {
                equals(evt.name, 'myEvent4', 'get eventName');
                equals(evt.id, '4', 'get model id');
                equals(evt.get('name'), 'myEvent4', 'get eventName from attr');
                equals(evt.get('payload').project, 'Backbone.CQRS', 'get value from payload');

                start();
            });

        }

    });

    var m = new myModel();

    // when
    Backbone.CQRS.hub.emit('events', '{"eventName": "myEvent4", "payload": {"id": "4", "project": "Backbone.CQRS"}}');
});