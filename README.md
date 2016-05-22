# Datree #

[![NPM Version](https://img.shields.io/npm/v/datree.svg)](https://npmjs.com/package/datree)
[![Build Status](https://travis-ci.org/LastLeaf/datree.svg?branch=master)](https://travis-ci.org/LastLeaf/datree)
[![Coverage Status](https://coveralls.io/repos/github/LastLeaf/datree/badge.svg?branch=master)](https://coveralls.io/github/LastLeaf/datree?branch=master)
[![Dependency Status](https://www.versioneye.com/user/projects/573c9985ce8d0e004737216a/badge.svg)](https://www.versioneye.com/user/projects/573c9985ce8d0e004737216a)

Declare the data structure, transform it when needed, and send requests to update!

Datree is about a concept of full-stack web programming. This is the core implementation of this idea.

# Development Status #

Although datree core is done, some other important pieces should also be finished to make the whole thing works.

* **datree-mongodb** The MongoDB binding for datree. It might be complex in design.
* **datree-socketio** Using socket.io to sync data between server and client. It won't be complex.
* **datree-react** The React binding for datree. It could be as simple as a mixin.

I am trying hard to finish them. Contributions are welcomed!

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
The dynamic children could be inserted or removed, and have a changeable order for iteration.

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
        request: function(requestedValue, cb){
            this.async = true; // this handler is an async function
            this.node.update(requestedValue, cb); // update this field to the requested value
        }
    }
}, function(newNode){});
```

There is a special type for leaf nodes - "function".
Function-typed nodes could be called with `.exec(cb)`. It works just like calling the declared function.
However, you could not pass any parameters.

## Updates ##

When a value of a node need to be updated, you need to update on the source (you could ONLY do it on the source nodes).
If you define a source manually (without database bindings or MemorySource), you should do it with `.update(newValue, cb)`.
The new values are always converted to the type of corresponding source nodes.

```js
sourceNode.update(newValue, function(){
    // this callback is called when data flow finished
});
// update to the source node itself is finished synchronously
console.log(sourceNode.getCachedValue()); // === newValue
```

If the new value equals to the old one, the update process is not triggered at all.

## Requests ##

You could also raise requests to update the source with `.request(newValue, cb)`.
If a request is not send from the source node, it would be piped to the source.
Requested values are not updated automatically. They are handled by source nodes.

```js
node.request(newValue, function(){
    // this callback is called when data flow finished
});
// you cannot assume that the value is changed or would be changed sometime - it all depends to the source
```

## Dynamic Nodes ##

Sometimes you would like to dynamically add/remove children for a non-leaf node (i.e. working with arrays).
You could do it by declaring the node as a "dynamic" node.
Dynamic nodes could have static fields, but it is not recommended.

When you want to update the field list of a dynamic source node, you should use `.createField(fieldName, def, cb)` to create a new field for it (if not created before), and then update the list with `.updateFields(newFieldList, cb)`.

```js
Node.create({
    dynamic: true
}, function(sourceNode){
    sourceNode.createField('num', {
        value: 0,
        writable: false // deny any requests
    }, function(numField){
        sourceNode.createField('str', {
            value: '',
            writable: false
        }, function(strField){
            sourceNode.updateFields([numField, strField], function(){
                // this callback is called when data flow finished
            });
        });
    });
});
```

Dynamic fields have orders. You could iterate them with `.forEach(cb)` or `.forIn(cb)`.

```js
sourceNode.forEach(function(value, index, node){
    console.log(value); // this is the value of leaf node or non-leaf node itself
    console.log(node === sourceNode); // === true
});

sourceNode.forIn(function(fieldName, value, node){
    console.log(value); // this is the value of leaf node or non-leaf node itself
    console.log(node === sourceNode); // === true
});
```

## Using Filters ##

Filters are allowed in `request`, `update`, and `updateFields` data flows.
They are quite useful for filtering data and authentication.

```js
sourceNode.transfrom({
    newKey: 'key',
    newArr: {
        link: 'arr',
        updateFields: function(newDynamicFields, cb){
            // the newDynamicFields is an array
            // the items in the array should be source nodes of the dynamic children
        }
    },
    request: [function(requestedValue, cb){ // an array of filter functions are also allowed
        // this filter would be called on requests of newKey and newArr
    }],
}, function(node){});
```

A filtering function is sync by default.
The return value of sync filters are used as the filtered value.
You could use change the function to async by setting `this.async = true`.
Then the filtered value could be provided in the callback.
If the filtered value is undefined, then the value would not be changed.

# API #

Install with `npm install datree`.

`Shape` manages the declaration of datrees.
You could create datrees with the same declaration using `Shape`.
`Shape = require('datree').Shape`

* `Shape.create(def)` create and return a new shape with `def`. `def` is the object to declare datrees. The format of def is listed below.
* `def.source` could be a reference node. It used as the relative node for `def.link`, and does NOT mean this node is linked to the source. It could also be a path to reference node declared in the node's closest ancestor.
* `def.link` should be given only when this node is linked. The value could be the source node or the path to the reference node declared by `def.source`. If a path is given, it internally calls `Node.getDescendant(path)` on the reference node to find the source node.
* `def.type` should be the type of this node if it is a leaf node, or undefined if it is a non-leaf node. The allowed types are "string", "number", "boolean", "json", and "function". You could also declare it to JavaScript built-in objects - `String`, `Number`, `Boolean`, `JSON`, and `Function`. It could also be ignored if `def.value` is given - it could be inferred.
* `def.value` defines the default value for initializing this node. If the node is updated with a new value and the new value could not be converted to the declared type (i.e. "str" to number), it would be set to the default value. Default values could be inferred from `def.type`.
* `def.cache` defines a leaf node or descendants of a non-leaf node would be cacheable or not. If a leaf node is cacheable, its value could be accessed any time. Otherwise its value could only be accessed in `def.update` filters.
* `def.writable` if set to false, the node and its descendants would be not writable. A non-writable node silently ignores the requests to it.
* `def.fields` defines the fields of a non-leaf node. The fields could also be defined in the `def` itself if the field name is not  collided with preserved definition key words. If no fields are found, all static fields are linked to the reference node (i.e. defined by `def.source`).
* `def.addFields` links all static fields from the reference node, and add some extra fields defined here. Useful for transformation.
* `def.removeFields` could be an array of field names. These arrays would be removed. Useful for transformation.
* `def.dynamic` whether the node is dynamic or not. Default to false.
* `def.update` the update filters.
* `def.updateFields` the updateFields filters.
* `def.request` the request filters.

*Coming soon...*

# LICENSE #

MIT
