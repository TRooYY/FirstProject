var fortuneCookie = [
    'test 1',
    'test 2',
    'test 3'
];

exports.getFortune = function(){
    var idx = Math.floor(Math.random() * fortuneCookie.length);
    return fortuneCookie[idx];
};

