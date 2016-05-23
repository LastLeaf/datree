var expect = require('chai').expect;
var datree = require('..');

var Shape = datree.Shape;
var Node = datree.Node;
var NodeError = datree.Error;

describe('Shape', function(){
    var shape = null;
    var node = null;
    var linked = null;

    describe('#create(def) [with no links]', function(){

        before(function(){
            shape = Shape.create({
                cache: false,
                dynamic: true,
                fields: {
                    str: {
                        value: 'str1',
                        writable: false,
                        request: function(){}
                    },
                    num: {
                        cache: true,
                        type: Number
                    },
                    sub: {
                        cache: true,
                        writable: false,
                        fields: {
                            bool: {
                                cache: false,
                                value: true,
                                request: [1, 'a']
                            },
                            json: {
                                writable: true,
                                type: JSON,
                                value: [1,2,3]
                            },
                        },
                        update: function(){}
                    },
                    del: {
                        value: 0
                    },
                },
                addFields: {
                    func: function(){
                        return 'func1';
                    },
                },
                removeFields: ['del'],
                updateFields: [function sync1(){}, function sync2(){}]
            });
        });

        it('should construct a frozen shape', function(){
            expect(shape).to.be.an.instanceof(Shape);
            expect(shape.fields.func).to.be.an.instanceof(Shape);
            expect(shape).to.be.deep.frozen;
        });

        it('should have correct parent options', function(){
            expect(shape.parent).to.equal(null);
            expect(shape.fields.str.parent).to.equal(shape);
        });

        it('should have no link options', function(){
            expect(shape.link).to.be.undefined;
            expect(shape.fields.str.link).to.be.undefined;
        });

        it('should inherit "cache" options', function(){
            expect(shape.cache).to.be.false;
            expect(shape.fields.str.cache).to.be.false;
            expect(shape.fields.num.cache).to.be.true;
            expect(shape.fields.sub.fields.bool.cache).to.be.false;
            expect(shape.fields.sub.fields.json.cache).to.be.true;
        });

        it('should inherit "writable" options', function(){
            expect(shape.writable).to.be.true;
            expect(shape.fields.str.writable).to.be.false;
            expect(shape.fields.num.writable).to.be.true;
            expect(shape.fields.sub.writable).to.be.false;
            expect(shape.fields.sub.fields.bool.writable).to.be.false;
            expect(shape.fields.sub.fields.json.writable).to.be.false;
        });

        it('should have currect "dynamic" options', function(){
            expect(shape.dynamic).to.be.true;
            expect(shape.fields.sub.dynamic).to.be.false;
        });

        it('should have currect fields', function(){
            expect(shape.fields.func).to.be.ok;
            expect(shape.fields.del).to.be.undefined;
            expect(shape.fields.sub.fields.str).to.be.undefined;
        });

        it('should have correct types', function(){
            expect(shape.type).to.be.undefined;
            expect(shape.fields.sub.type).to.be.undefined;
            expect(shape.fields.str.type).to.equal('string');
            expect(shape.fields.num.type).to.equal('number');
            expect(shape.fields.sub.fields.bool.type).to.equal('boolean');
            expect(shape.fields.sub.fields.json.type).to.equal('json');
            expect(shape.fields.func.type).to.equal('function');
        });

        it('should have currect default values', function(){
            expect(shape.value).to.be.undefined;
            expect(shape.fields.sub.value).to.be.undefined;
            expect(shape.fields.str.value).to.equal('str1');
            expect(shape.fields.num.value).to.equal(0);
            expect(shape.fields.sub.fields.bool.value).to.equal(true);
            expect(shape.fields.sub.fields.json.value).to.equal('[1,2,3]');
            expect(shape.fields.func.value.constructor.name).to.equal('FuncArr');
            expect(shape.fields.func.value.funcs).to.have.lengthOf(1);
        });

        it('should have correct filters', function(){
            expect(shape.request.funcs).to.have.lengthOf(0);
            expect(shape.update.funcs).to.have.lengthOf(0);
            expect(shape.create.funcs).to.have.lengthOf(0);
            expect(shape.destroy.funcs).to.have.lengthOf(0);
            expect(shape.updateFields.funcs).to.have.lengthOf(2);
            expect(shape.updateFields.funcs[0].name).to.equal('sync1');
            expect(shape.updateFields.funcs[1].name).to.equal('sync2');
            expect(shape.fields.str.request.funcs).to.have.lengthOf(1);
            expect(shape.fields.num.update).to.be.undefined;
            expect(shape.fields.sub.request.funcs).to.have.lengthOf(0);
            expect(shape.fields.sub.update.funcs).to.have.lengthOf(1);
            expect(shape.fields.sub.fields.bool.update).to.be.undefined;
            expect(shape.fields.sub.fields.bool.updateFields).to.be.undefined;
        });

    });

    describe('#create(def) [with links]', function(){

        before(function(cb){
            Node.create(shape, function(newNode){
                node = newNode;
                linked = Shape.create({
                    source: node,
                    f1: 'num',
                    f2: {
                        link: 'num',
                        type: 'number',
                        value: 0,
                        cache: false,
                        writable: false,
                        request: function(){},
                        update: function(){},
                    },
                    f3: {
                        source: 'sub',
                        writable: false,
                        addFields: {
                            f4: node,
                        },
                        removeFields: {
                            bool: true,
                            json: false
                        },
                        dynamic: true
                    },
                    f4: Number,
                    addFields: {
                        f1: ['sub', 'json']
                    },
                    removeFields: ['f4'],
                });
                cb();
            });
        });

        it('should construct a frozen shape', function(){
            expect(linked).to.be.instanceof(Shape);
            expect(linked).to.be.deep.frozen;
        });

        it('should have correct links', function(){
            expect(linked.link).to.be.undefined;
            expect(linked.fields.f1.link).to.equal(node.getDescendant(['sub', 'json']));
            expect(linked.fields.f2.link).to.equal(node.getChild('num'));
            expect(linked.fields.f3.link).to.be.undefined;
            expect(linked.fields.f3.fields.json.link).to.equal(node.sub.getChild('json'));
            expect(linked.fields.f3.fields.f4.link).to.equal(node);
            expect(linked.fields.f3.fields.f4.fields.sub.link).to.equal(node.sub);
        });

        it('should inherit correct options', function(){
            expect(linked.dynamic).to.be.false;
            expect(linked.fields.f3.dynamic).to.be.true;
            expect(linked.fields.f3.fields.f4.dynamic).to.be.true;
            expect(linked.fields.f1.type).to.equal('json');
            expect(linked.fields.f1.value).to.equal('[1,2,3]');
            expect(linked.fields.f1.writable).to.be.false;
            expect(linked.fields.f1.cache).to.be.true;
            expect(linked.fields.f2.type).to.equal('number');
            expect(linked.fields.f2.value).to.equal(0);
            expect(linked.fields.f2.writable).to.be.false;
            expect(linked.fields.f2.cache).to.be.false;
            expect(linked.fields.f3.fields.f4.type).to.be.undefined;
            expect(linked.fields.f3.fields.f4.value).to.be.undefined;
            expect(linked.fields.f3.fields.f4.writable).to.be.false;
            expect(linked.fields.f3.fields.f4.fields.num.writable).to.be.false;
            expect(linked.fields.f3.fields.f4.fields.sub.writable).to.be.false;
        });

        it('should not inherit filters', function(){
            expect(linked.fields.f2.request.funcs).to.have.lengthOf(1);
            expect(linked.fields.f2.update.funcs).to.have.lengthOf(1);
        });

    });

    describe('#create(def) [with errors]', function(){

        it('should return nothing when calling the constructor.', function(){
            expect(Shape()).to.be.undefined;
            expect(new Shape).to.be.empty;
        });

        it('should match value with correct types.', function(){
            var cases = [
                { type: 'string', value: '' },
                { type: 'string', value: true, throws: NodeError },
                { type: 'number', value: .2 },
                { type: 'number', value: NaN },
                { type: 'boolean', value: false },
                { type: 'boolean', value: '', throws: NodeError },
                { type: 'json', value: null },
                { type: 'function', value: function(){} },
                { type: 'function', value: [function(){}, function(){}] },
                { type: 'function', value: linked.request },
                { type: 'function', value: {}, throws: NodeError },
                { type: '...', value: {}, throws: NodeError },
            ];
            cases.forEach(function(def){
                try {
                    Shape.create({
                        fields: {
                            f1: def
                        }
                    });
                    expect(def.throws).to.be.undefined;
                } catch(err) {
                    expect(err).to.be.instanceof(def.throws);
                }
            });
        });

        it('should set currect types for values.', function(){
            var cases = [
                {value: '', expectType: 'string'},
                {value: -1, expectType: 'number'},
                {value: NaN, expectType: 'number'},
                {value: false, expectType: 'boolean'},
                {value: null, expectType: 'json'},
                {value: {}, expectType: 'json'},
                {value: [], expectType: 'json'},
                {value: [1, function(){}], expectType: 'json'},
                {value: function(){}, expectType: 'function'},
                {value: [function(){}, 1], expectType: 'function'},
                {value: linked.update, expectType: 'function'},
            ];
            cases.forEach(function(def){
                expect( Shape.create({fields: {f1: def}}).fields.f1.type ).to.equal(def.expectType);
            });
        });

        it('should set currect values for types.', function(){
            var cases = [
                {type: 'string', expectValue: ''},
                {type: 'number', expectValue: 0},
                {type: 'boolean', expectValue: false},
                {type: 'json', expectValue: 'null'},
                {type: 'function', expectValue: linked.update.constructor},
            ];
            cases.forEach(function(def){
                var value = Shape.create({fields: {f1: def}}).fields.f1.value;
                var expectValue = def.expectValue;
                if(typeof(expectValue) === 'function') expect(value).to.be.instanceof(expectValue);
                else expect(value).to.equal(expectValue);
            });
        });

        it('should throw errors for common defination errors.', function(){
            var cases = [
                { fields: { f2: null } },
                { fields: { f2: '...' } },
                { fields: { f2: {link: Object} } },
                { link: node.getChild('str'), type: 'number' },
                { link: node.getChild('num'), value: '...' },
                { link: node, dynamic: false },
                { link: node.getChild('str'), fields: {} },
                { type: 'string', fields: {} },
                { type: 'string', dynamic: false },
                { type: '...' },
                { type: String, updateFields: function(){} },
                { type: String, update: function(){} },
                { value: function(){}, writable: false },
            ];
            cases.forEach(function(def){
                expect(function(){
                    Shape.create({fields: {f1: def}});
                }).throw(NodeError);
            });
        });

    });

});
