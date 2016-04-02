var Shape = require('./shape');
var Field = require('./field');

var Node = function(){};
Node.name = 'Datree.Node';
Node.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Node,
        writable: true,
        configurable: true
    }
});

// create and destroy
var nodeIdTimestamp = 0;
var nodeIdIncrement = 0;
var generateNodeId = function(){
    var timestamp = Date.now();
    if(timestamp !== nodeIdTimestamp) {
        nodeIdTimestamp = timestamp;
        nodeIdIncrement = 0;
    }
    return timestamp + '~' + (++nodeIdIncrement);
};
var createFromShape = function(shape, parent, cb){
    var nodeId = generateNodeId();
    var source = shape.source;
    if(shape.type !== 'node') {

    }

    // construct fields
    var selects = {};
    var appends = {};
    for(var k in shape.fields) {
        var field = shape.fields[k];
        if(field.link) {
            selects[k] = Field.create(node, field);
        } else {
            appends[k] = Field.create(node, shape.fields[k]);
        }
    }

    // construct core data
    var node = Object.create(Node.prototype, {
        '~id': { value: nodeId },
        '~shape': { value: shape },
        '~source': { value: source },
        '~parent': { value: parent },
        '~children': { value: children },
        '~selects': { value: selects },
        '~appends': { value: appends },
        '~busy': { value: 0, writable: true },
        '~destinations': { value: {} },
    });

    // link to source
    setTimeout(function(){
        linkNodes(source, node, selects, function(){
            // TODO
            cb(node);
        });
    }, 0);
    return node;
};
Node.create = function(shape, cb){
    if(shape instanceof Shape) createFromShape(shape, null, cb);
    else createFromShape(Shape.create(shape), null, cb);
};
Node.prototype.destroy = function(){};

// get static information
Node.prototype.getShape = function(){
    return this['~shape'];
};
Node.prototype.getParent = function(){
    return this['~parent'];
};
Node.prototype.getChild = function(childName){
    if(!childName) return this;
    var node = this;
    var slices = String(childName).split('.');
    while(slices.length) {
        node = node['~children'][slices.shift()];
        if(!node) return;
    }
    return node;
};
Node.prototype.isBusy = function(childName){
    var child = Node.prototype.getChild.call(this, childName);
    return !!child['~busy'];
};

// transform
Node.prototype.transform = function(){};
Node.prototype.combine = function(){};

// data flow
var linkNodes = function(source, destination, selects, cb){
    var destinations = source['~destinations'];
    destinations[destination['~id']] = {
        destination: destination,
        selects: selects,
    };
    transferInitData(source, destination, cb);
};
var unlinkNodes = function(source, destination){
    var destinations = source['~destinations'];
    delete destinations[destination['~id']];
};
var transferInitData = function(source, destination, cb){};
var transferDiffData = function(source, destination, cb){};
Node.prototype.sync = function(source, cb){};

// modification
Node.prototype.update = function(){};
Node.prototype.exec = function(){};

module.exports = Node;
