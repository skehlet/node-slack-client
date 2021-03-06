var Channel, Message,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Message = require('./message');

Channel = (function() {
  function Channel(_client, data) {
    var k;
    this._client = _client;
    if (data == null) {
      data = {};
    }
    this._onInvite = __bind(this._onInvite, this);
    this._onRename = __bind(this._onRename, this);
    this._onSetPurpose = __bind(this._onSetPurpose, this);
    this._onSetTopic = __bind(this._onSetTopic, this);
    this._onLeave = __bind(this._onLeave, this);
    this._onMark = __bind(this._onMark, this);
    this._onFetchHistory = __bind(this._onFetchHistory, this);
    this._onPostMessage = __bind(this._onPostMessage, this);
    this._typingTimeout = __bind(this._typingTimeout, this);
    this._typing = {};
    this._history = {};
    for (k in data || {}) {
      this[k] = data[k];
    }
  }

  Channel.prototype.getType = function() {
    return this.constructor.name;
  };

  Channel.prototype.addMessage = function(message) {
    var index;
    switch (message.subtype) {
      case void 0:
      case "channel_archive":
      case "channel_unarchive":
      case "group_archive":
      case "group_unarchive":
        this._history[message.ts] = message;
        break;
      case "message_changed":
        this._history[message.message.ts] = message.message;
        break;
      case "message_deleted":
        delete this._history[message.deleted_ts];
        break;
      case "channel_topic":
      case "group_topic":
        this.topic.value = message.topic;
        this.topic.creator = message.user;
        this.topic.last_set = message.ts;
        this._history[message.ts] = message;
        break;
      case "channel_purpose":
      case "group_purpose":
        this.purpose.value = message.purpose;
        this.purpose.creator = message.user;
        this.purpose.last_set = message.ts;
        this._history[message.ts] = message;
        break;
      case "channel_name":
      case "group_name":
        this.name = message.name;
        this._history[message.ts] = message;
        break;
      case "bot_message":
        this._history[message.ts] = message;
        break;
      case "channel_join":
      case "group_join":
        this.members.push(message.user);
        this._history[message.ts] = message;
        break;
      case "channel_leave":
      case "group_leave":
        index = this.members.indexOf(message.user);
        if (index !== -1) {
          this.members.splice(index);
        }
        this._history[message.ts] = message;
        break;
      default:
        this._client.logger.debug("Unknown message subtype: %s", message.subtype);
        this._history[message.ts] = message;
    }
    if (message.ts && !message.hidden && (this.latest != null) && (this.latest.ts != null) && message.ts > this.latest.ts) {
      this.unread_count++;
      this.latest = message;
    }
    if (this._client.autoMark) {
      return this.mark(message.ts);
    }
  };

  Channel.prototype.getHistory = function() {
    return this._history;
  };

  Channel.prototype.startedTyping = function(user_id) {
    if (this._typing[user_id]) {
      clearTimeout(this._typing[user_id]);
    }
    return this._typing[user_id] = setTimeout(this._typingTimeout, 5000, user_id);
  };

  Channel.prototype._typingTimeout = function(user_id) {
    return delete this._typing[user_id];
  };

  Channel.prototype.getTyping = function() {
    var k, _results;
    _results = [];
    for (k in this._typing) {
      _results.push(k);
    }
    return _results;
  };

  Channel.prototype.send = function(text) {
    var m;
    m = new Message(this._client, {
      text: text
    });
    return this.sendMessage(m);
  };

  Channel.prototype.postMessage = function(data) {
    var params;
    params = data;
    params.channel = this.id;
    if (data.attachments) {
      params.attachments = JSON.stringify(data.attachments);
    }
    this._client.logger.debug(data);
    this._client.logger.debug(params);
    return this._client._apiCall("chat.postMessage", params, this._onPostMessage);
  };

  Channel.prototype._onPostMessage = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype.sendMessage = function(message) {
    message.channel = this.id;
    return this._client._send(message);
  };

  Channel.prototype.fetchHistory = function(latest, oldest) {
    var method, params;
    params = {
      "channel": this.id
    };
    if (latest != null) {
      params.latest = latest;
    }
    if (oldest != null) {
      params.oldest = oldest;
    }
    method = 'channels.history';
    if (this.getType() === 'Group') {
      method = 'groups.history';
    }
    if (this.getType() === 'DM') {
      method = 'im.history';
    }
    return this._client._apiCall(method, params, this._onFetchHistory);
  };

  Channel.prototype._onFetchHistory = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype.mark = function(ts) {
    var method, params;
    params = {
      "channel": this.id,
      "ts": ts
    };
    method = 'channels.mark';
    if (this.getType() === 'Group') {
      method = 'groups.mark';
    }
    if (this.getType() === 'DM') {
      method = 'im.mark';
    }
    return this._client._apiCall(method, params, this._onMark);
  };

  Channel.prototype._onMark = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype.leave = function() {
    var method, params;
    if (this.getType() === 'DM') {
      return null;
    }
    params = {
      "channel": this.id
    };
    method = 'channels.leave';
    if (this.getType() === 'Group') {
      method = 'groups.leave';
    }
    return this._client._apiCall(method, params, this._onLeave);
  };

  Channel.prototype._onLeave = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype.setTopic = function(topic) {
    var method, params;
    if (this.getType() === 'DM') {
      return null;
    }
    params = {
      "channel": this.id,
      "topic": topic
    };
    method = 'channels.setTopic';
    if (this.getType() === 'Group') {
      method = 'groups.setTopic';
    }
    return this._client._apiCall(method, params, this._onSetTopic);
  };

  Channel.prototype._onSetTopic = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype.setPurpose = function(purpose) {
    var method, params;
    if (this.getType() === 'DM') {
      return null;
    }
    params = {
      "channel": this.id,
      "purpose": purpose
    };
    method = 'channels.setPurpose';
    if (this.getType() === 'Group') {
      method = 'groups.setPurpose';
    }
    return this._client._apiCall(method, params, this._onSetPurpose);
  };

  Channel.prototype._onSetPurpose = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype.rename = function(name) {
    var method, params;
    if (this.getType() === 'DM') {
      return null;
    }
    params = {
      "channel": this.id,
      "name": name
    };
    method = 'channels.rename';
    if (this.getType() === 'Group') {
      method = 'groups.rename';
    }
    return this._client._apiCall(method, params, this._onRename);
  };

  Channel.prototype._onRename = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype.invite = function(user_id) {
    var method, params;
    if (this.getType() === 'DM') {
      return null;
    }
    params = {
      "channel": this.id,
      "user": user_id
    };
    method = 'channels.invite';
    if (this.getType() === 'Group') {
      method = 'groups.invite';
    }
    return this._client._apiCall(method, params, this._onInvite);
  };

  Channel.prototype._onInvite = function(data) {
    return this._client.logger.debug(data);
  };

  Channel.prototype._recalcUnreads = function() {
    var ts, unreads;
    unreads = 0;
    for (ts in this.history) {
      if (ts > this.last_read) {
        unreads++;
      }
    }
    return this.unread_count = unreads;
  };

  return Channel;

})();

module.exports = Channel;
