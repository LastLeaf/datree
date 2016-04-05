var Shape = require('./shape');

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
        $cache: {
            value: shape.cache && shape.type ? shape.value : undefined,
            writable: shape.cache && shape.type
        },
        $busy: {
            value: 0,
            writable: true
        }
    });
    if(!shape.dynamic) {
        Object.freeze(node.$dynamics);
        Object.freeze(node.$order);
    }

    // link to source
    linkNodeToSource(node, function(){
        // construct children
        var staticChildren = node.$statics;
        if(shape.type) {
            var waitingChildren = 1;
            var waitingChildrenEnd = function(){
                if(!--waitingChildren) {
                    Object.freeze(staticChildren);
                    setTimeout(function(){
                        cb(node);
                    }, 0);
                }
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
            Object.freeze(staticChildren);
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
Node.prototype.destroy = function(){
    unlinkNodeFromSource(this);
};

// get static information
Node.prototype.getShape = function(){
    return this.$shape;
};
Node.prototype.getParent = function(){
    return this.$parent;
};
Node.prototype.getStaticChild = function(childName){
    return this.$statics[String(childName)];
};
Node.prototype.getDynamicChild = function(childName){
    return this.$dynamics[String(childName)];
};
Node.prototype.getChild = function(childName){
    return this.$statics[String(childName)] || this.$dynamics[String(childName)];
};
Node.prototype.getDescendant = function(childName){
    if(!childName) return this;
    var node = this;
    var slices = String(childName).split('/');
    while(slices.length) {
        var slice = decodeURIComponent(slices.shift());
        node = node.$statics[slice] || node.$dynamics[slice];
        if(!node) return;
    }
    return node;
};

// busy state
var increaseBusy = function(node){
    for(; node; node = node.$parent) {
        node.$busy++;
    }
};
var decreaseBusy = function(node){
    for(; node; node = node.$parent) {
        node.$busy--;
    }
};
var removeChildBusy = function(node, removedChild){
    node.$busy -= removedChild.$busy;
};
Node.prototype.isBusy = function(){
    return !!this.$busy;
};

// transform
Node.prototype.transform = function(def, cb){
    var shape = Shape._create(def, this);
    createFromShape(shape, null, cb);
};
Node.combine = function(nodes, filters, cb){
    var def = {
        fields: {},
        cache: false,
        request: filters.request,
        update: filters.update,
        updateFields: filters.updateFields,
    };
    nodes.forEach(function(node){
        if(!(node instanceof Node) || node.$shape.type) return;
        for(var k in node.$shape.fields) {
            def.fields[k] = node.$statics[k];
        }
    });
    var shape = Shape.create(def);
    createFromShape(shape, null, cb);
};

// data flow
var linkNodeToSource = function(node, cb){
    var source = node.$source;
    var destination = node;
    requestTransferData(source, destination, undefined, function(){
        source.destinations[destination.$id] = destination;
        cb();
    });
};
var unlinkNodeFromSource = function(node){
    var source = node.$source;
    var destination = node;
    delete source.$destinations[destination.$id];
};
var requestTransferData = function(source, destination, cb){
    if(source.$shape.type) {
        if(!source.$shape.writable) return setTimeout(cb, 0), undefined;
    } else {
        if(!source.$shape.dynamic) return setTimeout(cb, 0), undefined;
    }
    if(source.$cache === undefined) {
        requestTransferData(source.$source, source, cb);
    } else {
        if(source.$shape.type) transferValue(source, destination, source.$cache, cb);
        else transferFields(source, destination, Object.keys(source.$dynamics), source.order, cb);
    }
};
var transferFields = function(source, destination, updatedFields, order, cb){
    // TODO
    cb();
};
var transferValue = function(source, destination, value, cb){
    // TODO
    cb();
};
Node.prototype.updateFields = function(updatedFields, order, cb){
    // TODO
    cb();
};
Node.prototype.update = function(source, cb){
    // TODO
    cb();
};

// modification
var requestInAncestorChain = function(node, path, args, cb){
    var funcArr = node.$shape.request;
    if(node.$shape.type === 'function') funcArr = node.$shape.value;
    funcArr.filter(node, args.concat(path), function(){
        for(var i=0; i<args.length; i++) {
            if(arguments[i] !== undefined) args[i] = arguments[i];
        }
        if(node.$parent) {
            requestInAncestorChain(node.$parent, encodeURIComponent(node.$shape.parentPath) + '/' + path, args, cb);
        } else {
            cb.apply(null, args);
        }
    });
};
var requestInSourceChain = function(node, args, cb){
    increaseBusy(node);
    requestInAncestorChain(node, args, function(){
        var source = node.$source;
        if(!source) {
            decreaseBusy(node);
            cb.call(node);
            return;
        }
        for(var i=0; i<args.length; i++) {
            if(arguments[i] !== undefined) args[i] = arguments[i];
        }
        requestInSourceChain(source, args, function(){
            decreaseBusy(node);
            cb.call(node);
        });
    });
};
var convertValueToType = function(value, type, defaultValue){
    if(type === 'string') {
        if(typeof(value) === 'number' || typeof(value) === 'boolean' || typeof(value) === 'string') return String(value);
        return defaultValue;
    }
    if(type === 'number') {
        value = Number(value);
        if(Number.isNaN(value)) return defaultValue;
        return value;
    }
    if(type === 'boolean') {
        if(value === undefined) return defaultValue;
        return !!value;
    }
    if(type === 'json') {
        if(value === undefined) return JSON.parse(defaultValue);
        return value;
    }
};
Node.prototype.request = function(value, cb){
    var node = this;
    if(!node.$shape.writable) {
        cb.call(node);
        return;
    }
    value = convertValueToType(value, node.$shape.type, node.$shape.value);
    requestInSourceChain(node, [value], cb);
};
Node.prototype.exec = function(){
    var node = this;
    var args = [];
    var cb = function(){};
    for(var i=0; i<arguments.length; i++) {
        if(typeof(arguments[i]) === 'function') {
            cb = arguments[i];
            break;
        }
        args.push(arguments[i]);
    }
    if(node.$shape.type !== 'function') {
        cb.call(node);
        return;
    }
    requestInSourceChain(node, [], cb);
};

for(var k in Node.prototype) {
    Node.prototype['$' + k] = Node.prototype[k];
}
module.exports = Node;
