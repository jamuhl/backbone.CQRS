# Introduction

Project goal is to simplify the usage of the CQRS Pattern under backbone.js by 
providing needed infrastructure.

To use CQRS on the clientside and inside Backbone.js we will need to push _events_ 
to the browser. You can achieve this via websockets, flash, long polling or any 
other technique around.

# Download

<section id="download"> 
    <a class="button" href="public/downloads/backbone.CQRS-0.5.6.zip">backbone.CQRS v0.5.6</a> 
</section>

# INITIALIZATION

To configure Backbone.CQRS you got to init the `Backbone.CQRS.hub`.

    // given your events look something like this
    var event = {
        name: 'personChanged', // the unique name of this event
        payload: {
            id: 'someId', // the provided id should match the Backbone.Model.Id
            anotherValue: 'something'
        }   
    };

    // you can go with defaults
    Backbone.CQRS.hub.init();

<a name="init_options" />

You can override a few values on initialisation:

    Backbone.CQRS.hub.init({

        // messageing channels
        commandsChannel: 'commands',
        eventsChannel: 'events',

        // field lookup
        eventNameAttr: 'name',
        eventModelIdAttr: 'payload.id',
        eventResponseToCommandId: 'commandId',

        // override the default parse
        parseEvent: function(msg) {
            var data = JSON.parse(msg);
            return {
                name: data.eventName,
                payload: data.payload,
                commandId: data.commandId
            };
        }
    });

#### override default Backbone.sync

As you only want to GET models, collections from server and do all other operations (
update, delete) via CQRS you can override Backbone.sync with Backbone.CQRS.sync, which will 
only GET data from server and call success callback immediately for all other ops.

    // override Backbone.sync with CQRS.sync which allows only GET method
    Backbone.sync = Backbone.CQRS.sync;


### Wire up commands and events to/from sever

The interface to Backbone.CQRS is provided through `Backbone.CQRS.hub`:

    // pass in events from your socket
    mySocket.on('events', function(data){
        Backbone.CQRS.hub.emit('events', data);
    });

    // pass commands to socket
    Backbone.CQRS.hub.on('commands', function(data) {
        mySocket.emit('commands', data);
    });

# EVENT HANDLING

### Denormalize event data

First create a denormalizer:

    // personChange event
    var personCreatedHandler = new Backbone.CQRS.EventDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

    var person = Backbone.Model.extend({modelName: 'person'});

    var me = new person({id: '1'});
    me.bindCQRS();

all _personChanged_ events payload attributes for id = 1 will be applied to the personModel by simply 
set the event data to the model.

For events that _create_ or _delete_ a model you can create your denormalizer like this:

    // personCreated event
    var personCreatedHandler = new Backbone.CQRS.EventDenormalizer({
        methode: 'create',     // change methode to create
        model: Person,         // pass in model you want create with eventdata
        collection: persons,   // pass in collection 
                               // or function returning collection you want to add to:
                               // collection: function() { return my.not.yet.set.collection },

        // bindings
        forModel: 'person',
        forEvent: 'personCreated'
    });

    // personDeleted event
    var personDeletedHandler = new Backbone.CQRS.EventDenormalizer({
        methode: 'delete', // change methode to delete (will call unbindCQRS and destroy on model)

        // bindings
        forModel: 'person',
        forEvent: 'personDeleted'
    });

<a name="adv_evt_denorm" />

### Advanced options for denormalization

#### 1) change the attribute for model.id or data to set on model

By default Backbone.CQRS will apply `event.payload` to model.

    var PersonCreatedDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        payloadValue: 'payload.person' // payload person will be set on model instead of payload
        modelIdAttr: 'payload.person.Id', // payload.person.id will be model's id instead of payload.id
    });

    var personCreatedHandler = new PersonCreatedDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

#### 2) override the parse function

    var PersonCreatedDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        
        parse: function(evt) {
            
            // evt is a Backbone.CQRS.Event (extending model) so:
            var data = evt.toJSON();

            return {
                value1: data.myAttr.child,
                value2: data.myAttr2.child.child
                
                //...  
            };

        }

    });

    var personCreatedHandler = new PersonCreatedDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

#### 3) override the apply function in denormalizer

    var PersonCreatedDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        
        apply: function(data, model) {
            model.set(data.payload.myAttr);
        },

        // optional override parse too
        parse: function(evt) {   
            // ...
        }

    });

    var personCreatedHandler = new PersonCreatedDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

This way you can control the apply function for the model inside of the eventdenormalizer.

#### 4) override apply function in your model

If you prefer to have the apply function inside you model you could override this 
too, but be aware all events will be routed to the same apply function, so you will have to distinguish events inside your models apply function!

You could override the apply function in your model like this to 
get more control:

    var PersonCreatedDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        
        parse: function(evt) {          
            return evt; // return the pure event object
        }

    });

    var personCreatedHandler = new PersonCreatedDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

    var person = Backbone.Model.extend({

        modelName: 'person',

        apply: function(evt) {
            if (evt.name === 'personChanged') {
                this.set(evt.payload);
            }

        }
    });

    var me = new person({id: '1'});
    me.bindCQRS();

#### 5) override handle function in denormalizer

For creational events which aren't applied to an existing model you could 
override the _handle_ function in the eventdenormalizer:

    var PersonSpecialHandler = Backbone.CQRS.EventDenormalizer.extend({
        handle: function(evt) {
            // do something
        }
    });

    var personSpecialHandler = new PersonSpecialHandler({
        forModel: 'person',
        forEvent: 'personCreated'
    });

# COMMAND HANDLING

### send commands

To send commands just:

    var cmd = new Backbone.CQRS.Command({
        name: 'changePerson',
        payload: {
            id: 8,
            name: 'my name'
        }
    });

    // emit it
    cmd.emit();

<a name="adv_cmd_observ" />

### observe commands

if you want to react on events in respond to a command you can:

    var cmd = new Backbone.CQRS.Command({
        name: 'changePerson',
        commandId: 'someUniqueId', // bring this back in event to resolve it!
        payload: {
            id: 8,
            name: 'my name'
        }
    });

    // observe it
    cmd.observe(function(event) {
        // do something
    });

    // emit it
    cmd.emit();

or just pass in the callback on emit:

    // emit it
    cmd.emit(function(event) {
        // do something
    }););

By default backbone.CQRS will look for a field `commandId` in the event. You can 
override this value or provide a own function to get the commandId in which the event 
was send as response:

    Backbone.CQRS.hub.init({

        eventResponseToCommandId: 'commandId', // override with another value

        // override the getCommandId function
        getCommandId: function(data) {
            return data.msgId.substring(0, data.msgId.indexOf('.')); // or whatever
        }
    });

# Samples

- [sample folder](https://github.com/jamuhl/backbone.CQRS/tree/master/sample) A pure static sample
- [nodeCQRS](https://github.com/jamuhl/nodeCQRS) Sample implementation using socket.io


## Release Notes

### v0.5.6

- small fixes

### v0.5.5

- customizable attribute lookup for model.id and model.data in eventdenormalizers
- changed order: first denormalize than call observers for an event

### v0.5.0

- simplified observe of command

### v0.4.1

- tests 
- samples
- basic event and command handling
