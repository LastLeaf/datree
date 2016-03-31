var Schema = require('./schema');
var Field = require('./field');

var View = function(){};
View.name = 'Dbview.View';
View.prototype = Object.create(Object.prototype, {
    constructor: {
        value: View,
        writable: true,
        configurable: true
    }
});

// create and destroy
var createFromSchema = function(schema, parent, cb){
    var view = Object.create(View.prototype);
    var source = schema.source;

    // construct fields
    var selectsArr = [];
    var selects = {};
    var appends = {};
    for(var k in schema.fields) {
        var field = schema.fields[k];
        if(field.link) {
            selects[k] = Field.create(view, field);
            selectsArr.push(field.link);
        } else {
            appends[k] = Field.create(view, schema.fields[k]);
        }
    }

    // TODO parse immutables in transformer

    // construct transformer, modifier, and appender
    var transformer = Object.freeze({
        select: selects,
        // having: schema.having,
        where: schema.where,
        orderBy: schema.orderBy,
        skip: schema.skip,
        limit: schema.limit,
    });
    var modifier = Object.freeze({
        having: schema.having,
    });
    var appender = Object.freeze(appends);

    // link to source using transformer
    source._link(view, transformer, function(){
        // TODO
        cb(view);
    });
};
View.create = function(schema, cb){
    if(schema instanceof Schema) createFromSchema(schema, null, cb);
    else createFromSchema(Schema.create(schema), null, cb);
};
View.prototype.destroy = function(){};

// get static information
View.prototype.getSchema = function(){};
View.prototype.getTransformer = function(){};
View.prototype.getModifier = function(){};
View.prototype.getParent = function(){};
View.prototype.getCachedValue = function(){};
View.prototype.getBusyState = function(){};

// data flow
View.prototype._link = function(destination, transformer, cb){
    // TODO
    cb();
};
View.prototype.getItem = function(){};
View.prototype.getChild = function(){};
View.prototype.transform = function(){};

// modification
View.prototype.update = function(){};
View.prototype.insert = function(){};
View.prototype.remove = function(){};

module.exports = View;
