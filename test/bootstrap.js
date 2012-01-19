Backbone.CQRS.hub.init({
    parseEvent: function(msg) {
        var data = JSON.parse(msg);
        return {
            name: data.eventName,
            payload: data.payload,
            commandId: data.commandId
        };
    }
});