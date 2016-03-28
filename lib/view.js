var viewProto = Object.create(Object);

var View = {
    create: function(){
        return Object.create(viewProto);
    }
};

module.exports = View;
