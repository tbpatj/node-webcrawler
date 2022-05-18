let Crawler = require("crawler");
cheerio = require("cheerio");
let fs = require("fs");

let movies = [];
let moviesToCleanUp = [];
let curIdNum = 0;

function writeToFile(filename, data) {
  data = JSON.stringify(data);
  fs.writeFile(`${filename}.json`, data, "utf8", (err) => console.log(err));
}
function getIDNum() {
  try {
    var fs = require("fs");
    var data = JSON.parse(fs.readFileSync("movies.json", "utf8"));
    curIdNum = Object.keys(data).length;
    console.log(`We have ${curIdNum} entries`);
  } catch (err) {
    console.log(err);
  }
}
//update the movies.json file
function updateMovies() {
  try {
    console.log("reading data");
    var fs = require("fs");
    var data = JSON.parse(fs.readFileSync("movies.json", "utf8"));
    data = { ...data, ...movies };
    console.log("read data... now writing data");

    data = JSON.stringify(data);
    fs.writeFile(`movies.json`, data, "utf8", (err) => console.log(err));
    console.log("finished");
  } catch (err) {
    console.log(err);
  }
}

function getMainMovieInfo(err, res, done) {
  if (err) {
    console.log(err);
  } else {
    $ = cheerio.load(res.body);
    let releaseYear = $('span[class="release_date"]').text();
    let release = $('span[class="release"]')
      .text()
      .replace(/\n/, "")
      .replace(/\s/g, "");
    let certification = $('span[class="certification"]')
      .text()
      .replace(/\n/, "")
      .replace(/\s/g, "");
    let runtime = $('span[class="runtime"]')
      .text()
      .replace(/\n/, "")
      .replace(/\s/g, "");
    //get the genres
    let genres = [];
    $('span[class="genres"]')
      .children()
      .each((i, elm) => {
        genres.push($(elm).text());
      });
    //get the description
    let overview = $('div[class="overview"]').children().first().text();
    //get the link to the backdrops page

    //pass the movie index from the parameter passed in when queing the page crawl
    let mI = res.options.movieIndex;

    //set the movie list to what we got
    if (
      (certification === "PG" || certification === "G") &&
      certification !== "R" &&
      certification !== "R21" &&
      certification !== "M18" &&
      certification !== "16" &&
      certification !== "18" &&
      certification !== "A" &&
      certification !== "15" &&
      certification !== "17" &&
      certification !== "PG-13" &&
      certification !== "14" &&
      certification !== "T" &&
      certification !== "NR" &&
      certification !== "" &&
      movies[mI].Title !== "The Seven Deadly Sins: Cursed by Light" &&
      movies[mI].Title !== "Exploits of a Young Don Juan" &&
      !genres.includes("Romance") &&
      !genres.includes("Horror")
    ) {
      curIdNum++;
      movies[mI].id = curIdNum;
      console.log(`added ${movies[mI].Title}`);
      movies[mI] = {
        ...movies[mI],
        Released: release,
        Runtime: runtime,
        Genre: JSON.stringify(genres),
        Rated: certification,
        Plot: overview,
      };
    } else {
      moviesToCleanUp.push(mI);
      console.log("skipped " + certification);
    }
  }
  done();
}
function getMovies(err, res, done) {
  if (err) {
    console.log(err);
  } else {
    $ = cheerio.load(res.body);

    $('a[class="image"]').each((i, e) => {
      let title = $(e).attr("title");
      let href = $(e).attr("href");
      let src = $(e).find("img").attr("src");
      movies.push({
        id: curIdNum,
        Title: title,
        Poster: `https://www.themoviedb.org${src}`,
        href: `https://www.themoviedb.org${href}`,
      });
      console.log(`implementing: ${movies[movies.length - 1].Title}`);
    });
  }
  done();
  return movies;
}

function getMovieBackdrops(err, res, done) {
  if (err) {
    console.log(err);
  } else {
    $ = cheerio.load(res.body);

    //get a list of the backdrop images
    let listOfImages = [];
    $('a[class="image"]').each((i, e) => {
      listOfImages.push(`https://www.themoviedb.org${$(e).attr("href")}`);
    });

    //pass the movie index from the parameter passed in when queing the page crawl
    let mI = res.options.movieIndex;
    movies[mI].Images = listOfImages;
  }
  done();
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

let c = new Crawler({
  maxConnections: 1,
  jQuery: false,

  callback: getMovies,
});

async function runCrawler() {
  console.log("starting deeper dive");
  for (let i = 0; i < movies.length; i++) {
    c.queue([
      {
        uri: `${movies[i].href}`,
        jQuery: false,
        callback: getMainMovieInfo,
        movieIndex: i,
      },
      {
        uri: `${movies[i].href}/images/backdrops`,
        jQuery: false,
        callback: getMovieBackdrops,
        movieIndex: i,
      },
    ]);
  }
}

function filterMoveListIntoObject() {
  let movieObject = {};
  for (let i = 0; i < movies.length; i++) {
    movieObject[movies[i].id] = { ...movies[i] };
  }
  return movieObject;
}

c.on("drain", () => {
  if (eventFinish === 0) {
    if (curPage < endPage) {
      curPage++;
      console.log("--------------------------");
      console.log(`         Page ${curPage}`);
      console.log("--------------------------");
      //run through the a undescriptive list of movies and add the links to get more detailed data
      c.queue(`https://www.themoviedb.org/movie?page=${curPage}`);
    } else {
      //once we have hit all the pages we are trying to hit we move to the next event which is crawling through for more detailed data
      eventFinish = 1;
      runCrawler();
      //   writeToFile("movies", movies);
    }
  } else if (eventFinish === 1) {
    eventFinish = 2;
    console.log("---cleaning up movies---");
    for (let i = 0; i < moviesToCleanUp.length; i++) {
      movies.splice(moviesToCleanUp[i] - i, 1);
    }
    moviesToCleanUp = [];
    movies = filterMoveListIntoObject();
    updateMovies();
  }
});
let eventFinish = 0;
let curPage = 241;
let endPage = 300;
getIDNum();
c.queue(`https://www.themoviedb.org/movie?page=${curPage}`);
// updateMovies();
