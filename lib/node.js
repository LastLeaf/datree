var Shape = require('./shape');
var Field = require('./field');

var Node = function Node(){};
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
    return timestamp + '$' + (++nodeIdIncrement);
};
var createFromShape = function(shape, parent, cb){
    var nodeId = generateNodeId();
    var source = shape.source;

    // construct core data
    var node = Object.create(Node.prototype, {
        $id: { value: nodeId },
        $shape: { value: shape },
        $parent: { value: parent },
        $statics: { value: {} },
        $dynamics: { value: {} },
        $order: { value: [] },
        $source: { value: shape.link },
        $destinations: { value: {} },
        $blocking: { value: true, writable: true }
    });

    // link to source
    linkNodes(source, node, function(){
        // construct children
        var staticChildren = node.$statics;
        if(shape.type) {
            var waitingChildren = 1;
            var waitingChildrenEnd = function(){
                if(!--waitingChildren) setTimeout(function(){
                    cb(node);
                }, 0);
            };
            for(var k in shape.fields) (function(k){
                waitingChildren++;
                createFromShape(shape.fields[k], node, function(node){
                    staticChildren[k] = node;
                    waitingChildrenEnd();
                });
            })(k);
            waitingChildrenEnd();
        } else {
            setTimeout(function(){
                cb(node);
            }, 0);
        }
    });
};
Node.create = function(shape, cb){
    if(shape instanceof Shape) createFromShape(shape, null, cb);
    else createFromShape(Shape.create(shape), null, cb);
};
Node.prototype.destroy = function(){};

// get static information
Node.prototype.getShape = function(){
    return this.$shape;
};
Node.prototype.getParent = function(){
    return this.$parent;
};
Node.prototype.getStaticChild = function(childName){
    if(!childName) return this;
    var node = this;
    var slices = String(childName).split('/');
    while(slices.length) {
        node = decodeURIComponent(node.$statics[slices.shift()]);
        if(!node) return;
    }
    return node;
};
Node.prototype.getDynamicChild = function(childName){
    if(!childName) return this;
    var node = this;
    var slices = String(childName).split('/');
    while(slices.length) {
        node = decodeURIComponent(node.$dynamics[slices.shift()]);
        if(!node) return;
    }
    return node;
};
Node.prototype.getChild = function(childName){
    if(!childName) return this;
    var node = this;
    var slices = String(childName).split('/');
    while(slices.length) {
        var slice = slices.shift();
        node = decodeURIComponent(node.$statics[slice] || node.$dynamics[slice]);
        if(!node) return;
    }
    return node;
};
Node.prototype.isBusy = function(childName){
    var child = Node.prototype.getChild.call(this, childName);
    return !!child.$busy;
};

// transform
Node.prototype.transform = function(){};
Node.prototype.combine = function(){};

// data flow
var linkNodes = function(source, destination, selects, cb){
    var destinations = source.$destinations;
    destinations[destination.$id] = {
        destination: destination,
        selects: selects,
    };
    transferInitData(source, destination, cb);
};
var unlinkNodes = function(source, destination){
    var destinations = source.$destinations;
    delete destinations[destination.$id];
};
var transferInitData = function(source, destination, cb){
    // TODO
    cb();
};
var transferDiffData = function(source, destination, cb){};
Node.prototype.sync = function(source, cb){};

// modification
Node.prototype.update = function(){};
Node.prototype.exec = function(){};

module.exports = Node;
