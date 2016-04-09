var Node = require('./node');

var MemorySource = function MemorySource(){};
MemorySource.prototype = Object.create(Object.prototype, {
    constructor: {
        value: MemorySource,
        writable: true,
        configurable: true
    }
});

var createSourceDef = function(structure){
    if(typeof(structure) === 'object') {
        if(structure instanceof Array) {
            // create a dynamic node
            return {
                dynamic: true,
                fields: {
                    curId: {
                        type: 'number',
                        value: 0,
                        writable: false,
                    },
                    append: {
                        type: 'json',
                        cache: false,
                        request: function(structure, cb){
                            var node = this.node;
                            this.async = true;
                            var def = createSourceDef(structure);
                            node.createField(node.curId, def, function(childNode){
                                var children = node.getDynamicChildren();
                                node.updateFields(children.concat(childNode), cb);
                            });
                            node.get('curId').update(node.curId + 1);
                        }
                    },
                    remove: {
                        type: 'string',
                        cache: false,
                        request: function(fieldName, cb){
                            var newChildren = [];
                            this.forEach(function(child){
                                if(child.getFieldName() === fieldName) return;
                                newChildren.push(child);
                            });
                            this.updateFields(newChildren, cb);
                        }
                    }
                },
                create: function(cb){
                    var node = this;
                    structure.forEach(function(item){
                        var def = createSourceDef(item);
                        node.createField(node.curId, def, function(childNode){
                            var children = node.getDynamicChildren();
                            node.updateFields(children.concat(childNode), cb);
                        });
                    });
                    node.get('curId').update(structure.length, cb);
                },
            };
        } else {
            // create a static node
            var res = {
                fields: {}
            };
            for(var k in structure) {
                res.fields[k] = createSourceDef(structure[k]);
            }
            return res;
        }
    }
    // return a leaf node with value
    return { value: structure };
};
MemorySource.create = function(structure, cb){
    var def = createSourceDef(structure);
    Node.create(def, cb);
};

module.exports = MemorySource;
