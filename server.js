var express = require('express'),
fs = require('fs'),
request = require('request'),
cheerio = require('cheerio'),
fs = require('fs'),
path = require('path'),
app = express();


var mysql = require('mysql'),
pool = mysql.createPool({
  host     : process.env.DATABASE_HOST,
  user     : process.env.DATABASE_USER,
  port     : process.env.DATABASE_PORT,
  password : process.env.DATABASE_PASSWORD,
  database : process.env.DATABASE_NAME
});  

app.get('/getdata', function(req, res) {
    connection.connect();
    connection.query('SELECT r.name, q.queuetime, DATE_FORMAT(createdon, "%H:%i") AS "time"  FROM queuetime q, rides r WHERE q.rideid = r.rideid AND DATE(createdon) = CURDATE()', function (error, results, fields) {
        if (error) throw error;
        res.status(200).json({err:false,data:results});
    });
    connection.end();
})

app.get('/gettimes', function(req, res){

    var counter = 0;
    var ridesclosed = 0;
    
    urls = ['http://ridetimes.co.uk/?group=Thrill', 'http://ridetimes.co.uk/?group=Family'];

    urls.forEach(function(url) {

        request(url, function(error, response, html){

            if(!error){
    
                var $ = cheerio.load(html);

                $('.ride-cell').filter(function(){
                    var data = $(this);
                    
                    var ridename = data.text();
                    var queuetime = data.next('.time-cell').children('span').text().toLowerCase;

                    console.log(queuetime);
                    counter++;
    
                    pool.query('SELECT rideid, name FROM rides WHERE name = ?', [ridename], function (error, results, fields) {
                        if (error) throw error;
    
                        // Check ride exists in the database, if not then lets add it
                        if(results.length == 0) {
                            console.log("== ADDING RIDE: " + ridename + " ==");
                            pool.query('INSERT INTO rides (name) VALUES (?)', [ridename], function (error, results, fields) {
                                if (error) throw error;
                                //console.log(results);
                            });
                        } else {
                            // Record the current queue time for this ride

                            // Mark ride as closed if queue time is 'Closed'
                            if (queuetime == "closed") {
                                ridesclosed++;
                                pool.query('INSERT INTO queuetime (rideid, queuetime, closed) VALUES (?, ?, 1)', [results[0].rideid, queuetime], function (error, results, fields) {
                                    if (error) throw error;
                                });
                            } else {
                                pool.query('INSERT INTO queuetime (rideid, queuetime) VALUES (?, ?)', [results[0].rideid, queuetime], function (error, results, fields) {
                                    if (error) throw error;
                                });
                            }

                        }
    
                      });
                  
                })

            }

        })
    });

    // TODO: Change this so that it actually fires when total calculated rides have processed
    setTimeout(function(){
        console.log(new Date().toLocaleString() + " - " + counter + " ride times updated. " + ridesclosed + " rides are closed.");
        res.status(200).json({err:false,data:"Queue times updated."});
    },5000);

})

// Bootstrap routes
var routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(function(file) {
  app.use(express.static(__dirname + '/public'));
});

app.listen('8081')
console.log('Awaiting connections on 8081 - Database: ' + process.env.DATABASE_HOST);
exports = module.exports = app;     