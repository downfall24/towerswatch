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
    
    urls = ['http://ridetimes.co.uk/?group=Thrill', 'http://ridetimes.co.uk/?group=Family'];

    urls.forEach(function(url) {

        request(url, function(error, response, html){

            if(!error){
    
                var $ = cheerio.load(html);
    
                $('.ride-cell').filter(function(){
                    var data = $(this);
                    
                    var ridename = data.text();
                    var queuetime = data.next('.time-cell').children('span').text();
    
                    connection.query('SELECT rideid, name FROM rides WHERE name = ?', [ridename], function (error, results, fields) {
                        if (error) throw error;
    
                        // CHECK RIDE IS IN DB
                        if(results.length == 0) {
                            console.log("== ADDING RIDE: " + ridename + " ==");
                            connection.query('INSERT INTO rides (name) VALUES (?)', [ridename], function (error, results, fields) {
                                if (error) throw error;
                                //console.log(results);
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
    });
    res.status(200).json({err:false,data:"Queue times updated."});

})

// Bootstrap routes
var routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(function(file) {
  app.use(express.static(__dirname + '/public'));
});

app.listen('8081')
console.log('Awaiting connections on 8081');
exports = module.exports = app;