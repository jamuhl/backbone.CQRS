# Introduction

Project goal is to simplify the usage of the CQRS Pattern under backbone.js by 
providing needed infrastructure.

# Usage

To use CQRS on the clientside and inside Backbone.js we will need to push _events_ 
to the browser. You can achieve this via websockets, flash, long polling or any 
other technique around.

### Or have a look at sample

- [sample folder](https://github.com/jamuhl/backbone.CQRS/tree/master/sample) A pure static sample
- [nodeCQRS](https://github.com/jamuhl/nodeCQRS) Sample implementation using socket.io

## INITIALIZATION

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

## EVENT HANDLING

### Denormalize event data to matching model

First create a denormalizer:

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
    var personCreateHandler = new Backbone.CQRS.EventDenormalizer({
        methode: 'create',     // change methode to create
        model: Person,         // pass in model you want create with eventdata
        collection: persons,   // pass in collection you want to add your model to

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

You could change this behavior by:

#### 1) change the attribute for data

By default Backbone.CQRS will apply `event.payload` to model.

    var PersonCreateDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        defaultPayloadValue: 'myAttribute' // or 'myAttribute.child1.child2' if it's nested
    });

    var personCreatedHandler = new PersonCreateDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

#### 2) override the parse function

    var PersonCreateDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        
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

    var personCreatedHandler = new PersonCreateDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

#### 3) override the apply function in denormalizer

    var PersonCreateDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        
        apply: function(data, model) {
            model.set(data.payload.myAttr);
        },

        // optional override parse too
        parse: function(evt) {   
            // ...
        }

    });

    var personCreatedHandler = new PersonCreateDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

This way you can control the apply function for the model inside of the eventdenormalizer.

If you prefer to have the apply function inside you model you could override this 
too, but be aware all events will be routed to the same apply function, so you will have to distinguish events inside your models apply function!

You could override the apply function in your model like this to 
get more control:

    var PersonCreateDenormalizer = Backbone.CQRS.EventDenormalizer.extend({
        
        parse: function(evt) {          
            return evt; // return the pure event object
        }

    });

    var personCreatedHandler = new PersonCreateDenormalizer({
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

#### 4) override handle function in denormalizer

For creational events which aren't applied to an existing model you could 
override the _handle_ function in the eventdenormalizer:

    var PersonSpecialHandler = Backbone.CQRS.EventDenormalizer.extend({
        handle: function(evt) {
            // do something
        }
    });

    var personSpecialHandler = new PersonCreateHandler({
        forModel: 'person',
        forEvent: 'personCreated'
    });

## COMMAND HANDLING

### send commands

To send commands just:

    var cmd = new Backbone.CQRS.Command({
        commandName: 'changePerson',
        payload: {
            id: 8,
            name: 'my name'
        }
    });

    // emit it
    cmd.emit();

### observe commands

if you want to react on events in respond to a command you can:

    var cmd = new Backbone.CQRS.Command({
        commandName: 'changePerson',
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

By default backbone.CQRS will look for a field `commandId` in the event. You can 
override this value or provide a own function to get the commandId in which the event 
was send as response:

	Backbone.CQRS.hub.init({

        eventResponseToCommandId: 'commandId', // override with another value

        // override the getCommandId function
        getCommandId: function(data) {
            return data.msgId.substring(0, msg.indexOf('.')); // or whatever
        }
	});

# License

Copyright (c) 2011 Jan Mühlemann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.