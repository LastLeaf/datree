var expect = require('chai').expect;
var datree = require('..');

var Node = datree.Node;
var NodeError = datree.Error;

describe('Node', function(){

    describe('#create(def, cb)', function(){

        before(function(cb){
            Node.create({

            }, function(node){
                cb();
            });
        });

    });

});
