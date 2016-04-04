var expect = require('chai').expect;
var datree = require('..');

var Shape = datree.Shape;
var NodeError = datree.Error;

describe('Shape', function(){
    var shape = null;
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
                        type: 'number'
                    },
                    sub: {
                        cache: true,
                        writable: false,
                        fields: {
                            bool: {
                                cache: false,
                                value: true,
                                request: [1, 'a'],
                                update: function(){}
                            },
                            json: {
                                writable: true,
                                type: 'json',
                                value: [1,2,3]
                            },
                            ref: {
                                type: 'ref'
                            }
                        }
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
                syncFields: [function sync1(){}, function sync2(){}]
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
            expect(shape.fields.sub.fields.ref.type).to.equal('ref');
            expect(shape.fields.func.type).to.equal('function');
        });

        it('should have currect default values', function(){
            expect(shape.value).to.be.undefined;
            expect(shape.fields.sub.value).to.be.undefined;
            expect(shape.fields.str.value).to.equal('str1');
            expect(shape.fields.num.value).to.equal(0);
            expect(shape.fields.sub.fields.bool.value).to.equal(true);
            expect(shape.fields.sub.fields.json.value).to.equal('[1,2,3]');
            expect(shape.fields.sub.fields.ref.value).to.be.null;
            expect(shape.fields.func.value.constructor.name).to.equal('FuncArr');
            expect(shape.fields.func.value.funcs).to.have.lengthOf(1);
        });

        it('should have correct filters', function(){
            expect(shape.request.funcs).to.have.lengthOf(0);
            expect(shape.update.funcs).to.have.lengthOf(0);
            expect(shape.syncFields.funcs).to.have.lengthOf(2);
            expect(shape.syncFields.funcs[0].name).to.equal('sync1');
            expect(shape.syncFields.funcs[1].name).to.equal('sync2');
            expect(shape.fields.str.request.funcs).to.have.lengthOf(1);
            expect(shape.fields.num.update.funcs).to.have.lengthOf(0);
            expect(shape.fields.sub.fields.bool.request.funcs).to.have.lengthOf(0);
            expect(shape.fields.sub.fields.bool.update.funcs).to.have.lengthOf(1);
            expect(shape.fields.sub.fields.syncFields).to.be.undefined;
        });

    });

    describe('#create(def) [with links]', function(){

        before(function(){
            linked = Shape.create({
                source: shape,
                fields: {
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
                        fields: {
                            f4: shape,
                            f5: {
                                value: shape
                            },
                        },
                        dynamic: true
                    }
                },
                addFields: {
                    f1: 'sub.json'
                },
            });
        });

        it('should construct a frozen shape', function(){
            expect(linked).to.be.instanceof(Shape);
            expect(linked).to.be.deep.frozen;
        });

        it('should have correct links', function(){
            expect(linked.link).to.be.undefined;
            expect(linked.fileds.f1.link).to.equal(shape.getChild('sub.json'));
            expect(linked.fileds.f2.link).to.equal(shape.getChild('num'));
            expect(linked.fileds.f3.link).to.be.undefined;
            expect(linked.fileds.f3.fileds.f4.link).to.equal(shape.getChild('sub'));
            expect(linked.fileds.f3.fileds.f4.link).to.be.undefined;
            expect(linked.fileds.f3.fileds.f4.fields.sub.link).to.be.undefined;
            expect(linked.fileds.f3.fileds.f5.link).to.be.undefined;
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
            expect(linked.fields.f3.fields.f5.type).to.equal('ref');
            expect(linked.fields.f3.fields.f5.value).to.equal(shape);
            expect(linked.fields.f3.fields.f5.writable).to.be.true;
        });

        it('should not inherit filters', function(){
            expect(linked.fields.f2.request.funcs).to.have.lengthOf(1);
            expect(linked.fields.f2.update.funcs).to.have.lengthOf(1);
        });

    });
});
