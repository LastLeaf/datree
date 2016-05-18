var expect = require('chai').expect;
var datree = require('..');

var Node = datree.Node;
var Shape = datree.Shape;

describe('Node', function(){

    describe('#create(def, cb)', function(){
        it('should construct a correct node', function(cb){
            expect(Node()).to.be.undefined;
            expect(new Node).to.be.empty;
            var ret = Node.create({}, function(node){
                expect(node).to.be.instanceOf(Node);
                cb();
            });
            expect(ret).to.be.undefined;
        });
    });

    describe('#destroy() #isBusy() #getBusyNode()', function(){
        it('should destroy the node and reset its busy states', function(cb){
            Node.create({
                fields: {
                    c: {
                        type: Boolean,
                        request: function(v, cb){
                            this.async = true;
                            setTimeout(cb, 5);
                        },
                    }
                },
                dynamic: true,
            }, function(node){
                node.request('c', true);
                var busyNode = node.getBusyNode();
                var busyNodeC = node.getBusyNode('c');
                expect(node.getBusyNode('cc')).to.be.undefined;
                expect(node.isBusy()).to.be.true;
                expect(node.isBusy('c')).to.be.true;
                expect(node.isBusy('cc')).to.be.false;
                expect(busyNode.getCachedValue()).to.equal(1);
                expect(busyNodeC.getCachedValue()).to.equal(1);
                expect(busyNode.isBusy()).to.be.false;
                node.getChild('c').destroy();
                node.destroy();
                expect(node.isBusy()).to.be.false;
                expect(node.isBusy('c')).to.be.false;
                expect(busyNode.getCachedValue()).to.equal(0);
                expect(busyNode.isBusy()).to.be.false;
                node.request('c', true);
                expect(node.isBusy()).to.be.false;
                expect(node.isBusy('c')).to.be.false;
                expect(busyNode.getCachedValue()).to.equal(0);
                expect(busyNode.isBusy()).to.be.false;
                setTimeout(cb, 10);
            });
        });
    });

    describe('#getShape()', function(){
        it('should return node\'s shape', function(cb){
            var shape = Shape.create(JSON);
            Node.create(shape, function(node){
                expect(node.getShape()).to.equal(shape);
                cb();
            });
        });
    });

    describe('#getCachedValue()', function(){
        it('should return node\'s value if it is cached', function(cb){
            Node.create({
                fields: {
                    c: {
                        value: 100,
                    }
                }
            }, function(node){
                expect(node.getCachedValue('c')).to.equal(100);
                expect(node.getCachedValue('cc')).to.be.undefined;
                cb();
            });
        });
    });

    describe('#getParent() #getFieldName()', function(){
        it('should return node\'s parent node and its field name', function(cb){
            Node.create({
                fields: {
                    c: function(){},
                }
            }, function(node){
                var c = node.getChild('c');
                expect(c.getParent()).to.equal(node);
                expect(c.getFieldName()).to.equal('c');
                cb();
            });
        });
    });

    describe('#getChild(key) #getStaticChild(key) #getDynamicChild(key)', function(){
        it('should return node\'s specified child', function(cb){
            Node.create({
                fields: {
                    '$-$': function(){},
                    c: Number,
                },
                dynamic: true,
            }, function(node){
                expect(node.getChild('$-$')).to.be.instanceOf(Node);
                expect(node.getStaticChild('$-$')).to.be.instanceOf(Node);
                expect(node.getDynamicChild('$-$')).to.be.undefined;
                expect(node.getDynamicChild('c')).to.be.undefined;
                expect(node['$-$']).to.be.undefined;
                node.get('$-$').createField('c', String, function(f){
                    expect(f).to.be.undefined;
                    node.createField('c', String, function(field){
                        node.createField('@_@', String, function(field2){
                            node.updateFields([field, field2]);
                            expect(node.c).to.equal(0);
                            expect(node.getChild('c').getCachedValue()).to.equal(0);
                            expect(node.getStaticChild('c').getCachedValue()).to.equal(0);
                            expect(node.getDynamicChild('c').getCachedValue()).to.equal('');
                            expect(node.getChild('@_@').getCachedValue()).to.equal('');
                            cb();
                        });
                    });
                });
            });
        });
    });

    describe('#getDescendant(path)', function(){
        it('should return node\'s descendant of the given path', function(cb){
            Node.create({
                fields: {
                    '$-$': {
                        fields: {
                            c: Boolean
                        }
                    },
                }
            }, function(node){
                expect(node.getDescendant('')).to.equal(node);
                expect(node.getDescendant([])).to.equal(node);
                expect(node.getDescendant('$-$')).to.be.instanceOf(Node);
                expect(node.getDescendant(['$-$', 'c'])).to.be.instanceOf(Node);
                expect(node.getDescendant(['$-$', '$-$'])).to.be.undefined;
                expect(node.getDescendant(['$-$', 'c', '$-$'])).to.be.undefined;
                cb();
            });
        });
    });

    describe('#get(key)', function(){
        it('should return node\'s cached value (if no key given) or child node', function(cb){
            Node.create({
                fields: {
                    '$-$': {
                        value: 'str'
                    },
                }
            }, function(node){
                expect(node.get()).to.be.undefined;
                expect(node.get('c')).to.be.undefined;
                expect(node.get('$-$').get()).to.equal('str');
                cb();
            });
        });
    });

    describe('#getDynamicChildren()', function(){
        it('should return an array of node\'s dynamic children', function(cb){
            Node.create({
                dynamic: true,
            }, function(sourceNode){
                sourceNode.transform({link: sourceNode}, function(node){
                    sourceNode.createField('f1', String, function(f1){
                        sourceNode.createField('f2', function(){}, function(f2){
                            sourceNode.updateFields([f2], function(){
                                sourceNode.updateFields([f1, f2], function(){
                                    var arr = node.getDynamicChildren();
                                    expect(arr[0]).to.be.instanceOf(Node);
                                    expect(arr[0].get()).to.equal(node.getCachedValue('f1'));
                                    expect(arr[1]).to.be.instanceOf(Node);
                                    expect(arr[1].get()).to.be.undefined;
                                    expect(arr[1].getCachedValue()).to.be.undefined;
                                    expect(arr[2]).to.be.undefined;
                                    node.f2(cb);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('#forEach(cb) #forIn(cb)', function(){
        it('should iterate node\'s children by index', function(cb){
            Node.create({
                dynamic: true,
            }, function(node){
                node.createField('f1', String, function(f1){
                    node.createField('f2', {}, function(f2){
                        node.updateFields([f1, f2], function(){
                            node.forEach(function(field, i, n){
                                expect(n).to.equal(node);
                                var arr = ['', f2];
                                expect(field).to.equal(arr[i]);
                            });
                            node.forIn(function(fieldName, field, n){
                                expect(n).to.equal(node);
                                var arr = {
                                    f1: '',
                                    f2: f2,
                                };
                                expect(field).to.equal(arr[fieldName]);
                            });
                            cb();
                        });
                    });
                });
            });
        });
    });

    describe('#createField(key, def, cb) #updateFields(arr, cb)', function(){
        it('should update fields for dynamic nodes', function(cb){
            Node.create({
                fields: {
                    c: {}
                },
                dynamic: true,
            }, function(node){
                node.createField('d', {dynamic: true}, function(d){
                    node.updateFields([d, d], function(){
                        expect(node.d).to.be.instanceOf(Node);
                        node.c.updateFields([d], function(){
                            expect(node.c.d).to.be.undefined;
                            node.updateFields('e', [d], function(){
                                expect(node.e).to.be.undefined;
                                node.updateFields('d', [d], function(){
                                    expect(node.d.d).to.be.undefined;
                                    cb();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('#update(value, cb)', function(){
        it('should update fields for dynamic nodes', function(cb){
            Node.create({
                dynamic: true,
            }, function(node){
                node.createField('d', Boolean, function(d){
                    node.updateFields([d], function(){
                        node.update('dd', true, function(){
                            expect(node.dd).to.be.undefined;
                            node.update('d', true, function(){
                                expect(node.d).to.be.true;
                                cb();
                            });
                        });
                    });
                });
            });
        });
    });

    describe('#request(value, cb)', function(){
        it('should raise requests', function(cb){
            Node.create({
                fields: {
                    num: {
                        type: 'number',
                        value: 1,
                    },
                    str: {
                        type: 'string',
                        value: 's',
                    },
                    bool: {
                        type: 'boolean',
                        value: true,
                    },
                    ro: {
                        value: false,
                        writable: false,
                        request: function(){
                            throw new Error();
                        }
                    }
                },
                dynamic: true,
            }, function(node){
                node.get('num').request(undefined, function(){
                    expect(node.num).to.equal(1);
                    node.request('str', undefined, function(){
                        expect(node.str).to.equal('s');
                        node.request('bool', undefined, function(){
                            expect(node.bool).to.be.true;
                            node.createField('json', {
                                type: 'json',
                                value: [0, 1]
                            }, function(f){
                                node.updateFields([f], function(){
                                    node.request('json', undefined, function(){
                                        expect(node.json).to.have.lengthOf(2);
                                        node.request('ro', true, function(){
                                            expect(node.ro).to.be.false;
                                            cb();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('#exec(cb)', function(){
        it('should execute function-typed nodes', function(cb){
            Node.create({
                fields: {
                    c: Boolean,
                },
                dynamic: true,
            }, function(node){
                node.createField('func', Boolean, function(func){
                    node.updateFields([func], function(){
                        node.get('func').exec();
                        setTimeout(function(){
                            node.get('c').exec(cb);
                        });
                    });
                });
            });
        });
    });

});
