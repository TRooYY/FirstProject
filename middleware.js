var app =require('express')();

app.use(function(req, res, next){
    console.log('\n\nAll ways');
    next();
});
app.get('/a', function(req, res){
    console.log('router ends');
    res.send('a');
});
app.get('/a', function(req, res){
    console.log('never get');
});
app.get('/b', function(req, res, next){
    console.log('router is not end');
    next();
});
app.use(function(req, res,next){
    console.log('sometime');
    next();
});
app.get('/b', function(req, res, next){
    console.log('part 2 ');
    throw new Error('b error');
});
app.use('/b', function(err, req, res, next){
    console.log('throw error');
    next(err);
});
app.get('/c', function(err, req){
    console.log('throw err');
    throw new Error('c fail');
});
app.use('/c', function(err, req, res,next){
    console.log('get error not pass');
    next();
});
app.use(function(err, req, res, next){
    console.log('get not catch err : ' + err.message);
    res.send('500 - internal err');
});
app.use(function(req, res){
    console.log('not deal route');
    res.send('404 - page not found');
});
app.listen(3000, function(){
    console.log('listen at 3000');
})


