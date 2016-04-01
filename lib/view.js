var Schema = require('./schema');
var Field = require('./field');

var View = function(){};
View.name = 'Datree.View';
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

    // link to source using transformer
    source._link(view, selectsArr, function(){
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
View.prototype.getShape = function(){};
View.prototype.getParent = function(){};
View.prototype.getChild = function(){};
View.prototype.isBusy = function(){};

// data flow
View.prototype._link = function(destination, transformer, cb){
    // TODO
    cb();
};
View.prototype._unlink = function(destination, transformer, cb){
    // TODO
    cb();
};
View.prototype.transform = function(){};
View.prototype.combine = function(){};

// modification
View.prototype.update = function(){};
View.prototype.insert = function(){};
View.prototype.remove = function(){};

module.exports = View;
