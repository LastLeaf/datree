var expect = require('chai').expect;
var datree = require('..');

var Node = datree.Node;
var MemorySource = datree.MemorySource;

describe('Node', function(){

    describe('#create(def, cb)', function(){
        var post = null;

        before(function(cb){
            MemorySource.create({
                _id: 'PID',
                title: 'TITLE',
                author: {
                    _id: 'UID1',
                    name: 'AUTHOR1',
                },
                published: false,
                time: 0,
                content: 'CONTENT1',
                comments: [{
                    user: {
                        _id: 'UID2',
                        name: 'USER2',
                    },
                    content: 'CONTENT2',
                }, {
                    user: {
                        _id: 'UID3',
                        name: 'USER3',
                    },
                    content: 'CONTENT3',
                }],
            }, function(_post){
                post = _post;
                cb();
            });
        });

        it('should construct a correct node', function(){
            expect(post).to.be.instanceof(Node);
            expect(post._id).to.equal('PID');
            expect(post.author).to.be.instanceof(Node);
            expect(post.author._id).to.equal('UID1');
            expect(post.author.get('name').get()).to.equal('AUTHOR1');
            expect(post.getChild('published').getCachedValue()).to.equal(false);
            expect(post.getStaticChild('time').get()).to.equal(0);
            expect(post.content).to.be.equal('CONTENT1');
            //expect(post.comments.getDynamicChild(0)).to.be.instanceof(Node);
            // TODO let update(Fields) known by source
        });

    });

});
