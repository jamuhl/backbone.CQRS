# Introduction

Project goal is to simplify the usage of the CQRS Pattern under backbone.js by 
providing needed infrastructure.

# Usage

To use CQRS on the clientside and inside Backbone.js we will need to push _events_ 
to the browser. You can achieve this via websockets, flash, long polling or any 
other technique around.

## Initialization

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


## Wire up commands and events to/from sever

The interface to Backbone.CQRS is provided through `Backbone.CQRS.hub`:

	// pass in events from your socket
	mySocket.on('events', function(data){
		Backbone.CQRS.hub.emit('events', data);
	});

	// pass commands to socket
	Backbone.CQRS.hub.on('commands', function(data) {
		mySocket.emit('commands', data);
	});

## Denormalize event data to you model

First create a denormalizer:

    var personCreatedHandler = new Backbone.CQRS.EventDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });

    var person = Backbone.Model.extend({modelName: 'person'});

    var me = new person({id: '1'});
    me.bindCQRS();

all _personChanged_ events for id = 1 will be applied to the personModel by simply 
set the event data to the model. You could override the apply function like this to 
get more control:

	var person = Backbone.Model.extend({

		modelName: 'person',

        apply: function(data) {
        	if (data.name === 'personChanged') {
        		this.set(data.payload);
        	}

        }
	});

For creational events which aren't applied to an existing model you could 
override the _handle_ function in the eventdenormalizer:

    var PersonCreateHandler = Backbone.CQRS.EventDenormalizer.extend({
        handle: function(evt) {
            // do something
            var person = new person(evt.payload);
            app.persons.add(person);
        }
    });

    var personCreateHandler = new PersonCreateHandler({
        forModel: 'person',
        forEvent: 'personCreated'
    });

## send commands

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