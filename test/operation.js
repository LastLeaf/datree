var expect = require('chai').expect;
var datree = require('..');
var Lock = require('../lib/lock');
var FuncArr = require('../lib/func_arr');

var Node = datree.Node;
var NodeError = datree.Error;

describe('Filters', function(){

    describe('FuncArrs', function(){

        it('should construct correct funcArrs', function(){
            expect(FuncArr()).to.be.undefined;
            expect(new FuncArr).to.be.empty;
        });

        it('should prevent callbacks called twice', function(cb){
            var funcArr = FuncArr.create(function(v, fcb){
                this.async = true;
                fcb();
                expect(fcb).to.throw(NodeError);
                cb();
            });
            funcArr.filter(null, '', [false], function(){});
        });

        it('should handle changes', function(cb){
            Node.create({
                type: String,
                request: function(v, cb){
                    this.async = true;
                    this.node.update(v, cb);
                },
            }, function(sourceNode){
                Node.create({
                    link: sourceNode,
                    update: function(v){
                        return v + '!';
                    },
                    request: function(v){
                        return v + '?';
                    },
                }, function(node){
                    node.request('#', function(){
                        expect(sourceNode.getCachedValue()).to.equal('#?');
                        expect(node.getCachedValue()).to.equal('#?!');
                        cb();
                    });
                });
            });
        });

        it('should interrupted states', function(cb){
            var interruptedCount = 0;
            var interruptFunc = function(){
                interruptedCount++;
                this.interrupted = true;
            };
            var testFunc = function(){
                throw new Error();
            };
            Node.create({
                fields: {
                    num: {
                        value: 0,
                        request: testFunc,
                    },
                },
                dynamic: true,
            }, function(sourceNode){
                sourceNode.transform({
                    link: sourceNode,
                    update: function(v){
                        if(v <= 0) this.interrupted = true;
                        else return v * 10;
                    },
                    updateFields: [interruptFunc, testFunc],
                    request: interruptFunc,
                    dynamic: true,
                }, function(node){
                    node.request('num', -1);
                    sourceNode.update('num', 1);
                    sourceNode.createField('tmp', Boolean, function(field){
                        sourceNode.updateFields([field], function(){
                            expect(node.num).to.equal(10);
                            expect(interruptedCount).to.equal(3);
                            cb();
                        });
                    });
                });
            });
        });

    });

    describe('Locks', function(){
        var sourceNode = null;
        var node = null;

        before(function(cb){
            Node.create({
                fields: {
                    f1: {
                        type: Number,
                        request: function(v, cb){
                            this.async = true;
                            this.node.update(v, cb);
                        }
                    },
                    f2: {
                        dynamic: true,
                    },
                    f3: Boolean,
                    triggerUpdates1: function(cb){
                        this.async = true;
                        this.node.getParent().update('f1', 1);
                        this.node.getParent().update('f1', 2, cb);
                    },
                    triggerUpdates2: function(cb){
                        this.async = true;
                        var node = this.node;
                        node.getParent().f2.createField('tmp', JSON, function(tmp){
                            node.getParent().update('f1', 3);
                            node.getParent().update('f1', 4);
                            node.getParent().updateFields('f2', [tmp], cb);
                        });
                    },
                }
            }, function(n){
                sourceNode = n;
                sourceNode.transform({
                    fields: {
                        f2: 'f2',
                        f1: {
                            link: 'f1',
                        },
                        f3: {
                            link: 'f3',
                            cache: false,
                        },
                        triggerUpdates1: 'triggerUpdates1',
                    },
                }, function(n){
                    node = n;
                    cb();
                });
            });
        });

        it('should construct correct locks', function(){
            expect(Lock()).to.be.undefined;
            expect(new Lock).to.be.empty;
        });

        it('should prevent callbacks called twice', function(){
            var lock = Lock.create();
            var once = false;
            lock.wait(function(unlock){
                setTimeout(unlock, 5);
                setTimeout(unlock, 10);
            });
            lock.wait(function(unlock){
                expect(once).to.be.false;
                once = true;
                unlock();
            });
        });

        it('should execute node update/updateFields/request', function(cb){
            sourceNode.update('f1', -1, function(){
                expect(node.f1).to.equal(-1);
                node.request('f1', -2, function(){
                    expect(sourceNode.f1).to.equal(-2);
                    sourceNode.f2.createField('str', String, function(str){
                        sourceNode.f2.createField('bool', Boolean, function(bool){
                            sourceNode.f2.updateFields([str, bool], function(){
                                expect(node.f2.str).to.equal('');
                                expect(node.f2.bool).to.equal(false);
                                node.f2.forEach(function(child, i, n){
                                    expect(n).to.equal(node.f2);
                                    var vals = ['', false];
                                    expect(child).to.equal(vals[i]);
                                });
                                cb();
                            });
                        });
                    });
                });
            });
        });

        it('should exec update filters exclusively', function(cb){
            var curProc = 0;
            node.transform({
                update: function(v, ucb){
                    if(this.path[0] !== 'f1' || v <= 0) return;
                    this.async = true;
                    var curNode = this.node;
                    curProc = v;
                    setTimeout(function(){
                        expect(curProc).to.equal(v);
                        expect(node.f1).to.equal(2);
                        if(v === 1) {
                            ucb();
                        } else if(v === 2) {
                            curNode.destroy();
                            ucb();
                            cb();
                        }
                    }, 5);
                },
            }, function(n){
                expect(node.f3).to.be.undefined;
                expect(n.f3).to.equal(false);
                node.triggerUpdates1();
            });
        });

        it('should exec update/updateFields/request filters exclusively', function(cb){
            var inited = false;
            var curProc = 0;
            var requested = false;
            node.transform({
                removeFields: ['f3'],
                update: function(v, ucb){
                    if(this.path[0] !== 'f1') return;
                    this.async = true;
                    var curNode = this.node;
                    curProc = v;
                    setTimeout(function(){
                        expect(curProc).to.equal(v);
                        if(v === 3) curNode.request('f1', 0);
                        ucb();
                    }, 5);
                },
                updateFields: function(arr){
                    if(!inited) {
                        inited = true;
                        return;
                    }
                    expect(curProc).to.equal(4);
                    expect(node.f1).to.equal(4);
                    expect(requested).to.be.false;
                    expect(arr).to.have.lengthOf(1);
                },
                request: function(){
                    requested = true;
                    expect(node.f2.str).to.be.undefined;
                    expect(node.f2.bool).to.be.undefined;
                    expect(node.f2.tmp).to.be.null;
                    this.node.destroy();
                    cb();
                },
            }, function(){
                sourceNode.exec('triggerUpdates2');
            });
        });

    });

});
