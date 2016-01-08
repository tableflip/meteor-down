var _ = require('underscore');
var Client = require('./client.js');
var Stats = require('./stats.js');

function MeteorDown() {
  this.actions = {};
  this.stats = new Stats();
  this.clients = {};
}

MeteorDown.prototype.init = function(runId, action) {
  this.actions[runId] = action;
}

MeteorDown.prototype.run = function(options) {
  options = _.extend(this._defaultOptions(), options);
  for(var i=0; i<options.concurrency; ++i) {
    this._dispatch(options);
  }
};

MeteorDown.prototype.kill = function(runId, cb) {
  cb = cb || function () {};
  var clients = this.clients[runId];
  if (!clients) return cb();

  clients.forEach(function (client) {
    client.kill(true);
  })
  this.clients[runId] = []
  cb();
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
    self._removeClient(options.runId, client.id)
    self._dispatch(options);
  });

  client.on('socket-error', function(error) {
    self._removeClient(options.runId, client.id)
    self._dispatch(options);
  });

  client.on('stats', function(type, name, value) {
    self.stats.track(type, name, value);
  });

  client.init(function (error) {
    if(error) throw error;
    self.actions[options.runId](client);
  });

  self._addClient(options.runId, client)
};


MeteorDown.prototype._addClient = function(runId, client) {
  if (!this.clients[runId]) this.clients[runId] = [];
  this.clients[runId].push(client);
}

MeteorDown.prototype._removeClient = function(runId, clientId) {
  var clientList = this.clients[runId];
  this.clients[runId] = clientList.reduce(function (newClientList, client) {
    if (client.id !== clientId) newClientList.push(client);
    return newClientList;
  }, []);
};


module.exports = MeteorDown;
