var RoomSchema = require('../models/room_model');
var Utils = require('../utils/utility');
var UserModel = require('../models/users_model');
var OnlinePlayerModel = require('../models/online_player_model');
var SocketController = require('socket_controller_deprecated');
var Q = require('q');
var http = require('http');
var ip = require('ip');



function storePlayerMeta(roomName, gameLocation, roomAdmin, request, response) {
    // checking if the room already exists and sending responses accordingly
    RoomSchema.findOne({roomname : roomName}, function(error, room) {
        if (error) {
           console.log(0)
            response.send({status: false, message: "Error during room establishment"});
        } else if (room == null) {
            console.log(1)
            createRoomAndDispatchRequests();
            response.send({status: true, message: "Request sent successfully", game_location: gameLocation, room_name:roomName});
        } else {
            response.send({status: true, message: "Room already exists", game_location: room['gameLocation'], room_name:room['roomname']});
        }
    });


    function createRoomAndDispatchRequests() {

        var roomModel = new RoomSchema();

        roomModel.roomname = roomName;
        roomModel.gameLocation = gameLocation;
        roomModel.players.push(roomAdmin);

        // saving the room model
        roomModel.save(function(err) {
            if (err) {
                console.log(err);
            } 
        });
        //console.log("createRoomAndDispatchRequests:" + request.body)npm

        var players = request.body.players;
        var res = players.split(",");
        var playerJson = {};
        res.forEach(function(element, index) {
            if(index == 0) playerJson["player_one"] = element;
            if(index == 1) playerJson["player_two"] = element;
            if(index == 2) playerJson["player_three"] = element;
            if(index == 3) playerJson["player_four"] = element;
            if(index == 4) playerJson["player_five"] = element;
        });

        console.log(playerJson)
        // check if the the players for whom the request has to be sent are online
        // promises
        var validatePlayerOne = function(username) {
            var defer = Q.defer();
            OnlinePlayerModel.findOne({ username: username }, defer.makeNodeResolver());
            return defer.promise;
        }

        var validatePlayerTwo = function(username) {
            var defer = Q.defer();
            OnlinePlayerModel.findOne({ username: username }, defer.makeNodeResolver());
            return defer.promise;
        }

        var validatePlayerThree = function(username) {
            var defer = Q.defer();
            OnlinePlayerModel.findOne({ username: username }, defer.makeNodeResolver());
            return defer.promise;
        }

        var validatePlayerFour = function(username) {
            var defer = Q.defer();
            OnlinePlayerModel.findOne({ username: username }, defer.makeNodeResolver());
            return defer.promise;
        }

        var validatePlayerFive = function(username) {
            var defer = Q.defer();
            OnlinePlayerModel.findOne({ username: username }, defer.makeNodeResolver());
            return defer.promise;
        }

        // promise chain
        validatePlayerOne(playerJson['player_one'])
        .then(function(playerOne){
            // send request to player 1
            console.log("send to player 1")
            playerOne != null ? SocketController.sendinvitation(playerOne.socketId, gameLocation, roomName) : "";
            return validatePlayerTwo(playerJson['player_two']);
        }, function(err){
            console.log(err);
        })
        .then(function(playerTwo){
            // send request to player 2
            playerTwo != null ? SocketController.sendinvitation(playerTwo.socketId, gameLocation, roomName) : "";
            return validatePlayerThree(playerJson['player_three']);
        }, function(error){
            console.log(error);
        })  
        .then(function(playerThree){
            // send request to player 3
            playerThree != null ? SocketController.sendinvitation(playerThree.socketId, gameLocation, roomName) : "";
            return validatePlayerFour(playerJson['player_four']);
        }, function(error){
            console.log(error);
        })
        .then(function(playerFour){
            // send request to player 4
            playerFour != null ? SocketController.sendinvitation(playerFour.socketId, gameLocation, roomName) : "";
            return validatePlayerFive(playerJson['player_five']);
        }, function(error){
            console.log(error);
        })
        .then(function(playerFive){
            // send request to player 5
            playerFive != null ? SocketController.sendinvitation(playerFive.socketId, gameLocation, roomName) : "";
        }, function(error){
            console.log(error);
        });
    }
}

// function to create a new room based on the username
exports.createRoom = function(request, response) {
   console.log("create room coming")
    var adminPlayerUserName = request.body.admin;

    var roomName = ''; 

    console.log(request.body)
    // checking if the players are sent via POST body
    // return an error message if the admin is null
    if (adminPlayerUserName == null) {
        response.send({ status : "cannot create room", message : "A valid admin username is required to create a room" });
        //return callback("Failed to create room");
    } else {
        UserModel.findOne({ username: adminPlayerUserName }, function(error, user) {
        if (error || user == null) {
            response.send({ status : "cannot create room", message : "A valid admin username is required to create a room" });
            //return callback("Failed to create room");
        } else {
            roomName = adminPlayerUserName;


            // call gameserver to get the IP and free PORT number. Hardcoding for now
            // hardcoding game location for now
            var gameLocation = "";
            var roomRequestAPIOptions = {
//                host: '54.153.0.236',
                host:ip.address(),
                port: '8087',
                path: '/api/0.1/room/create',
                method: 'GET'
            };
            http.request(roomRequestAPIOptions, function(gameServerResponse) {
                gameServerResponse.setEncoding('utf8');
                gameServerResponse.on('data', function(data) {
                    gameLocation = JSON.parse(data)['portnumber'];
                    gameLocation = "http://" + ip.address() + ":" + gameLocation;

                    // store in mongoDB
                    storePlayerMeta(roomName, gameLocation, adminPlayerUserName, request, response);
                });
            }).end();
        }
        });
    }

};

// function to join a room based on the roomname
exports.joinRoom = function(request, response) {
    var theroomname = request.body.roomname;
    var username = request.body.username;

    RoomSchema.findOne({roomname: theroomname}, function (err, room) {
        // db error
        if (err) return Utils.db_error(response, err);
        // if room not found
        if (!room) return Utils.send(response, "error", "Room does not exist");

        var playersArray = room.players;
        // find out whether the user is already in the room
        if(playersArray.indexOf(username.toString()) != -1) {
            return Utils.send(response, "error", "The user is already in the room");
        // If the room is full, the user can't join the room
        } else if (room.players.length >= 6) {
            return Utils.send(response, "error", "Room is full");
        } else {
            // // Using socket to notify all the people in the room that someone join the room
            playersArray.forEach(function (element) {
                OnlinePlayerModel.findOne({username: element}, function (err, player) {
                    // db error
                    if (err) return Utils.db_error(res, err);
                    SocketController.sendMessage(player.socketId, username + " joined the room");
                })
            });

            // Add this user into the room player list
            room.update({$addToSet: {players: username}},  function (err) {
                // db error
                if (err) return Utils.db_error(res, err);
                Utils.send(response, "success", "You joined the room" );

            });
        }

    });
};

// function to exit a room -> can be either an admin or non-admin user
exports.exitRoom = function(request, response) {
    var theroomname = request.body.roomname;
    var username = request.body.username;

    RoomSchema.findOne({roomname: theroomname}, function (err, room) {
        // db error
        if (err) return Utils.db_error(response, err);
        // if room not found
        if (!room) return Utils.send(response, "error", "Room does not exist");

        var playersArray = room.players;
        // find out whether the user is already in the room
        if(playersArray.indexOf(username.toString()) == -1) {
            return Utils.send(response, "error", "The user is not in the room");
        } else {
            // delete this user into the room player list
            room.update({$pull: {players: username}},  function (err) {
                // db error
                if (err) return Utils.db_error(res, err);
                Utils.send(response, "success", "You left the room" );

            });

            playersArray = room.players;
            // // Using socket to notify all the people in the room that someone leave the room
            playersArray.forEach(function (element) {
                OnlinePlayerModel.findOne({username: element}, function (err, player) {
                    // db error
                    if (err) return Utils.db_error(res, err);
                    SocketController.sendMessage(player.socketId, username + " left the room");
                })
            });
        }

    });
};

// function to delete an entire room -> can be done only by the admin of the room
exports.deleteRoom = function(request, response) {

    console.log("delete room coming")

    var theroomname = request.body.roomname;
    var username = request.body.username;


    console.log(theroomname)
    console.log(username)

    RoomSchema.findOne({roomname: theroomname}, function (err, room) {
        // db error
        if (err) return Utils.db_error(response, err);
        // if room not found
        if (!room) return Utils.send(response, "error", "Room does not exist");

        var playersArray = room.players;
        // If the user is the first people in the list, then he is the admin.
        if(playersArray.indexOf(username.toString()) != 0) {
            // Only admin can delete the room.
            return Utils.send(response, "error", "The user is not the admin of the room");
        } else {
            // // Using socket to notify all the people in the room that the admin deleted the room
            playersArray.forEach(function (element) {
                OnlinePlayerModel.findOne({username: element}, function (err, player) {
                    // db error
                    if (err) return Utils.db_error(res, err);
                    //SocketController.sendMessage(player.socketId, username + " deleted the room");
                })
            });

            // Add this user into the room player list
            room.remove();
            Utils.send(response, "success", "You  deleted the room" );
        }
    });
};