var express = require('express'),
fs = require('fs'),
request = require('request'),
cheerio = require('cheerio'),
fs = require('fs'),
path = require('path'),
app     = express();


app.get('/gettimes', function(req, res){

    var mysql      = require('mysql');
    var connection = mysql.createConnection({
      host     : process.env.DATABASE_HOST,
      user     : process.env.DATABASE_USER,
      password : process.env.DATABASE_PASSWORD,
      database : process.env.DATABASE_NAME
    });  
    
    connection.connect();
    
    url = 'http://ridetimes.co.uk/';

    request(url, function(error, response, html){

        if(!error){

            var $ = cheerio.load(html);

            $('.ride-cell').filter(function(){
                var data = $(this);
                
                var ridename = data.html();
                var queuetime = data.next('.time-cell').children('span').html();

                connection.query('SELECT rideid, name FROM rides WHERE name = ?', [ridename], function (error, results, fields) {
                    if (error) throw error;

                    // CHECK RIDE IS IN DB
                    if(results.length == 0) {
                        connection.query('INSERT INTO rides (name) VALUES (?)', [ridename], function (error, results, fields) {
                            if (error) throw error;
                            console.log(results);
                        });
                    } else {
                        // RECORD QUEUE TIME

                        console.log(ridename + " - " + queuetime);
                        connection.query('INSERT INTO queuetime (rideid, queuetime) VALUES (?, ?)', [results[0].rideid, queuetime], function (error, results, fields) {
                            if (error) throw error;
                        });

                    }



                  });
              
            })
        }
    })
})

// Bootstrap routes
var routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(function(file) {
  app.use(express.static(__dirname + '/public'));
});

app.listen('8081')
console.log('Awaiting connections on 8081');
exports = module.exports = app;