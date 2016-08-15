var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var formidable = require('formidable');
var jqupload = require('jquery-file-upload-middleware');
var credentials = require('./credentials');
var emailService = require('./lib/email.js')(credentials);
var mongoose = require('mongoose');

var http = require('http'),
    Vacation = require('./models/vacation.js'),
    VacationInSeasonListener = require('./models/vacationInSeasonListener.js');

//domain
app.use(function(req, res, next){
   //create a domain
    var domain = require('domain').create();
    //deal with err in the domain
    domain.on('error', function(err){
        console.err('Domain error caught\n', err.stack);
        try{
            setTimeout(function(){
                console.error('Failure shutdown');
                process.exit(1);
            }, 5000);

            //disconnect from cluster
            var worker = require('cluster').worker;
            if(worker) worker.disconnect();

            server.close();

            try{
                //try error router in express
                next(err);
            }catch(err){
                console.error('Express error mechanism failed\n', err.stack);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.send('Server error.');
            }
        }catch(err){
            console.log('Unable to send 500 response', err.stack);
        }
    });

    domain.add(req);
    domain.add(res);

    domain.run(next);
});
//view engine
var handlebars = require('express3-handlebars').create({
    defaultLayout: 'main',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

var fortune = require('./lib/fortune.js');
var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({ url: credentials.mongo[app.get('env')].connectionString });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(require('cookie-parser')(credentials.cookieSercret));
app.use(require('express-session')({
    resave: false,
    saveUninitialized: true,
    secret:credentials.cookieSercret,
    store: sessionStore
}));

// flash message middleware
app.use(function(req, res, next){
    // if there's a flash message, transfer
    // it to the context, then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next){
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});

var opts = {
    server:{
        socketOptions: {keepAlive: 1}
    }
};

switch(app.get('env')){
    case 'development':
        app.use(require('morgan')('dev'));
        mongoose.connect(credentials.mongo.development.connectionString, opts);
        break;
    case 'production':
        app.use(require('express-logger')({
            path: __dirname + '/log/requests.log'
        }));
        mongoose.connect(credentials.mongo.production.connectionString, opts);
        break;
    default :
        throw new Error('Unknown environment :' + app.get('env'));
}

Vacation.find(function(err, vacations){
    if(vacations.length) return;

    new Vacation({
        name: 'Hood River Day Trip',
        slug: 'hood-river-day-trip',
        category: 'Day Trip',
        sku: 'HR199',
        description: 'Spend a day sailing on the Columbia and ' +
        'enjoying craft beers in Hood River!',
        priceInCents: 9995,
        tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
        inSeason: true,
        maximumGuests: 16,
        available: true,
        packagesSold: 0,
    }).save();

    new Vacation({
        name: 'Oregon Coast Getaway',
        slug: 'oregon-coast-getaway',
        category: 'Weekend Getaway',
        sku: 'OC39',
        description: 'Enjoy the ocean air and quaint coastal towns!',
        priceInCents: 269995,
        tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
        inSeason: false,
        maximumGuests: 8,
        available: true,
        packagesSold: 0,
    }).save();

    new Vacation({
        name: 'Rock Climbing in Bend',
        slug: 'rock-climbing-in-bend',
        category: 'Adventure',
        sku: 'B99',
        description: 'Experience the thrill of rock climbing in the high desert.',
        priceInCents: 289995,
        tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing', 'hiking', 'skiing'],
        inSeason: true,
        requiresWaiver: true,
        maximumGuests: 4,
        available: false,
        packagesSold: 0,
        notes: 'The tour guide is currently recovering from a skiing accident.',
    }).save();
});

// mocked weather data
function getWeatherData(){
    return {
        locations: [
            {
                name: 'Portland',
                forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
                weather: 'Overcast',
                temp: '54.1 F (12.3 C)',
            },
            {
                name: 'Bend',
                forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
                weather: 'Partly Cloudy',
                temp: '55.0 F (12.8 C)',
            },
            {
                name: 'Manzanita',
                forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
                weather: 'Light Rain',
                temp: '55.0 F (12.8 C)',
            },
        ],
    };
}

app.use(function(req, res, next){
    var cluster = require('cluster');
    if (cluster.isWorker){
        console.log('Worker %d received request', cluster.worker.id);
    }
});

app.use(function(req, res, next){
    if(!res.locals.partials) res.locals.partials = {};
    res.locals.partials.weather = getWeatherData();
    next();
});

app.get('/', function(req, res){
    req.session.userName = 'acc';
    res.cookie('monster', '111');
    res.render('home', {title: fortune.getFortune()});
});

app.get('/headers', function(req, res){
    res.set('Content-Type', 'text/plain');
    var s = '';
    for(var name in req.headers){
        s += name + ':' + req.headers[name] + '\n';
    }
    res.send(s);
});

app.get('/about', function(req, res){
    res.clearCookie('monster');
    req.session.userName = null;
    delete req.session.colorSchema;
    res.render('about', {
        fortune: fortune.getFortune(),
        pageTestScript: '/qa/tests-about.js'
    });
});

app.get('/tours/hood-river', function(req, res){
    res.render('tours/hood-river');
});

app.get('/tours/request-group-rate', function(req, res){
    res.render('tours/request-group-rate');
});

//app.get('/jquery-test', function(req, res){
//    res.render('jquery-test');
//});
app.get('/nursery-rhyme', function(req, res){
    res.render('nursery-rhyme');
});
app.get('/data/nursery-rhyme', function(req, res){
    res.json({
        animal: 'squirrel',
        bodyPart: 'tail',
        adjective: 'bushy',
        noun: 'heck',
    });
});

app.get('/thank-you', function(req, res){
    res.render('thank-you');
});
app.get('/newsletter', function(req, res){
    // we will learn about CSRF later...for now, we just
    // provide a dummy value
    res.render('newsletter', { csrf: 'CSRF token goes here' });
});
app.post('/process', function(req, res){
    if(req.xhr || req.accepts('json,html')==='json'){
        // if there were an error, we would send { error: 'error description' }
        res.send({ success: true });
    } else {
        // if there were an error, we would redirect to an error page
        res.redirect(303, '/thank-you');
    }
});

app.get('/contest/vacation-photo', function(req, res){
    var now = new Date();
    res.render('contest/vacation-photo', { year: now.getFullYear(), month: now.getMonth() });
});
app.get('/contest/jquery-file', function(req, res){
    var now = new Date();
    res.render('contest/jquery-file', { year: now.getFullYear(), month: now.getMonth() });
});
app.post('/contest/vacation-photo/:year/:month', function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if(err) return res.redirect(303, '/error');
        console.log('received fields:');
        console.log(fields);
        console.log('received files:');
        console.log(files);
        res.redirect(303, '/thank-you');
    });
});

app.use('/upload', function(req, res, next){
    var now = new Date();
    jqupload.fileHandler({
        uploadDir: function () {
            return __dirname + '/public/uploads/'+ now;
        },
        uploadUrl: function(){
            return __dirname + '/uploads/'+ now;
        }(req, res, next)
    })
});

app.get('/sendemail', function(req, res){
    emailService.send('326283679@qq.com','hello', 'this is node email');
})

// for now, we're mocking NewsletterSignup:
function NewsletterSignup(){
}
NewsletterSignup.prototype.save = function(cb){
    cb();
};

var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

app.post('/newsletter', function(req, res){
    var name = req.body.name || '', email = req.body.email || '';
    // input validation
    if(!email.match(VALID_EMAIL_REGEX)) {
        if(req.xhr) return res.json({ error: 'Invalid name email address.' });
        req.session.flash = {
            type: 'danger',
            intro: 'Validation error!',
            message: 'The email address you entered was  not valid.',
        };
        return res.redirect(303, '/newsletter/archive');
    }
    new NewsletterSignup({ name: name, email: email }).save(function(err){
        if(err) {
            if(req.xhr) return res.json({ error: 'Database error.' });
            req.session.flash = {
                type: 'danger',
                intro: 'Database error!',
                message: 'There was a database error; please try again later.',
            };
            return res.redirect(303, '/newsletter/archive');
        }
        if(req.xhr) return res.json({ success: true });
        req.session.flash = {
            type: 'success',
            intro: 'Thank you!',
            message: 'You have now been signed up for the newsletter.',
        };
        return res.redirect(303, '/newsletter/archive');
    });
});
app.get('/newsletter/archive', function(req, res){
    res.render('newsletter/archive');
});

app.get('/fail', function(req ,res){
    throw  new Error('Nope!');
});

app.use(function(err, req, res, next){
    console.error(err.stack);
    app.status(500).render('500');
})

app.get('/vacation/:vacation', function(req, res, next){
    Vacation.findOne({ slug: req.params.vacation }, function(err, vacation){
        if(err) return next(err);
        if(!vacation) return next();
        res.render('vacation', { vacation: vacation });
    });
});

function convertFromUSD(value, currency){
    switch(currency){
        case 'USD': return value * 1;
        case 'GBP': return value * 0.6;
        case 'BTC': return value * 0.0023707918444761;
        default: return NaN;
    }
}

app.get('/vacations', function(req, res){
    Vacation.find({ available: true }, function(err, vacations){
        var currency = req.session.currency || 'USD';
        var context = {
            currency: currency,
            vacations: vacations.map(function(vacation){
                return {
                    sku: vacation.sku,
                    name: vacation.name,
                    description: vacation.description,
                    inSeason: vacation.inSeason,
                    price: convertFromUSD(vacation.priceInCents/100, currency),
                    qty: vacation.qty,
                };
            })
        };
        switch(currency){
            case 'USD': context.currencyUSD = 'selected'; break;
            case 'GBP': context.currencyGBP = 'selected'; break;
            case 'BTC': context.currencyBTC = 'selected'; break;
        }
        res.render('vacations', context);
    });
});

app.get('/notify-me-when-in-season', function(req, res){
    res.render('notify-me-when-in-season', { sku: req.query.sku });
});

app.post('/notify-me-when-in-season', function(req, res){
    VacationInSeasonListener.update(
        { email: req.body.email },
        { $push: { skus: req.body.sku } },
        { upsert: true },
        function(err){
            if(err) {
                console.error(err.stack);
                req.session.flash = {
                    type: 'danger',
                    intro: 'Ooops!',
                    message: 'There was an error processing your request.',
                };
                return res.redirect(303, '/vacations');
            }
            req.session.flash = {
                type: 'success',
                intro: 'Thank you!',
                message: 'You will be notified when this vacation is in season.',
            };
            return res.redirect(303, '/vacations');
        }
    );
});
//404 page
app.use(function(req, res){
    res.status(404);
    res.render('404');
});

//500 page
app.use(function(err,req, res, next){
    console.error(err.stack);
    res.status(500);
    res.render('500');
});


//var server = http.createServer(app).listen(app.get('port'), function(){
//    console.log('Listening on port %d', app.get('port'));
//})
function startServer(){
    app.listen(app.get('port'), function(){
        console.log('Express started '+ app.get('env')+' on http://localhost:' + app.get('port')+ '');
    });
};

if (require.main == module){
    //application run directly
    startServer();
}else{
    module.exports = startServer;
}


