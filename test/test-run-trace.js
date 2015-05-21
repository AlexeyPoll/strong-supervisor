var debug = require('./debug');
var helper = require('./helper');
var http = require('http');
var run = helper.runWithControlChannel;
var tap = require('tap');

tap.test('traces are forwarded via parentCtl', function(t) {
  t.plan(2);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control', '--trace'],
    function(data) {
      debug('received: cmd %s: %j', data.cmd, data);
      switch (data.cmd) {
        case 'trace:object':
          t.ok(!!data.record.version, 'Record version should exist');
          t.ok(!!data.record.packet.metadata, 'Record data should exist');
          app.kill();
          break;
      }
    }
  );
  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});

tap.test('traces can be turned on', function(t) {
  t.plan(6);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control'], messageHandler);
  var tracingEnabled = false;

  function messageHandler(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'status:wd':
        if (data.id === 0) {
          t.assert(!data.isTracing);
        } else {
          t.equal(data.isTracing, tracingEnabled);
          if (!tracingEnabled) {
            tracingEnabled = true;
            app.control.request({cmd: 'tracing', enabled: true}, function(res){
              t.assert(!res.error);
            });
          } else {
            app.kill();
          }
        }
        break;
      case 'trace:object':
        t.assert(tracingEnabled);
        t.ok(!!data.record.version, 'Record version should exist');
        t.ok(!!data.record.packet.metadata, 'Record data should exist');
        break;
    }
  }

  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});

tap.test('traces can be turned off', function(t) {
  t.plan(6);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control', '--trace'], messageHandler);
  var tracingEnabled = true;

  function messageHandler(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'status:wd':
        if (data.id === 0) {
          t.assert(!data.isTracing);
        } else {
          t.equal(data.isTracing, tracingEnabled);
          if (tracingEnabled) {
            tracingEnabled = false;
            app.control.request({cmd: 'tracing', enabled: false}, function(res){
              t.assert(!res.error);
            });
          } else {
            app.kill();
          }
        }
        break;
      case 'trace:object':
        t.assert(tracingEnabled);
        t.ok(!!data.record.version, 'Record version should exist');
        t.ok(!!data.record.packet.metadata, 'Record data should exist');
        break;
    }
  }

  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});


