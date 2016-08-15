var cluster = require('cluster');

function startWorker(){
    var worker = cluster.fork();
    console.log('Cluster : Worker %d started', worker.id);
}
if(cluster.isMaster){
    require('os').cpus().forEach(function(){
        startWorker();
    });

    cluster.on('disconnect', function(){
        console.log('Cluster: Worker %d disconnect from the cluster',worker.id);
    });

    cluster.on('exit', function(){
        console.log('Cluster: Worker %d died with exit code %d(%s)',worker.id, code, signal);
        startWorker();
    });
}else{
    require('./app.js')();
}