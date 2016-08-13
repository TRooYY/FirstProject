module.exports = function(grunt){

    //load plugin
    [
        'grunt-cafe-mocha',
        'grunt-contrib-jshint',
        'grunt-exec'
    ].forEach(function(task){
            grunt.loadNpmTasks(task);
        });

    //setup plugin
    grunt.initConfig({
        cafemocha: {
            all: {src: 'qa/tests-*.js', options: {ui: 'tdd'}}
        },
        jshint: {
            app: ['app.js', 'public/js/**/*.js', 'lib/**/*.js'],
            qa: ['Gruntfile.js', 'public/qa/**/*.js', 'qa/**/*.js'],
        },
        exec: {
            linkCheck : {cmd: 'linkCheck http://localhost:3000'}
        },
    });

    //register task
    grunt.registerTask('default', [ 'jshint', 'exec']);
};
