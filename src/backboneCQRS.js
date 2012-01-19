//     Backbone.js 0.5.3
//     (c) 2010 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://documentcloud.github.com/backbone

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

    Backbone.CQRS.Event = Backbone.CQRS.Message;
    Backbone.CQRS.Command = Backbone.CQRS.Message;


    // Event Handling
    // --------------

    // Hub will listen to events and pass them to the eventdispatcher
    var hub = Backbone.CQRS.hub = {
        
        defaults: {
            commandsChannel: 'commands',
            eventsChannel: 'events',
            eventNameAttr: 'name',
            eventModelIdAttr: 'payload.id'
        },

        parseEvent: function(msg) {
            var evt = msg;
            if (typeof evt == 'string') {
                evt = JSON.parse(evt);
            }
            return evt;
        },

        init: function(options) {
            
            options = _.extend(this.defaults, options);
            if (options.parseEvent) this.parseEvent = options.parseEvent;

            this.on(options.eventsChannel, function(msg) {              
                var evt = new Backbone.CQRS.Event();
                evt.set(this.parseEvent(msg));

                var attrs = evt.toJSON();
                evt.name = dive(attrs, options.eventNameAttr);
                evt.id = dive(attrs, options.eventModelIdAttr);
                
                this.emit('dispatchEvent', evt);
            });

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

        // Initialize is an empty function by default. Override it with your own
        // initialization logic.
        initialize : noop,

        handle: function(evt) {
            if (evt.id) {
                this.trigger('change:' + evt.id, this.parse(evt));
            }
        },

        parse: function(evt) {
            return evt;
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
            
            Backbone.CQRS.hub.on('dispatchEvent', function(evt) {
                this.handle(evt);
            }, this);

        },

        getDenormalizer: function(forEvent, forModel) {
            if (forEvent) {
                return _(this.denormalizers).detect(function(r) {
                    return r.forEvent == forEvent;
                });
            } else if (forModel) {
                return _(this.denormalizers).detect(function(r) {
                    return r.forModel == forModel;
                });
            } else {
                return null;
            }
        },

        handle: function(evt) {
            var denorm = this.getDenormalizer(evt.name);

            if (denorm) denorm.handle(evt);
        },

        bind: function(ev, callback, context) {
            if (ev.indexOf(':') < 0) return false;

            var parts = ev.split(':'),
                modelName = parts[0],
                evtName = 'change:' + parts[1];
            
            var denorm = this.getDenormalizer(null, modelName);

            if (denorm) denorm.bind(evtName, callback, context);
        },

        unbind: function(ev, callback) {
            if (ev.indexOf(':') < 0) return false;

            var parts = ev.split(':'),
                modelName = parts[0],
                evtName = 'change:' + parts[1];
            
            var denorm = this.getDenormalizer(null, modelName);

            if (denorm) denorm.unbind(evtName, callback);
        },

        register: function(denormalizer) {
            this.denormalizers.push(denormalizer);
        }

    });

    Backbone.CQRS.eventHandler = new EventHandler();

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