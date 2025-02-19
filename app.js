const express = require("express");
const fetch = require('node-fetch');
const crypto = require('crypto');
const net = require('net');
const tls = require('tls');
const dns = require('dns');
const app = express();
const basicAuth = require('express-basic-auth')
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.static('static'));
const port = process.env.PORT || 8080
var currentserver = "lb-iss01-classic-prod.animaljam.com";
var PWBuildVersion = "63.0.11";
var PWServer = "lb-aws-or-prod-iss04-mobile.animaljam.com";
var dv = "1619";
app.listen(port, async () => {
  await updateFlashvars();
    await updateFlashvarsPW();
  console.log("server is running on port", port);
});
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
})
function updateFlashvars() {
  return new Promise(resolve => {
    let getHeader = {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    };  
    fetch("https://api-animal-jam-001.herokuapp.com/flashvars", getHeader).then(res => res.json()).then(info => {
      currentserver = info["smartfoxServer"];
      dv = info["deploy_version"];
      return resolve();
    }).catch(err => {
      console.log("Error when retrieving flashvars: " + err);
      return resolve();
    });
  })
}

function updateFlashvarsPW() {
  return new Promise(resolve => {
    let getHeader = {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    };
    fetch("https://api-animal-jam-001.herokuapp.com/flashvars-mobile", getHeader).then(res => res.json()).then(info => {
      PWServer = "lb-" + info["game_server"]["smartfoxServer"];
      PWBuildVersion = info["build_Version"];
      return resolve();
    }).catch(err => {
      console.log("Error when retrieving play wild  flashvars: " + err);
      return resolve();
    });
  })
}
app.post("/Raid", async function (request, response) {
  const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
  var reqbody = request.body;
  try {
    if (reqbody.classicOrPW == "classic") {
      await updateFlashvars();
    }
    else if (reqbody.classicOrPW == "PW") {
     await updateFlashvarsPW();
    }
    else {
      response.send({ result: "failure" });
      return;
    }
    var accountsarray = reqbody.accounts;
    console.log(currentserver);
    var functionarray = [];
    if (accountsarray === undefined) {
      response.send({ result: "failue" });
      return;
    }
    else if (accountsarray.length > 2000) {
      response.send({ result: "failure" });
      return;
    }
    else if (reqbody.target !== undefined && !(accountsarray.length < 0)) {
      var msg = null;
      if (reqbody.message !== undefined) {
        msg = reqbody.message;
      }
      response.json({ result: "success" });
      for (let i = 0; i < accountsarray.length; i++) {
        var username = accountsarray[i].username;
        var password = accountsarray[i].password;
        if ((username || password) === undefined) {
          continue;
        }
        await snooze(800);
        if (reqbody.classicOrPW == "classic") {
          var token = await login(username, password);
          if (token == null) {
            console.log(`Error logging in ${username}`);
            continue;
          }
          else {
            console.log("Logged in " + username + "  Token : " + token);
            connecttohostmsg(currentserver, dv, token, username, reqbody.target, msg);
          }
        }
        if (reqbody.classicOrPW == "PW") {
          var token = await loginMobile(username, password);
          if (token == null) {
            console.log(`Error logging in to Play Wild ${username}`);
            continue;
          }
          else {
            console.log("Logged in " + username + " to Play Wild,  Token : " + token);
            raidPlayWild(PWServer, PWBuildVersion, token, username, reqbody.target, msg);
          }
        }
      }
    }
  }
  catch (error) {
    console.log("Error : " + error)
    response.send({ result: "failure" });
  }

})
function login(user, pass) {
  return new Promise(resolve => {
    let login = {
      screen_name: user,
      password: pass
    };
    let postHeader = {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(login)
    };
    fetch("https://api-animal-jam-001.herokuapp.com/login", postHeader).then(res => res.json()).then(info => {
      return resolve(info["game_auth_token"]);
    }).catch(err => {
      console.log("Error when logging in " + user);
      return resolve(null);
    });
  })
}
function loginMobile(user, pass) {
  return new Promise(resolve => {
    let login = {
      screen_name: user,
      password: pass,
      client_version: PWBuildVersion
    };
    let postHeader = {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(login)
    };
    fetch("https://api-animal-jam-001.herokuapp.com/login-mobile", postHeader).then(res => res.json()).then(info => {
      return resolve(info["game_auth_token"]);
    }).catch(err => {
      console.log("Error when logging in " + user + " into Play Wild");
      return resolve(null);
    });
  })
}
function connecttohostmsg(ip, deployv, t, u, den, msg) {
  return new Promise(async resolve => {
    var hasStarted = false;
    var noerror = false;
    var socket = tls.connect({ host: ip, port: 443, rejectUnauthorized: false });
    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
      socket.on('connect', async function () {
        socket.write(`<msg t='sys'><body action='rndK' r='-1'></body></msg>\x00`);
        await snooze(500);
      });
      socket.on('data', async function (data) {
        var rdata = data.toString();
        //console.log(rdata);
        /*if (rdata.includes(`%xt%ac%`)) {
          var arr = rdata.split("%");
          var username = arr[arr.indexOf('ac') + 6];
          //while(noerror == false && hasStarted == true){
          socket.write(`%xt%o%es%-1%${username}%4548%13%1%AJ CLASSIC ROCKS!%0%-1%0%\x00`);
          await snooze(3000);
    socket.write(`%xt%o%ba%0%${username}%\x00`);
    await snooze(2000);
      //  } 
        }
        if(rdata.includes(`%xt%bs%`)){
          var arr = rdata.split("%");
          var username = arr[arr.indexOf('bs') + 3];
          socket.write(`%xt%o%bd%0%${username}%\x00`);
          await snooze(700);
          socket.write(`%xt%o%ba%0%${username}%\x00`);
          await snooze(700);
        }*/
        if (rdata.includes(`<msg t='sys'><body action='rndK' r='-1'><k>`)) {
          var loginTag = `<login z="sbiLogin"><nick><![CDATA[${u}%%0%${deployv}%electron%1.4.3%WIN]]></nick><pword><![CDATA[${t}]]></pword></login>`;
          var hash = Buffer.from(crypto.createHmac('sha256', rdata.split("<k>")[1].split("</k>")[0]).update(loginTag).digest()).toString("base64");
          socket.write(`<msg t='sys' h="${hash}"><body action="login" r="0">${loginTag}</body></msg>\x00`);
          await snooze(2000);
          socket.write(`%xt%o%rj%0%${den}#-1%1%0%2%\x00`);
          await snooze(1000);
          //socket.write(`%xt%o%rj%0%denauth12966%1%0%2%\x00`);
          //await snooze(1000);
          socket.write("%xt%o%au%0%1%" + between(0, 1100) + "%" + between(0, 1100) + "%16%1%\x00");
          await snooze(1000);
          console.log("Entering loop! Prepare to jump into hyperspace!");
          hasStarted = true;
          while (true) {
            if (noerror == false) {
              socket.write("%xt%o%au%0%1%" + between(0, 1100) + "%" + between(0, 1100) + "%14%1%\x00");
              await snooze(1000);
              if (msg !== undefined || msg !== null) {
                socket.write(`<msg t='sys'><body action='pubMsg' r='0'><txt><![CDATA[${msg}%9]]></txt></body></msg>\x00`);
                await snooze(2000);
              }
              socket.write("<msg t='sys'><body action='pubMsg' r='0'><txt><![CDATA[" + between(1019311667, 4348810240) + "%8]]></txt></body></msg>\x00");
              await snooze(1000);
              socket.write("<msg t='sys'><body action='pubMsg' r='0'><txt><![CDATA[" + between(30, 50) + ",%4]]></txt></body></msg>\x00");
              await snooze(1000);
            } else {
              break;
            }
          }
          socket.end();
          console.log("Raiding stopped, You are now free to move about the cabin!");
          resolve();
        }
      })
      socket.on('close', function () { console.log("Socket closed!"); });
      socket.on('error', function (e) { console.log(`Error! ${e}`); socket.end(); noerror = true; });
    }
    catch (error) {
      console.log(`Error : ${error}`);
      resolve();
    }
  })
}
function raidPlayWild(ip, deployv, t, u, den, msg) {
  return new Promise(async resolve => {
    var hasStarted = false;
    var noerror = false;
    var socket = tls.connect({ host: ip, port: 443, rejectUnauthorized: false});
    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
      socket.on('secureConnect', async function () {
        socket.write(`<msg t='sys'><body action='rndK' r='-1'></body></msg>\x00`);
        await snooze(500);
      });
      
      socket.on('data', async function (data) {
        var rdata = data.toString();
        /*if (rdata.includes(`%xt%ac%`)) {
          var arr = rdata.split("%");
          var username = arr[arr.indexOf('ac') + 3];
          var randomTrueOrFalse = between(0,1);
          var tradeOrBuddy = (randomTrueOrFalse == 0) ? true : false;
         // while(noerror == false && hasStarted == true){
            if(tradeOrBuddy){
    socket.write(`%xt%o%ti%0%${username}%0%0%\x00`);
    await snooze(1000);
    socket.write(`%xt%o%tic%0%\x00`);
    await snooze(1000);
            }
           else{
    socket.write(`%xt%o%mp%0%39639%0%${username}%\x00`);
    await snooze(1000);
            }
         // } 
        }*/
        if (rdata.includes(`<msg t='sys'><body action='rndK' r='-1'><k>`)) {
          var loginTag = `<login z='sbiLogin'><nick><![CDATA[${u}%0%${deployv}%9%0%PC0%0%-1]]></nick><pword><![CDATA[${t}]]></pword></login>`;
          //var hash = Buffer.from(crypto.createHmac('sha256', rdata.split("<k>")[1].split("</k>")[0]).update(loginTag).digest()).toString("base64");
          //socket.write(`<msg t='sys' h="${hash}"><body action="login" r="0">${loginTag}</body></msg>\x00`);
          socket.write(`<msg t='sys'><body action='login' r='0'>${loginTag}</body></msg>\x00`);
          await snooze(2000);
        }
        if(rdata.includes(`%xt%zl%-1%0%`)){
        socket.write(`%xt%o%afp%-1%2034%2344%2364%35754%\x00`);
        await snooze(1000);
        }
        if(rdata.includes(`{"b":{"r":-1,"o":{"statusId":1`)){
          socket.write(`%xt%o%az%0%1%0%1%1%0%0%2965%2965%2992%2982%1990%2955%0%0%\x00`);
          await snooze(1000);
          socket.write(`%xt%o%rj%-1%${den}#-1%0%\x00`);
          await snooze(3000);
          socket.write(`%xt%o%au%0%1%${between(-100, 100)}%0.10%${between(-100, 100)}%90%\x00`);
          await snooze(1100);
          console.log("Entering loop! Prepare to jump into hyperspace (Play Wild)!");
          hasStarted = true;
          while (true) {
            if (noerror == false) {
              socket.write(`%xt%o%au%0%1%${between(-100, 100)}%0.10%${between(-100, 100)}%90%\x00`);
              await snooze(1100);
              if (msg !== undefined || msg !== null) {
                socket.write(`<msg t='sys'><body action='pubMsg' r='0'><txt><![CDATA[${msg}%0]]></txt></body></msg>\x00`);
                await snooze(2100);
              }
               socket.write(`<msg t='sys'><body action='pubMsg' r='0'><txt><![CDATA[45043%1]]></txt></body></msg>\x00`)
               await snooze(2100);
              socket.write(`%xt%o%au%0%1%${between(-100, 100)}%0.10%${between(-100, 100)}%90%\x00`);
              await snooze(1100);
            } else {
              break;
            }
          }
          socket.end();
          console.log("Raiding for Play Wild stopped, You are now free to move about the cabin!");
          resolve();
        }
      })
      socket.on('close', function () { console.log("Socket closed!"); });
      socket.on('error', function (e) { console.log(`Error! ${e}`); socket.end(); noerror = true; });
    }
    catch (error) {
      console.log(`Error : ${error}`);
      resolve();
    }
  })
}
function between(min, max) {
  return Math.floor(
    Math.random() * (max - min) + min
  )
}
