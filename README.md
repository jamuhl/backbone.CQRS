# Introduction

Project goal is to simplify the usage of the CQRS Pattern under backbone.js by 
providing needed infrastructure.

### Samples

- [sample folder](https://github.com/jamuhl/backbone.CQRS/tree/master/sample) A pure static sample
- [nodeCQRS](https://github.com/jamuhl/nodeCQRS) Sample implementation using socket.io

# Usage

To use CQRS on the clientside and inside Backbone.js we will need to push _events_ 
to the browser. You can achieve this via websockets, flash, long polling or any 
other technique around.

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

There are a few options you can pass in on init. You find more information [here](file:///home/jan/Projects/backbone.CQRS/index.html#n2).


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
        collection: persons,   // pass in collection or function returning collection you want to add to

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

For advanced options for denormalizing look [here](file:///home/jan/Projects/backbone.CQRS/index.html#n6).


## COMMAND HANDLING

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

You can react on an event responding to a command. Find more information [here](file:///home/jan/Projects/backbone.CQRS/index.html#n9).

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