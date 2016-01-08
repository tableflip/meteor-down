var _ = require('underscore');
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

  function addClient(client) {
    if (options.runId) {
      if (!self.clients[options.runId]) self.clients[options.runId] = []
      self.clients[options.runId].push(client)
    }
  }

  function removeClient(id) {
    if (options.runId) {
      var clientList = self.clients[options.runId]
      self.clients[options.runId] = clientList.reduce(function (newClientList, client) {
        if (client.id !== id) newClientList.push(client)
        return newClientList
      }, [])
    }
  }
};

module.exports = MeteorDown;
