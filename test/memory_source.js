var expect = require('chai').expect;
var datree = require('..');

var Node = datree.Node;
var MemorySource = datree.MemorySource;

describe('MemorySource', function(){

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
            expect(MemorySource()).to.be.undefined;
            expect(new MemorySource).to.be.empty;
            expect(post).to.be.instanceof(Node);
            expect(post._id).to.equal('PID');
            expect(post.author).to.be.instanceof(Node);
            expect(post.author._id).to.equal('UID1');
            expect(post.author.get('name').get()).to.equal('AUTHOR1');
            expect(post.getChild('published').getCachedValue()).to.equal(false);
            expect(post.getStaticChild('time').get()).to.equal(0);
            expect(post.content).to.be.equal('CONTENT1');
            expect(post.comments.getDynamicChildren().length).to.equal(2);
            expect(post.comments[0].user._id).to.equal('UID2');
            expect(post.comments[0].user.name).to.equal('USER2');
            expect(post.comments[0].content).to.equal('CONTENT2');
            expect(post.comments[1].user._id).to.equal('UID3');
            expect(post.comments[1].user.name).to.equal('USER3');
            expect(post.comments[1].content).to.equal('CONTENT3');
            expect(post.comments[2]).to.be.undefined;
        });

        it('should apply requests.', function(cb){
            post.request('comments', 'ILLEGAL');
            post.request('author', 'ILLEGAL');
            expect(post.isBusy()).to.be.false;
            expect(post.isBusy('content')).to.be.false;
            post.request('content', 'NEW_CONTENT1', function(){
                expect(post.isBusy()).to.be.false;
                expect(post.isBusy('content')).to.be.false;
                expect(post.content).to.equal('NEW_CONTENT1');
                post.request('content', 'CONTENT1', function(){
                    expect(post.content).to.equal('CONTENT1');
                    expect(post.isBusy()).to.be.false;
                    expect(post.isBusy('content')).to.be.false;
                    cb();
                });
            });
            expect(post.isBusy()).to.be.true;
            expect(post.isBusy('content')).to.be.true;
        });

        it('should be able to append and remove.', function(cb){
            var structure = {
                user: {
                    _id: 'NEW_UID2',
                    name: 'NEW_USER2'
                },
                content: 'NEW_CONTENT2',
                reply: [{
                    user: {
                        _id: 'NEW_UID3',
                        name: 'NEW_USER3',
                    },
                    content: 'NEW_CONTENT3',
                }]
            };
            var structure2 = {
                user: {
                    _id: 'NEW_UID4',
                    name: 'NEW_USER4'
                },
                content: 'NEW_CONTENT4',
            };
            post.comments.request('append', structure, function(){
                expect(post.comments[2].user._id).to.equal('NEW_UID2');
                expect(post.comments[2].user.name).to.equal('NEW_USER2');
                expect(post.comments[2].content).to.equal('NEW_CONTENT2');
                var reply = post.comments[2].reply;
                expect(reply[0].user._id).to.equal('NEW_UID3');
                expect(reply[0].user.name).to.equal('NEW_USER3');
                expect(reply[0].content).to.equal('NEW_CONTENT3');
                reply.request('append', null, function(){});
                reply.request('append', structure2, function(){
                    expect(reply[2].user._id).to.equal('NEW_UID4');
                    expect(reply[2].user.name).to.equal('NEW_USER4');
                    expect(reply[2].content).to.equal('NEW_CONTENT4');
                    post.comments.request('remove', 2, function(){
                        expect(post.comments[2]).to.be.undefined;
                        cb();
                    });
                });
            });
        });

    });

});
