(function() {

    // how long server will take to send a response?
    var delay = 1000;

    // Init Backbone.CQRS
    // ------------------
    //
    // as we use default event Pattern 
    // {
    //    'name': 'personChanged', // the unique name of this event
    //    'payload': {
    //        'id': 'someId', // the provided id should match the Backbone.Model.Id
    //        'anotherValue': 'something'
    //    }   
    // }
    //
    // we can just init it:
    Backbone.CQRS.hub.init();



    // Wire up communication to/from server
    // ------------------------------------
    //
    // as we work clientside only we just push back the received commands 
    //
    // HINT: you should pass cmds to server and forward events from server 
    //       via websockets, flash, ...
    Backbone.CQRS.hub.on('commands', function(cmd) {
        var evt = cmd;

        // convert command to event
        if (evt.name === 'createPerson') {
            evt.name = 'personCreated';
            evt.payload.id = _.uniqueId('p'); // add a id on 'serverside'
        } else if (evt.name === 'changePerson') {
            evt.name = 'personChanged';
        }

        // send with some delay - better to see effect
        setTimeout(function() {
            Backbone.CQRS.hub.emit('events', evt);
        }, delay);
    });



    // Create a few EventDenormalizers
    // -------------------------------

    // personCreated event (override defaults)
    var PersonCreateHandler = Backbone.CQRS.EventDenormalizer.extend({

        // bindings
        forModel: 'person',
        forEvent: 'personCreated',

        // as the 'personCreated' event creates a new model
        // we override the handle function
        handle: function(evt) {
            var person = new Person(evt.get('payload'));
            app.persons.add(person);
        }
    });
    var personCreateHandler = new PersonCreateHandler();

    // personChanged event (just go with defaults)
    var personChangedHandler = new Backbone.CQRS.EventDenormalizer({
        forModel: 'person',
        forEvent: 'personChanged'
    });



    // Create Backbone Stuff
    // ---------------------

    // model
    var Person = Backbone.Model.extend({
        modelName: 'person', // so denormalizers can resolve events to model
        initialize: function() {
            // bind this model to get event updates - a lot of magic ;)
            // not more to do the model gets updated now
            this.bindCQRS(); 
        }
    });

    // collection
    var Persons = Backbone.Collection.extend({
        model: Person
    });

    // view and templates
    var personItemTemplate = _.template('<%= personname %> <a class="editPerson" href="">edit</a>');
    var personEditItemTemplate = _.template('<input id="name" type="text" value="<%= personname %>"></input><button id="changePerson">save</button>');

    var PersonItemView = Backbone.View.extend({
        
        tagName: 'li',
        className: 'personItem',

        initialize: function() {
            this.model.bind('change', this.render, this);
        },

        events: {
            'click .editPerson' : 'uiEditPerson',
            'click #changePerson' : 'uiChangePerson'
        },

        // render edit input
        uiEditPerson: function(e) {
            e.preventDefault();
            this.model.editMode = true;
            this.render();
        },

        // send changePerson command with new name
        uiChangePerson: function(e) {
            e.preventDefault();

            var name = this.$('#name').val();

            this.$('#name').val('');
            this.model.editMode = false;
            this.render();

            if (name) {

                // CQRS command
                var cmd = new Backbone.CQRS.Command({
                    name: 'changePerson',
                    payload: { 
                        id: this.model.id,
                        personname: name 
                    }
                });

                // emit it
                cmd.emit();
            }
        },

        render: function() {
            if (this.model.editMode) {
                $(this.el).html(personEditItemTemplate(this.model.toJSON()));
            } else {
                $(this.el).html(personItemTemplate(this.model.toJSON()));
            }
            return this;
        }

    });

    var IndexView =  Backbone.View.extend({

        el: '#index-view',

        initialize: function() {
            _.bindAll(this, 'addPerson');

            this.collection = app.persons;
            this.collection.bind('add', this.addPerson, this);
        },

        events: {
            'click #addPerson' : 'uiAddPerson'
        },

        // send createPerson command
        uiAddPerson: function(e) {
            e.preventDefault();  

            var name = this.$('#name').val();

            if (name) {

                // CQRS command
                var cmd = new Backbone.CQRS.Command({
                    name: 'createPerson',
                    payload: { personname: name }
                });

                // emit it
                cmd.emit();
            }


            this.$('#name').val('');
        },

        render: function() {
            this.collection.each(this.addPerson);
        },

        addPerson: function(person) {
            var view = new PersonItemView({model: person});
            this.$('#persons').append(view.render().el);
        }

    });


    // Bootstrap Backbone
    // ------------------

    var app = {};
    var init = function() {
        app.persons = new Persons([
            {personname: 'Tim', id: _.uniqueId('p')},
            {personname: 'Ida', id: _.uniqueId('p')},
            {personname: 'Rob', id: _.uniqueId('p')}
        ]);


        var indexView = new IndexView();
        indexView.render();
    };

    // kick things off
    $(init);

})();