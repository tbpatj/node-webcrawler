let Crawler = require("crawler");
cheerio = require("cheerio");
let fs = require("fs");

let MovieData = {};

let c = new Crawler({
  maxConnections: 1,
  jQuery: false,

  callback: () => {},
});

//update the movies.json file
function filter() {
  try {
    console.log("reading data");
    var fs = require("fs");
    var data = JSON.parse(fs.readFileSync("movies.json", "utf8"));
    console.log("read data... now writing data");

    for (key in data) {
      c.queue([
        {
          uri: `${data[key].href}`,
          jQuery: false,
          callback: getMainMovieInfo,
          movieIndex: i,
        },
      ]);
    }

    data = JSON.stringify(data);
    fs.writeFile(`movies.json`, data, "utf8", (err) => console.log(err));
    console.log("finished");
  } catch (err) {
    console.log(err);
  }
}
