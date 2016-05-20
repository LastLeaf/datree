# Datree #

[![NPM Version](https://img.shields.io/npm/v/datree.svg)](https://npmjs.com/package/datree)
[![Build Status](https://travis-ci.org/LastLeaf/datree.svg?branch=master)](https://travis-ci.org/LastLeaf/datree)
[![Coverage Status](https://coveralls.io/repos/github/LastLeaf/datree/badge.svg?branch=master)](https://coveralls.io/github/LastLeaf/datree?branch=master)
[![Dependency Status](https://www.versioneye.com/user/projects/573c9985ce8d0e004737216a/badge.svg)](https://www.versioneye.com/user/projects/573c9985ce8d0e004737216a)

Declare the data structure, transform it when needed, and send requests to update!

Datree is about a concept of full-stack web programming. This is the core implementation of this idea.

# Concepts #

## Declarative ##

While writing web apps, data connects the database and the interface.
In "the REST part" of apps, we are always fetching data from server, listening user modifications, and send them back to the server.
These make our code awful.

Actually, it is just the **transformation** of data.
We do not need to care about how to send or receive data.
We just need to **declare** what the data "shape" looks like, and which is the source of the data.

With datree, we need

* declare the "shape" and source of the data
* raise requests if update is required
* declare some filters to filter operations or change the data

In this point of view, we could see the dataflow as below.

Database (or similar data sources) <--> Datree A <--> Datree B <--> ... <--> Interface

Now, the key to write apps is defining data structures and the connections.
Datree solves how data flows between databses and datrees.
The interface? Fortunately, we have *React*, *VUE*, and some others which works in a declarative way.

## Connective ##

In the datree system, we could define many pieces of data. One piece of data is called a "node".
The node structure looks like a JavaScript object.
Non-leaf nodes are common objects. Leaf nodes are strings, numbers, booleans, etc.

A node could be **linked** to a source node (of cause, the link state should be declared in advance).
It is a special two-way connection. The node's value changes if its source changes.
However, if the node want to change its value, it should send a request to its source, waiting the source to "permit" changes.

## Shaped ##

Different from JavaScript objects, the data in datree is **shaped**. It means

* leaf nodes have a fixed type (string, number, boolean, function, or json)
* non-leaf nodes have static children declared in advance, which are not removable

But there are relaxations for some cases

* json-typed leaf nodes could hold any data that is JSON-compatible
* non-leaf nodes could be "dynamic"

Dynamic nodes could have dynamic children.
The dynamic children have a changeable order for iteration.

# The Datree Core #

Datree core handles datree declaration and transformation between datrees. Here is a small example.

```js
var Node = require('datree').Node;
var MemorySource = require('datree').MemorySource;

MemorySource.create({
    _id: 'PID',
    title: 'The Last Leaf',
    author: 'O. Henry',
    content: '<p>...</p>',
    time: Date.now(),
    comments: []
}, function(post){
    post.transform({
        fields: {
            title: 'title',
            author: 'author',
            content: 'content'
        }
    }, function(postForReading){
        post.request('content', 'THE NEW CONTENT', function(){
            console.log(postForReading.content); // 'THE NEW CONTENT'
        });
    });
});
```

# Development Status #

Although datree core is done, some other important pieces should also be finished to make the whole thing works.

* **datree-mongodb** The MongoDB binding for datree. It might be complex in design.
* **datree-socketio** Using socket.io to sync data between server and client. It won't be complex.
* **datree-react** The React binding for datree. It could be as simple as a mixin.

# Guide #

## Using Sources ##

To use datree, firstly a **source** node is required.
The easy way to create sources is using database bindings or the built-in `MemorySource` to store something temporarily.

```js
var MemorySource = require('datree').MemorySource;

MemorySource.create({
    key: 'defaultValue',
    arr: [{ num: 1 }, { num: 2 }]
}, function(sourceNode){
    console.log(sourceNode.key); // === 'defaultValue'
});
```

The `MemorySource.create(obj, cb)` call creates a node that works as a data source.
The node could contain children just like JavaScript objects. Each property is called a **field** of its parent.
The `obj` could be common JavaScript objects with strings, numbers, booleans, objects, and arrays.
Strings, numbers, and booleans are default values for fields.
Types of fields are inferred from default values. Types for fields could not be changed after created.
Once created, `cb` is called with the created source node as the first argument.

## Transformation ##

Once you need to transform a source node or watch the changes of some fields, you need to transform the source.

```js
sourceNode.transform({
    newKey: { link: 'key' },
    newArr: 'arr', // equals to { link: 'arr' } and { link: sourceNode.getChild('arr') }
    update: function(newValue){
        // this function is called when a value is changed in this node
        console.log(this.node); // === newNode
    }
}, function(newNode){
    console.log(newNode.key); // === undefined
    console.log(newNode.newKey); // === 'defaultValue'
});
```

You could also create a new node instead, using `Node.create(def, cb)`.
The only difference is that you should specify the source node in the *link* statement.

```js
var Node = require('datree').Node;

Node.create({
    newKey: { link: sourceNode.getChild('key') },
    newArr: sourceNode.getChild('arr') // equals to { link: sourceNode.getChild('arr') }
}, function(newNode){});
```

## Understanding Nodes ##

Each value of a field is also a node. Every time you create a node, you are actually creating a tree of nodes.
So nodes have parent/child relationships, and nodes could be leaf nodes (typed string, number, boolean, json, or function) or non-leaf nodes.

Sometimes you would like to mix source fields and linked fields in a single tree.
It is also possible through `Node.create(def, cb)`, but you should handle the requests of source fields yourself.

```js
Node.create({
    newKey: { link: sourceNode.getChild('key') },
    newSource: {
        value: 1, // this is the default value, the type is inferred from it
        request: function(requestedValue){
            this.node.update(requestedValue); // update this field to the requested value
        }
    }
}, function(newNode){});
```

## Updates ##

*Comming soon...*

## Requests ##

*Comming soon...*

# API #

*Coming soon...*

# LICENSE #

MIT
