//     Backbone.CQRS.js
//     (c) 2012 Jan Mühlemann
//     Backbone.CQRS may be freely distributed under the MIT license.

(function(){

    // Initial Setup
    // -------------

    // Save a reference to the global object.
    var root = this;

    // Save the value of the `Backbone` variable. All extended modules will 
    // be appended to Backbone namespace
    var Backbone = root.Backbone;
    Backbone.CQRS = {};

    // Require Underscore, if we're on the server, and it's not already present.
    var _ = root._;
    if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;

    // For Backbone's purposes, jQuery or Zepto owns the `$` variable.
    var $ = root.jQuery || root.Zepto;
    var noop = $.noop;


    // Message Objects
    // ---------------

    Backbone.CQRS.Message = Backbone.Model.extend({      
        url: noop,
        fetch: noop,
        save: noop,
        destroy: noop
    });

    var Event = Backbone.CQRS.Message.extend({});
    Backbone.CQRS.Command = Backbone.CQRS.Message.extend({
        emit: function() {
            Backbone.CQRS.hub.emit(Backbone.CQRS.hub.commandsChannel, this.parse(this.toJSON()));
        },

        parse: function(data) {
            return data;
        },

        observe: function(callback) {
            Backbone.CQRS.eventHandler.observe(this.id, callback);
        }
    });


    // Event Handling
    // --------------

    // Hub will listen to events and pass them to the eventdispatcher
    var hub = Backbone.CQRS.hub = {

        commandsChannel: 'commands',
        
        defaults: {
            commandsChannel: 'commands',
            eventsChannel: 'events',
            eventNameAttr: 'name',
            eventModelIdAttr: 'payload.id',
            eventResponseToCommandId: 'commandId'
        },

        init: function(options) {
            var self = this;

            if (!this.initialized) {
                this.initialized = true;
            
                options = _.extend(this.defaults, options);
                if (options.parseEvent) this.parseEvent = options.parseEvent;
                if (options.getCommandId) this.getCommandId = options.getCommandId;

                this.commandsChannel = options.commandsChannel;

                this.on(options.eventsChannel, function(msg) {              
                    var evt = new Event();
                    evt.set(this.parseEvent(msg));

                    var attrs = evt.toJSON();
                    evt.name = dive(attrs, options.eventNameAttr);
                    evt.id = dive(attrs, options.eventModelIdAttr);
                    evt.cmdId = self.getCommandId(attrs, options.eventResponseToCommandId);
                    
                    this.emit('dispatchEvent', evt);
                });
            }

        },

        parseEvent: function(msg) {
            var evt = msg;
            if (typeof evt == 'string') {
                evt = JSON.parse(evt);
            }
            return evt;
        },

        getCommandId: function(data, field) {
            return dive(data, field);
        }

    };
    _.extend(hub, Backbone.Events);

    // we use Backbone.Event but provide EventEmitters interface
    hub.on = hub.bind;
    hub.emit = hub.trigger;

    // EventDenormalizer
    // --------------

    Backbone.CQRS.EventDenormalizer = function(options) {
        options = options || {};
        if (options.forEvent) this.forEvent = options.forEvent;
        if (options.forModel) this.forModel = options.forModel;

        if (this.forEvent && this.forModel) this.register.apply(this);

        this.initialize.apply(this, arguments);
    };


    // Set up all inheritable **Backbone.Router** properties and methods.
    _.extend(Backbone.CQRS.EventDenormalizer.prototype, Backbone.Events, {

        defaultPayloadValue: 'payload',

        // Initialize is an empty function by default. Override it with your own
        // initialization logic.
        initialize : noop,

        handle: function(evt) {
            if (evt.id) {
                this.trigger('change:' + evt.id, this.parse(evt), this.apply);
            }
        },

        apply: function(data, model) {
            model.set(data);
        },

        parse: function(evt) {
            if (this.defaultPayloadValue) {
                return dive(evt.toJSON(), this.defaultPayloadValue);
            } else {
                return evt.toJSON();
            } 
        },

        register: function(forEvt, forMdl) {
            
            this.forEvent = forEvt || this.forEvent;
            this.forModel = forMdl || this.forModel;

            Backbone.CQRS.eventHandler.register(this);

        }

    });

    Backbone.CQRS.EventDenormalizer.extend = Backbone.Model.extend;

    // Global EventHandler
    // -------------------
    var EventHandler = Backbone.CQRS.EventDenormalizer.extend({
        
        initialize: function() {
            this.denormalizers = [];
            this.observedCommands = [];
            
            Backbone.CQRS.hub.on('dispatchEvent', function(evt) {
                this.handle(evt);
            }, this);

        },

        getDenormalizer: function(forEvent, forModel) {
            if (forEvent) {
                return _(this.denormalizers).filter(function(r) {
                    return r.forEvent == forEvent;
                });
            } else if (forModel) {
                return _(this.denormalizers).filter(function(r) {
                    return r.forModel == forModel;
                });
            } else {
                return null;
            }
        },

        handle: function(evt) {
            // observing commands
            var pending = this.getPendingCommand(evt);
            if (pending) {
                pending.callback(evt);
                this.removePendingCommand(pending);
            }

            // denormalize
            var denorm = this.getDenormalizer(evt.name);

            _(denorm).each(function(d) {
                d.handle(evt);
            });
        },

        bind: function(ev, callback, context) {
            if (ev.indexOf(':') < 0) return false;

            var parts = ev.split(':'),
                modelName = parts[0],
                evtName = 'change:' + parts[1];
            
            var denorm = this.getDenormalizer(null, modelName);

            _(denorm).each(function(d) {
                d.bind(evtName, callback, context);
            });
        },

        unbind: function(ev, callback) {
            if (ev.indexOf(':') < 0) return false;

            var parts = ev.split(':'),
                modelName = parts[0],
                evtName = 'change:' + parts[1];
            
            var denorm = this.getDenormalizer(null, modelName);

            _(denorm).each(function(d) {
                d.unbind(evtName, callback);
            });
        },

        observe: function(cmdId, callback) {
            this.observedCommands.push({id: cmdId, callback: callback});
        },

        getPendingCommand: function(evt) {
            return _.detect(this.observedCommands, function(pend) {
                return pend.id == evt.cmdId;
            });
        },
        
        removePendingCommand: function(pending) {
            var index = _.indexOf(this.observedCommands, pending);       
            this.observedCommands.splice(index, 1);
        },

        register: function(denormalizer) {
            this.denormalizers.push(denormalizer);
        }

    });

    Backbone.CQRS.eventHandler = new EventHandler();

    // Extend Backbone.Model
    // ---------------------

    Backbone.Model = Backbone.Model.extend({
        
        modelName: null, // you must set this

        bindCQRS: function(modelName) {
            if (modelName) this.modelName = modelName;
            if (!this.modelName) return;
            var id = this.id || this.cid;

            Backbone.CQRS.eventHandler.bind(this.modelName + ':' + id, this.apply);
        },

        unbindCQRS: function(modelName) {
            if (modelName) this.modelName = modelName;
            if (!this.modelName) return;
            var id = this.id || this.cid;

            Backbone.CQRS.eventHandler.unbind(this.modelName + ':' + id, this.apply);
        },

        apply: function(data, funct) { 
            funct.apply(this, data, this);
        }

    });

    // Functions
    // ---------

    var dive = function(obj, key) {
        var keys = key.split('.');
        var x = 0;
        var value = obj;
        while (keys[x]) {
            value = value && value[keys[x]];
            x++;
        }
        return value;
    };


}).call(this);