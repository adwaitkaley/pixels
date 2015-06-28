var ejs = require('ejs');
var mysql = require('mysql');

function getConnection(){
	var connection = mysql.createConnection({
	    host     : 'pixel.cxyohzvevfg5.us-west-2.rds.amazonaws.com',
	    user     : 'db_pixel',
	    password : 'db_pixel',
	    database : 'db_pixel'
	});
	return connection;
}


function Pool(no_of_conn)
{
	this.pool = [];
	for(var i=0; i < no_of_conn; ++i)
        this.pool.push(getConnection()); 
	//console.log(this.pool);
    this.last = 0;
}

Pool.prototype.get = function()
{
	var cli = this.pool[this.last];
	this.last++;
    if (this.last == this.pool.length) 
    	this.last = 0;
    return cli;
}

exports.dbcall = function(callback, sqlQuery) {

	var p = new Pool(150);
	/*for (var i=0; i < 10; ++i)
	{*/

		p.get().query(sqlQuery, function(err, rows, fields) {

			if (err) {
				console.log("ERROR: " + err.message);
				console.log("for error query: "+sqlQuery);
			} else { 
				console.log("\nSQL Query::" + sqlQuery);
				callback(err, rows);
			}
		}); 
		console.log("\nConnection closed in pool..");
		//}
}