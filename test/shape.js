var expect = require('chai').expect;
var datree = require('..');

var Shape = datree.Shape;
var NodeError = datree.Error;

describe('Shape', function(){
    describe('#create(def)', function(){
        var shape = null;

        before(function(){
            shape = Shape.create({
                cache: false,
                fields: {
                    str: {
                        value: 'str1',
                        writable: false,
                    },
                    num: {
                        cache: true,
                        value: 100
                    },
                    sub: {
                        cache: true,
                        writable: false,
                        fields: {
                            bool: {
                                cache: false,
                                value: true,
                            },
                            json: {
                                writable: true,
                                type: 'json',
                                value: [1,2,3]
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
            });
        });

        it('should construct a correct shape', function(){
            expect(shape).to.be.an.instanceof(Shape);
            expect(shape).to.be.deep.frozen;
            expect(shape.parent).to.equal(null);
            expect(shape.fields.str.parent).to.equal(shape);
            expect(shape.source).to.be.null;
            expect(shape.fields.str.source).to.be.null;
            expect(shape.link).to.be.undefined;
            expect(shape.fields.str.link).to.be.undefined;
            expect(shape.cache).to.be.false;
            expect(shape.fields.str.cache).to.be.false;
            expect(shape.fields.num.cache).to.be.true;
            expect(shape.fields.sub.fields.bool.cache).to.be.false;
            expect(shape.fields.sub.fields.json.cache).to.be.true;
            expect(shape.writable).to.be.true;
            expect(shape.fields.str.writable).to.be.false;
            expect(shape.fields.num.writable).to.be.true;
            expect(shape.fields.sub.writable).to.be.false;
            expect(shape.fields.sub.fields.bool.writable).to.be.false;
            expect(shape.fields.sub.fields.json.writable).to.be.false;
            // TODO
        });
    });
});
