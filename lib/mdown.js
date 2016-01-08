var _ = require('underscore');
var util = require('util');
var events = require('events');
var Client = require('./client.js');
var Stats = require('./stats.js');

function MeteorDown() {
  this.action = Function.prototype;
  this.stats = new Stats();
  this.clients = {};
}

MeteorDown.prototype.init = function(action) {
  this.action = action;
}

MeteorDown.prototype.run = function(options) {
  options = _.extend(this._defaultOptions(), options);
  for(var i=0; i<options.concurrency; ++i) {
    this._dispatch(options);
  }
};

MeteorDown.prototype.kill = function() {

};

MeteorDown.prototype._defaultOptions = function () {
  return {
    concurrency: 10,
    url: 'http://localhost:3000'
  };
}

MeteorDown.prototype._dispatch = function(options) {
  var self = this;
  var client = new Client(options);

  client.on('disconnected', function () {
    removeClient(client.id)
    self._dispatch(options);
  });

  client.on('socket-error', function(error) {
    removeClient(client.id)
    self._dispatch(options);
  });

  client.on('stats', function(type, name, value) {
    self.stats.track(type, name, value);
  });

  client.init(function (error) {
    if(error) throw error;
    self.action(client);
  });

  addClient(client)
  console.log('client list', this.clients)

  function addClient(client) {
    if (options.runId) {
      if (!this.clients[options.runId]) this.clients[options.runId] = []
      this.clients[options.runId].push(client)
    }
  }

  function removeClient(id) {
    if (options.runId) {
      var clientList = this.clients[options.runId]
      this.clients[options.runId] = clientList.filter(client => client.id !== id)
    }
  }
};

module.exports = MeteorDown;
