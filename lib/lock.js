var Lock = function Lock(){};
Lock.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Lock,
        writable: true,
        configurable: true
    }
});

Lock.create = function(){
    return Object.create(Lock.prototype, {
        queue: { value: [] },
        running: { value: false, writable: true }
    });
};

var exec = function(lock, func){
    lock.running = true;
    var cbCalled = false;
    func(function(){
        if(cbCalled) return;
        cbCalled = true;
        lock.running = false;
        if(lock.queue.length) exec(lock, lock.queue.shift());
    });
};

Lock.prototype.wait = function(func){
    if(this.running) {
        this.queue.push(func);
    } else {
        exec(this, func);
    }
};

module.exports = Lock;
