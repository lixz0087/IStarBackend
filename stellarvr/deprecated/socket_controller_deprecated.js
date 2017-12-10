var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
const TCP_SOCKET_PORT = 9090;
var OnlinePlayerModel = require('../models/online_player_model');
var Utils = require('../utils/utility');

exports.startSocketServer = function() {
    // Socket server at port 9090
    server.listen(TCP_SOCKET_PORT);
    console.log('Socket server at ' + TCP_SOCKET_PORT);

    // listening for clients, frontend expected to connect to port 9090 via socket after login
    io.on('connection', function(client) {
        console.log("Client connected on socket id = " + client.id);
        client.emit("NinjaSocketChannel", "{'status' : 'true', 'message': 'conected successfully'}");
        console.log()
        client.on('NinjaSocketChannel', function(username) {
            // saving the sent username and id inside mongo
            // first check if the client is already present, if yes it means its a reconnection
            // update client id in that case
            OnlinePlayerModel.findOneAndUpdate({ username: username }, { $set: { socketId: client.id} }, {new : true}, function(error, updatedRecord) {
                if (error) {
                    client.emit("NinjaSocketChannel", "{'status' : 'false', 'message': 'something went wrong with DB transaction'}");
                } else if (updatedRecord === null) {
                    // player is not present
                    var onlinePlayer = new OnlinePlayerModel();

                    onlinePlayer.username = username;
                    onlinePlayer.socketId = client.id;

                    onlinePlayer.save(function(error) {
                        if (error) {
                            client.emit("NinjaSocketChannel", "{'status' : 'false', 'message': 'something went wrong with DB transaction'}");
                        } else {
                            client.emit("NinjaSocketChannel", "{'status' : 'true', 'message': 'saved in DB'}");
                        }
                    });
                } else {
                  client.emit("NinjaSocketChannel", "{'status' : 'true', 'message': 'updated successfully'}");
                }
            });
            console.log(username);
        });

        client.on('disconnect', function() {
            // remove player from Mongo when disconnected

            OnlinePlayerModel.findOneAndRemove({ socketId: client.id }, function(error) {
                // nothing to send here, hoping all go's well!!
                if (error) {
                    console.log(error);
                }
            });
        });
   });
}

exports.sendinvitation = function(clientId, gameLocation, roomName) {
    io.to(clientId).emit("NinjaSocketChannel", "{'status':'true', 'invitation': 'true', 'message': 'your invited to join the game', 'game_location' : '" + gameLocation + "', 'room_name' : '"+ roomName +"'}");
}

exports.sendMessage = function (clientId, msg) {
    io.to(clientId).emit("NinjaSocketChannel", msg);
};
