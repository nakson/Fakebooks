const url = require("url");
const sqlite3 = require("sqlite3").verbose(); //verbose provides more detailed stack trace

//connect to sqlite database
//const db = new sqlite3.Database('data/db_1200iRealSongs')
const db = new sqlite3.Database("data/fakebooks3005fall2018.db");

db.serialize(function () {
  //make sure a couple of users exist in the database for testing.
  //user: yang password: secret
  //user: book password: ok
  var sqlString =
    "CREATE TABLE IF NOT EXISTS users (userid TEXT PRIMARY KEY, password TEXT)";
  db.run(sqlString);
  sqlString = "INSERT OR REPLACE INTO users VALUES ('yang', 'secret')";
  db.run(sqlString);
  sqlString = "INSERT OR REPLACE INTO users VALUES ('book', 'ok')";
  db.run(sqlString);
});

exports.authenticate = function (request, response, next) {
  /*
	Middleware to do BASIC HTTP 401 authentication
  The function will check that an userid/password authentication record
  is contained in the request header from the brower. If not the response
  will result in the browser asking the client user to supply a userid/password.

  If the userid/password record is present it will used to verify that
  the user is among those in the users table of the sqlite database.

  You can bypass this authentication altogether by removing the
  app.use(routes.authenticate) statement in the server code
	*/
  let auth = request.headers.authorization;
  // auth is a base64 representation of (username:password)
  //so we will need to decode the base64
  if (!auth) {
    //note here the setHeader must be before the writeHead
    response.setHeader("WWW-Authenticate", 'Basic realm="need to login"');
    response.writeHead(401, {
      "Content-Type": "text/html",
    });
    console.log("No authorization found, send 401.");
    response.end();
  } else {
    console.log("Authorization Header: " + auth);
    //decode authorization header
    // Split on a space, the original auth
    //looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
    let tmp = auth.split(" ");

    // create a buffer and tell it the data coming in is base64
    let buf = new Buffer(tmp[1], "base64");

    // read it back out as a string
    //should look like 'yang:secret'
    let plain_auth = buf.toString();
    console.log("Decoded Authorization ", plain_auth);

    //extract the userid and password as separate strings
    let credentials = plain_auth.split(":"); // split on a ':'
    let username = credentials[0];
    let password = credentials[1];
    console.log("User: ", username);
    console.log("Password: ", password);

    let authorized = false;
    //check database users table for user
    db.all("SELECT userid, password FROM users", function (err, rows) {
      for (let i = 0; i < rows.length; i++) {
        if ((rows[i].userid == username) & (rows[i].password == password))
          authorized = true;
      }
      if (authorized == false) {
        //we had an authorization header by the user:password is not valid
        response.setHeader("WWW-Authenticate", 'Basic realm="need to login"');
        response.writeHead(401, {
          "Content-Type": "text/html",
        });
        console.log("No authorization found, send 401.");
        response.end();
      } else next();
    });
  }
  //notice no call to next() here
};

function parseURL(request, response) {
  let parseQuery = true; //parseQueryStringIfTrue
  let slashHost = true; //slashDenoteHostIfTrue
  let urlObj = url.parse(request.url, parseQuery, slashHost);
  console.log("path:");
  console.log(urlObj.path);
  console.log("query:");
  console.log(urlObj.query);
  //for(x in urlObj.query) console.log(x + ': ' + urlObj.query[x]);
  return urlObj;
}

/*
JSON API METHODS
These route functions return JSON data to clients
expecting clients to do their own rendering
*/

exports.api_users = function (request, response) {
  // /api/users
  let result = { users: [] }; //data object to send to client
  db.all("SELECT userid, password FROM users", function (err, rows) {
    for (let i = 0; i < rows.length; i++) {
      let user = {};
      user.userid = rows[i].userid;
      user.password = rows[i].password;
      result.users.push(user); //append to users array in result object
    }
    //write header with HTTP success code and MIME type
    response.writeHead(200, {
      "Content-Type": "application/json",
    });
    //write JSON data and send response to client
    response.end(JSON.stringify(result));
  });
};

exports.api_songs = function (request, response) {
  // /api/songs?keyword=Girl
  // /api/songs?keyword=Jobim
  //responds to client with JSON data
  console.log("RUNNING FIND SONGS JSON API");

  var urlObj = parseURL(request, response);
  //use prepared sql statements (the ones with ? parameters)

  //SELECT id, title FROM songs WHERE title LIKE '%Girl%'

  let sql =
    "SELECT id, title FROM songs WHERE title LIKE ? OR composer LIKE ? ORDER BY title ASC LIMIT 30";
  let title = "%"; //sql match anything character
  let composer = "%"; //sql match anything character
  if (urlObj.query["keyword"]) {
    title = `%${urlObj.query["keyword"]}%`;
    composer = `%${urlObj.query["keyword"]}%`;
    console.log("finding title or composer like: " + urlObj.query["keyword"]);
  }

  let result = {
    songs: [],
  }; //data object to send to client
  db.all(sql, title, composer, function (err, rows) {
    for (let i = 0; i < rows.length; i++) {
      let song = {};
      song.id = rows[i].id;
      song.title = rows[i].title;
      result.songs.push(song);
    }
    //write header with HTTP success code and MIME type
    response.writeHead(200, {
      "Content-Type": "application/json",
    });
    //write JSON data and send response to client
    response.end(JSON.stringify(result));
  });
};

exports.api_books = function (request, response) {
  // /api/books?keyword=RealBook1
  // /api/books?keyword=RBK1
  //responds to client with JSON data
  console.log("RUNNING FIND BOOKS JSON API");

  var urlObj = parseURL(request, response);
  //use prepared sql statements (the ones with ? parameters)

  //SELECT bookcode, title FROM bookcodes WHERE title LIKE '%Real Book%'

  let sql =
    "SELECT bookcode, title FROM bookcodes WHERE bookcode LIKE ? OR title LIKE ? ORDER BY bookcode ASC";
  let title = "%"; //sql match anything character
  let bookcode = "%"; //sql match anything character
  if (urlObj.query["keyword"]) {
    title = `%${urlObj.query["keyword"]}%`;
    bookcode = `%${urlObj.query["keyword"]}%`;
    console.log("finding bookcode or book title like: " + urlObj.query["keyword"]);
  }

  let result = {
    books: [],
  }; //data object to send to client
  db.all(sql, bookcode, title, function (err, rows) {
    for (let i = 0; i < rows.length; i++) {
      let book = {};
      book.bookcode = rows[i].bookcode;
      book.title = rows[i].title;
      result.books.push(book);
    }
    //write header with HTTP success code and MIME type
    response.writeHead(200, {
      "Content-Type": "application/json",
    });
    //write JSON data and send response to client
    response.end(JSON.stringify(result));
  });
};

exports.api_songDetails = function (request, response) {
  // /api/song/id
  // /api/song/235

  let urlObj = parseURL(request, response);
  let songID = urlObj.path; //expected form: /song/235
  songID = songID.substring(songID.lastIndexOf("/") + 1, songID.length);

  //use of a prepared sql statement (the ones with ? parameters)
  let sql =
    "SELECT id, title, composer, bookcode, page, length, studentnum FROM songs WHERE id=?";
  console.log("API: GET SONG DETAILS: " + songID);

  let result = {}; //data object to send to client
  db.all(sql, songID, function (err, rows) {
    console.log("Song Data");
    console.log(rows);
    //note: only one result row is expected
    for (let i = 0; i < rows.length; i++) {
      result.id = rows[i].id;
      result.title = rows[i].title;
      result.composer = rows[i].composer;
      result.bookcode = rows[i].bookcode;
      result.page = rows[i].page;
      result.length = rows[i].length;
      result.studentnum = rows[i].studentnum;
    }
    //write header with HTTP success code and MIME type
    response.writeHead(200, {
      "Content-Type": "application/json",
    });
    //write JSON data and send response to client
    response.end(JSON.stringify(result));
  });
};

exports.api_bookDetails = function (request, response) {
  // /api/book/bookcode
  // /api/book/RBK1

  let urlObj = parseURL(request, response);
  let bookID = urlObj.path; //expected form: /book/RBK1
  bookID = bookID.substring(bookID.lastIndexOf("/") + 1, bookID.length);

  //use of a prepared sql statement (the ones with ? parameters)
  let sql =
    "SELECT bookcode, title, format, filename, page_offset, num_pages FROM bookcodes WHERE bookcode LIKE ?";
  console.log("API: GET BOOK DETAILS: " + bookID);

  let result = {}; //data object to send to client
  db.all(sql, bookID, function (err, rows) {
    console.log("Book Data");
    console.log(rows);
    //note: only one result row is expected
    for (let i = 0; i < rows.length; i++) {
      result.bookcode = rows[i].bookcode;
      result.title = rows[i].title;
      result.format = rows[i].format;
      result.filename = rows[i].filename;
      result.page_offset = rows[i].page_offset;
      result.num_pages = rows[i].num_pages;
    }
    //write header with HTTP success code and MIME type
    response.writeHead(200, {
      "Content-Type": "application/json",
    });
    //write JSON data and send response to client
    response.end(JSON.stringify(result));
  });
};

exports.api_update_song = function (request, response) {
  //http: POST api/song/235

  let urlObj = parseURL(request, response);
  let songID = urlObj.path; //expected form: /song/235
  songID = songID.substring(songID.lastIndexOf("/") + 1, songID.length);

  let songData = request.body; //body of HTTP POST message

  console.log("API: UPDATE SONG: " + songID);
  console.log(`Song Data:`);
  console.log(songData);
  /*
  CREATE TABLE songs (
id integer primary key not null,
title text not null, --title of song
composer text, --composer(s) of song
bookcode text, --book song is from
page integer, --page number of song in book
length integer, --length of song in pages
studentnum text --contributor of data
);
  */
  //use of a prepared sql statement (the ones with ? parameters)
  let sql = `INSERT OR REPLACE INTO songs (id,title,composer,bookcode,page,length,studentnum) VALUES (?,?,?,?,?,?,?)`;

  console.log(sql);
  db.run(
    sql,
    songData.id,
    songData.title,
    songData.composer,
    songData.bookcode,
    songData.page,
    songData.length,
    songData.studentnum,
    function (err) {
      console.log(`ERR?: ${err}`);
      let result = { status: "SUCCESS" }; //data object to send to client
      if (err) result.status = "ERROR";
      //write header with HTTP success code and MIME type
      response.writeHead(200, {
        "Content-Type": "application/json",
      });
      //write JSON data and send response to client
      response.end(JSON.stringify(result));
    }
  );
};

exports.api_update_book = function (request, response) {
  //http: POST api/book/RBK1

  let urlObj = parseURL(request, response);
  let bookID = urlObj.path; //expected form: /book/RBK1
  bookID = bookID.substring(bookID.lastIndexOf("/") + 1, bookID.length);

  let bookData = request.body; //body of HTTP POST message

  console.log("API: UPDATE BOOK: " + bookID);
  console.log(`Book Data:`);
  console.log(bookData);
  /*
  CREATE TABLE bookcodes (
  bookcode text primary key not null,
  title text not null,
  format text,
  filename text,
  page_offset integer,
  num_pages integer default 0
  );

  */
  //use of a prepared sql statement (the ones with ? parameters)
  let sql = `INSERT OR REPLACE INTO bookcodes (bookcode,title,format,filename,page_offset,num_pages) VALUES (?,?,?,?,?,?)`;

  console.log(sql);
  db.run(
    sql,
    bookData.bookcode,
    bookData.title,
    bookData.format,
    bookData.filename,
    bookData.page_offset,
    bookData.num_pages,
    function (err) {
      console.log(`ERR?: ${err}`);
      let result = { status: "SUCCESS" }; //data object to send to client
      if (err) result.status = "ERROR";
      //write header with HTTP success code and MIME type
      response.writeHead(200, {
        "Content-Type": "application/json",
      });
      //write JSON data and send response to client
      response.end(JSON.stringify(result));
    }
  );
};
